"""
Configuration settings for SB Lotus Tailoring Shop.
Supports local MySQL and Render.com PostgreSQL deployment.
"""
import os
import socket

def is_mysql_available(host='localhost', port=3306):
    try:
        # Quick check if port is open
        with socket.create_connection((host, port), timeout=1.0):
            return True
    except OSError:
        return False

class Config:
    # Secret key for session management and CSRF protection
    SECRET_KEY = os.environ.get('SECRET_KEY', 'sb-lotus-tailoring-secret-key-change-in-production')

    # Database connection
    # Render.com sets DATABASE_URL automatically (PostgreSQL)
    # Local development uses MySQL
    DATABASE_URL = os.environ.get('DATABASE_URL', '')

    # Render uses "postgres://" but SQLAlchemy needs "postgresql://"
    if DATABASE_URL.startswith('postgres://'):
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

    if DATABASE_URL:
        SQLALCHEMY_DATABASE_URI = DATABASE_URL
    else:
        # Check if local MySQL is running, otherwise fallback to SQLite
        if is_mysql_available():
            SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:Root@localhost:3306/sb_lotus_tailoring'
        else:
            db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sb_lotus_tailoring.db')
            SQLALCHEMY_DATABASE_URI = f'sqlite:///{db_path}'

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # File upload settings
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'images', 'products')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max upload size
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
