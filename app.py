"""
SB LOTUS TAILORING SHOP - Main Application Entry Point.

This is the Flask application factory. It:
1. Creates the Flask app
2. Configures the database
3. Registers all blueprints (auth, admin, shop, cart, wishlist, reviews)
4. Sets up Flask-Login for session management
5. Creates database tables, applies lightweight column migrations, and
   provisions a default admin account

Run this file to start the development server.
"""
import hashlib
import logging
import os
import sys
from io import BytesIO

from flask import Flask, send_file, send_from_directory, jsonify, abort, request
from flask_login import LoginManager
from werkzeug.middleware.proxy_fix import ProxyFix

from config import Config
from models import db, User

log = logging.getLogger(__name__)

# Initialize Flask-Login
login_manager = LoginManager()

# The built React app (frontend/dist), if present
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend', 'dist')

# Columns added after the original schema shipped. `db.create_all()` only
# creates missing *tables*, so existing databases need these patched in.
# Format: table -> [(column_name, column_definition_sql)]. `{BLOB}` is
# substituted with the dialect's binary type.
_ADDED_COLUMNS = {
    'product_images': [
        ('image_data', '{BLOB}'),
        ('image_mimetype', 'VARCHAR(50)'),
    ],
    'users': [
        ('is_active_account', 'BOOLEAN NOT NULL DEFAULT 1'),
        ('measurements', 'TEXT'),
    ],
    'products': [
        ('compare_at_price', 'FLOAT'),
        ('is_featured', 'BOOLEAN NOT NULL DEFAULT 0'),
        ('rating_count', 'INTEGER NOT NULL DEFAULT 0'),
        ('rating_avg', 'FLOAT NOT NULL DEFAULT 0'),
    ],
    'orders': [
        ('cancel_reason', 'TEXT'),
    ],
}

# Indexes that can't be expressed as SQLAlchemy column flags. The registration
# code treats usernames and emails case-insensitively, but a plain UNIQUE
# constraint is case-*sensitive* - so without these, two concurrent signups for
# "Priya" and "priya" both pass the application check and both commit.
# Format: table -> [(index_name, create_sql)]. Mirrored in supabase/schema.sql.
_ADDED_INDEXES = {
    'users': [
        ('uq_users_email_lower',
         'CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower ON users (lower(email))'),
        ('uq_users_username_lower',
         'CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username_lower ON users (lower(username))'),
    ],
    'categories': [
        ('uq_categories_name_lower',
         'CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_name_lower ON categories (lower(name))'),
    ],
}

# Arbitrary but fixed key for the Postgres advisory lock that serialises
# startup schema work across gunicorn workers.
_BOOTSTRAP_LOCK_KEY = 4815162342


def create_app(config_object=Config):
    """Application factory - creates and configures the Flask app."""
    app = Flask(__name__)
    app.config.from_object(config_object)

    _configure_logging(app)

    # Render (and every other PaaS) terminates TLS at a proxy and forwards the
    # real client details in X-Forwarded-*. Without this, request.remote_addr is
    # the proxy's address - which would make the login throttle below useless -
    # and Flask believes every request arrived over plain HTTP.
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    # Ensure upload folder exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    login_manager.session_protection = 'strong'

    # The frontend is a React SPA - there's no server-rendered login page to
    # redirect to, so unauthenticated access to a protected API returns JSON.
    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({'error': 'Please log in to access this resource.'}), 401

    # User loader for Flask-Login
    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, int(user_id))

    # Register blueprints
    from routes import auth_bp, admin_bp, shop_bp, cart_bp, wishlist_bp, review_bp
    for blueprint in (auth_bp, admin_bp, shop_bp, cart_bp, wishlist_bp, review_bp):
        app.register_blueprint(blueprint)

    _register_error_handlers(app)
    _register_security_headers(app)

    @app.route('/api/health')
    def health():
        """Liveness + database probe for uptime monitors and platform checks."""
        from sqlalchemy import text
        try:
            db.session.execute(text('SELECT 1'))
            return jsonify({'status': 'ok', 'database': 'ok'})
        except Exception:
            log.exception('Health check failed to reach the database')
            return jsonify({'status': 'degraded', 'database': 'unreachable'}), 503

    # Serve product images from the DB when the file isn't on disk. Cloud hosts
    # like Render have an ephemeral filesystem, so the DB copy is the durable one.
    @app.route('/product-image/<int:image_id>')
    def serve_product_image(image_id):
        from models import ProductImage
        img = db.session.get(ProductImage, image_id)
        if img is None:
            abort(404)

        if img.image_data:
            # The bytes behind an image id never change, so cache hard and let
            # repeat requests short-circuit on the ETag.
            etag = hashlib.md5(img.image_data).hexdigest()
            if request.headers.get('If-None-Match') == etag:
                return '', 304
            response = send_file(
                BytesIO(img.image_data),
                # Clamped to a known-safe image type. Uploads now derive their
                # MIME from the file extension, but rows written before that
                # hold whatever Content-Type the uploader's browser sent.
                mimetype=_safe_image_mimetype(img.image_mimetype),
            )
            response.set_etag(etag)
            response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
            return response

        # If no DB data, try serving from disk
        filepath = os.path.join(app.static_folder, img.image_path)
        if os.path.exists(filepath):
            response = send_file(filepath)
            response.headers['Cache-Control'] = 'public, max-age=86400'
            return response
        abort(404)

    # Serve the built React app in production. In local dev, the frontend
    # isn't built (frontend/dist doesn't exist) - use `npm run dev` instead,
    # which proxies /api and /product-image to this Flask server.
    if os.path.isdir(FRONTEND_DIST):
        @app.route('/', defaults={'path': ''})
        @app.route('/<path:path>')
        def serve_react(path):
            full_path = os.path.join(FRONTEND_DIST, path)
            if path and os.path.isfile(full_path):
                return send_from_directory(FRONTEND_DIST, path)
            return send_from_directory(FRONTEND_DIST, 'index.html')

    # Create tables and default admin on first run
    if app.config.get('DB_AUTO_CREATE', True):
        with app.app_context():
            _bootstrap_db()

    return app


_SERVABLE_IMAGE_MIMETYPES = frozenset({
    'image/png', 'image/jpeg', 'image/gif', 'image/webp',
})


def _safe_image_mimetype(stored):
    """Only ever hand back an image type, whatever the column says."""
    return stored if stored in _SERVABLE_IMAGE_MIMETYPES else 'application/octet-stream'


def _configure_logging(app):
    """Send application logs to stdout, where the platform collects them.

    Gunicorn installs its own handlers on its own loggers, not on the root, so
    without this the app's log records are swallowed in production.
    """
    level = logging.DEBUG if app.config.get('DEBUG') else logging.INFO
    root = logging.getLogger()

    if not root.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter(
            '[%(asctime)s] %(levelname)-8s %(name)s: %(message)s'
        ))
        root.addHandler(handler)

    root.setLevel(level)
    app.logger.setLevel(level)


# Headers applied to every response. Deliberately conservative: the SPA is fully
# self-hosted (no CDN, no inline <script>), so a strict CSP costs nothing.
_SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': (
        "default-src 'self'; "
        "img-src 'self' data:; "
        # Vite extracts styles to a stylesheet, but React inline `style` props
        # still need 'unsafe-inline' for style-src specifically.
        "style-src 'self' 'unsafe-inline'; "
        "script-src 'self'; "
        "connect-src 'self'; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self'"
    ),
}


def _register_security_headers(app):
    """Attach baseline security headers (and HSTS in production) to responses."""
    @app.after_request
    def set_security_headers(response):
        for header, value in _SECURITY_HEADERS.items():
            response.headers.setdefault(header, value)

        # Only meaningful over HTTPS, and actively harmful on a plain-HTTP dev
        # server - a browser that caches it will refuse http://localhost later.
        if app.config.get('SESSION_COOKIE_SECURE'):
            response.headers.setdefault(
                'Strict-Transport-Security', 'max-age=31536000; includeSubDomains'
            )
        return response


def _register_error_handlers(app):
    """Answer API calls with JSON instead of Flask's HTML error pages."""
    def wants_json():
        return request.path.startswith('/api/')

    @app.errorhandler(404)
    def not_found(err):
        if wants_json():
            return jsonify({'error': 'Not found.'}), 404
        return err

    @app.errorhandler(413)
    def too_large(err):
        return jsonify({'error': 'Upload is too large (16 MB maximum per file).'}), 413

    @app.errorhandler(500)
    def server_error(err):
        db.session.rollback()
        if wants_json():
            return jsonify({'error': 'Something went wrong on our end.'}), 500
        return err

    @app.errorhandler(Exception)
    def unhandled_exception(err):
        """Log the traceback, then answer with a generic message.

        Flask re-raises HTTPExceptions to their own handlers, so this only sees
        genuine bugs. Without it they are logged but the transaction is left
        dirty, and the next request on that connection fails too.
        """
        from werkzeug.exceptions import HTTPException
        if isinstance(err, HTTPException):
            return err

        db.session.rollback()
        log.exception('Unhandled error on %s %s', request.method, request.path)
        if wants_json():
            return jsonify({'error': 'Something went wrong on our end.'}), 500
        raise err


def _bootstrap_db():
    """Create tables, patch in later columns, and ensure an admin exists.

    Gunicorn starts several workers at once and every one of them runs this, so
    on Postgres the whole thing is serialised behind a session-level advisory
    lock - concurrent `CREATE TABLE` / `ALTER TABLE` against Supabase otherwise
    deadlocks or errors out on a duplicate.
    """
    from sqlalchemy import text

    if db.engine.dialect.name != 'postgresql':
        db.create_all()
        _migrate_db()
        _create_default_admin()
        return

    # A dedicated connection, held open for the whole bootstrap: the lock is
    # session-scoped, so it has to outlive the individual commits below.
    # (Behind the 6543 transaction pooler sessions aren't sticky and this
    # degrades to a no-op - no worse than having no lock at all.)
    with db.engine.connect() as conn:
        conn.execute(text('SELECT pg_advisory_lock(:key)'), {'key': _BOOTSTRAP_LOCK_KEY})
        conn.commit()
        try:
            db.create_all()
            _migrate_db()
            _create_default_admin()
        finally:
            conn.execute(text('SELECT pg_advisory_unlock(:key)'), {'key': _BOOTSTRAP_LOCK_KEY})
            conn.commit()


def _migrate_db():
    """Add columns introduced after the initial release to existing tables."""
    from sqlalchemy import text, inspect

    inspector = inspect(db.engine)
    dialect = db.engine.dialect.name
    blob_type = {'sqlite': 'BLOB', 'mysql': 'LONGBLOB'}.get(dialect, 'BYTEA')
    existing_tables = set(inspector.get_table_names())

    with db.engine.connect() as conn:
        for table, columns in _ADDED_COLUMNS.items():
            if table not in existing_tables:
                continue
            present = {col['name'] for col in inspector.get_columns(table)}
            for name, definition in columns:
                if name in present:
                    continue
                ddl = definition.replace('{BLOB}', blob_type)
                if dialect == 'postgresql':
                    # Postgres requires real booleans in a DEFAULT clause.
                    ddl = ddl.replace('DEFAULT 1', 'DEFAULT TRUE').replace('DEFAULT 0', 'DEFAULT FALSE')
                conn.execute(text(f'ALTER TABLE {table} ADD COLUMN {name} {ddl}'))
                conn.commit()
                log.info('Migration: added %s.%s', table, name)

        for table, indexes in _ADDED_INDEXES.items():
            if table not in existing_tables:
                continue
            existing_indexes = {idx['name'] for idx in inspector.get_indexes(table)}
            for name, ddl in indexes:
                if name in existing_indexes:
                    continue
                try:
                    conn.execute(text(ddl))
                    conn.commit()
                    log.info('Migration: created index %s', name)
                except Exception:
                    # Almost always pre-existing rows that collide once case is
                    # ignored. Don't take the app down over it - the application
                    # -level check still holds - but make the operator aware.
                    conn.rollback()
                    log.warning(
                        'Could not create index %s - resolve duplicate rows in "%s" '
                        'that differ only by letter case, then restart.', name, table,
                    )


MIN_ADMIN_PASSWORD_LENGTH = 10


def _create_default_admin():
    """Create the initial admin account, but only from an explicit password.

    There is deliberately no fallback password. A hardcoded default would sit on
    a public URL protecting the entire admin panel, and the failure mode of
    forgetting to override it is silent. Refusing to create the account is loud
    and harmless by comparison.
    """
    if User.query.filter_by(is_admin=True).first():
        return

    password = os.environ.get('ADMIN_PASSWORD', '')
    if len(password) < MIN_ADMIN_PASSWORD_LENGTH:
        log.warning(
            'No admin account exists and ADMIN_PASSWORD is unset or shorter than '
            '%d characters, so none was created. Set ADMIN_PASSWORD and restart.',
            MIN_ADMIN_PASSWORD_LENGTH,
        )
        return

    admin = User(
        username=os.environ.get('ADMIN_USERNAME', 'admin'),
        email=os.environ.get('ADMIN_EMAIL', 'admin@sblotus.com'),
        is_admin=True,
    )
    admin.set_password(password)
    db.session.add(admin)
    db.session.commit()
    log.info('Admin account created: username=%s', admin.username)


# ─── Run the app ─────────────────────────────────────────────────────────────

if __name__ == '__main__':
    app = create_app()
    # Development server only - production runs under gunicorn via wsgi.py.
    # Debug mode exposes an interactive console, so it never follows the code
    # into a deployment: it is off whenever PRODUCTION/RENDER is set.
    app.run(
        debug=not app.config.get('PRODUCTION'),
        host=os.environ.get('HOST', '127.0.0.1'),
        port=int(os.environ.get('PORT', 5000)),
    )
