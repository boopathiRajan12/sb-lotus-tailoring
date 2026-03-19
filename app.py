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
from flask import Flask
from flask_login import LoginManager
from config import Config
from models import db, User

# Initialize Flask-Login
login_manager = LoginManager()


def create_app():
    """Application factory - creates and configures the Flask app."""
    app = Flask(__name__)
    app.config.from_object(Config)

    # Ensure upload folder exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Please log in to access this page.'
    login_manager.login_message_category = 'info'

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

    # Create tables and default admin on first run
    with app.app_context():
        db.create_all()
        _create_default_admin()

    return app


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
