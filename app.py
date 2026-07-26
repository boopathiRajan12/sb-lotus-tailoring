"""
SB LOTUS TAILORING SHOP - Main Application Entry Point.

This is the Flask application factory. It:
1. Creates the Flask app
2. Configures the database
3. Registers all blueprints (auth, admin, shop, cart)
4. Sets up Flask-Login for session management
5. Creates database tables and a default admin account

Run this file to start the development server.
"""
import os
from flask import Flask, send_file, send_from_directory, jsonify, abort
from flask_login import LoginManager
from config import Config
from models import db, User
from io import BytesIO

# Initialize Flask-Login
login_manager = LoginManager()

# The built React app (frontend/dist), if present
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend', 'dist')


def create_app():
    """Application factory - creates and configures the Flask app."""
    app = Flask(__name__)
    app.config.from_object(Config)

    # Ensure upload folder exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)

    # The frontend is a React SPA - there's no server-rendered login page to
    # redirect to, so unauthenticated access to a protected API returns JSON.
    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({'error': 'Please log in to access this resource.'}), 401

    # User loader for Flask-Login
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # Register blueprints
    from routes import auth_bp, admin_bp, shop_bp, cart_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(shop_bp)
    app.register_blueprint(cart_bp)

    # Route to serve images from DB when file doesn't exist on disk (Render fix)
    @app.route('/product-image/<int:image_id>')
    def serve_product_image(image_id):
        from models import ProductImage
        img = ProductImage.query.get_or_404(image_id)
        if img.image_data:
            return send_file(
                BytesIO(img.image_data),
                mimetype=img.image_mimetype or 'image/jpeg'
            )
        # If no DB data, try serving from disk
        filepath = os.path.join(app.static_folder, img.image_path)
        if os.path.exists(filepath):
            return send_file(filepath)
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


def _migrate_db():
    """Add new columns to existing tables if they don't exist yet."""
    from sqlalchemy import text, inspect
    inspector = inspect(db.engine)
    columns = [col['name'] for col in inspector.get_columns('product_images')]

    # Detect database type for correct SQL syntax
    db_url = str(db.engine.url)
    is_postgres = 'postgresql' in db_url or 'postgres' in db_url
    is_sqlite = 'sqlite' in db_url
    
    if is_sqlite:
        blob_type = 'BLOB'
    elif is_postgres:
        blob_type = 'BYTEA'
    else:
        blob_type = 'LONGBLOB'

    with db.engine.connect() as conn:
        if 'image_data' not in columns:
            conn.execute(text(f'ALTER TABLE product_images ADD COLUMN image_data {blob_type}'))
            conn.commit()
            print('Migration: added image_data column')
        if 'image_mimetype' not in columns:
            conn.execute(text("ALTER TABLE product_images ADD COLUMN image_mimetype VARCHAR(50)"))
            conn.commit()
            print('Migration: added image_mimetype column')


def _create_default_admin():
    """Create a default admin account if none exists."""
    admin = User.query.filter_by(is_admin=True).first()
    if not admin:
        admin = User(
            username='admin',
            email='admin@sblotus.com',
            is_admin=True
        )
        admin.set_password('admin123')
        db.session.add(admin)
        db.session.commit()
        print('Default admin created: username=admin, password=admin123')


# ─── Run the app ─────────────────────────────────────────────────────────────

if __name__ == '__main__':
    app = create_app()
    # Debug mode ON for development; set to False in production
    app.run(debug=True, host='0.0.0.0', port=5000)
