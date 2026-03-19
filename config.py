"""
Configuration settings for SB Lotus Tailoring Shop.
Update the MySQL credentials below to match your local setup.
"""
import os

class Config:
    # Secret key for session management and CSRF protection
    SECRET_KEY = os.environ.get('SECRET_KEY', 'sb-lotus-tailoring-secret-key-change-in-production')

    # MySQL Database connection
    # Format: mysql+pymysql://username:password@host:port/database_name
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        'mysql+pymysql://root:Root@localhost:3306/sb_lotus_tailoring'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # File upload settings
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'images', 'products')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max upload size
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
