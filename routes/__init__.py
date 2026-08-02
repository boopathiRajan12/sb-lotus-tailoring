"""
Routes package.
Each module handles a different section of the application.
"""
from .auth import auth_bp
from .admin import admin_bp
from .shop import shop_bp
from .cart import cart_bp
from .wishlist import wishlist_bp
from .review import review_bp

