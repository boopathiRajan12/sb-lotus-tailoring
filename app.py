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
import os
from io import BytesIO

from flask import Flask, send_file, send_from_directory, jsonify, abort, request
from flask_login import LoginManager

from config import Config
from models import db, User

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


def create_app():
    """Application factory - creates and configures the Flask app."""
    app = Flask(__name__)
    app.config.from_object(Config)

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
                mimetype=img.image_mimetype or 'image/jpeg'
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
    with app.app_context():
        db.create_all()
        _migrate_db()
        _create_default_admin()

    return app


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


def _migrate_db():
    """Add columns introduced after the initial release to existing tables."""
    from sqlalchemy import text, inspect

    inspector = inspect(db.engine)
    dialect = db.engine.dialect.name
    blob_type = {'sqlite': 'BLOB', 'postgresql': 'BYTEA'}.get(dialect, 'LONGBLOB')
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
                print(f'Migration: added {table}.{name}')


def _create_default_admin():
    """Create a default admin account if none exists."""
    admin = User.query.filter_by(is_admin=True).first()
    if not admin:
        password = os.environ.get('ADMIN_PASSWORD', 'admin123')
        admin = User(
            username='admin',
            email='admin@sblotus.com',
            is_admin=True
        )
        admin.set_password(password)
        db.session.add(admin)
        db.session.commit()
        print(f'Default admin created: username=admin, password={password}')


# ─── Run the app ─────────────────────────────────────────────────────────────

if __name__ == '__main__':
    app = create_app()
    # Debug mode ON for development; set to False in production
    app.run(debug=True, host='0.0.0.0', port=5000)
