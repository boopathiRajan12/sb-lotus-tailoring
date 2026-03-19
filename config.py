"""
Configuration settings for SB Lotus Tailoring Shop.
Supports local MySQL and Render.com PostgreSQL deployment.
"""
import os

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

    SQLALCHEMY_DATABASE_URI = DATABASE_URL or 'mysql+pymysql://root:Root@localhost:3306/sb_lotus_tailoring'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # File upload settings
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'images', 'products')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max upload size
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
