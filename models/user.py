"""
User model - handles both regular users and admin accounts.
Passwords are hashed using werkzeug security utilities.

Customers can save a default set of body measurements on their profile; the
custom-blouse form pre-fills from it so repeat orders don't need re-measuring.
"""
import json
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from .database import db

# Measurement keys shared by the profile, cart items, and order items.
MEASUREMENT_KEYS = ('bust', 'waist', 'shoulder', 'sleeve', 'blength', 'armhole')


class User(UserMixin, db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    phone = db.Column(db.String(15), nullable=True)
    address = db.Column(db.Text, nullable=True)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    # Admins can suspend an account without deleting its order history.
    is_active_account = db.Column(db.Boolean, default=True, nullable=False)
    # Saved default measurements, stored as a JSON object.
    measurements = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    cart_items = db.relationship('CartItem', backref='user', lazy=True, cascade='all, delete-orphan')
    orders = db.relationship('Order', backref='user', lazy=True)
    wishlist_items = db.relationship('WishlistItem', backref='user', lazy=True, cascade='all, delete-orphan')
    reviews = db.relationship('Review', backref='user', lazy=True, cascade='all, delete-orphan')

    def set_password(self, password):
        """Hash and store the password."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Verify password against stored hash."""
        return check_password_hash(self.password_hash, password)

    @property
    def saved_measurements(self):
        """Parsed measurement dict, or {} when nothing has been saved."""
        if not self.measurements:
            return {}
        try:
            parsed = json.loads(self.measurements)
            return parsed if isinstance(parsed, dict) else {}
        except (json.JSONDecodeError, TypeError):
            return {}

    @property
    def is_active(self):
        """Flask-Login checks this - suspended accounts cannot log in."""
        return bool(self.is_active_account)

    def __repr__(self):
        return f'<User {self.username}>'

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'phone': self.phone,
            'address': self.address,
            'is_admin': self.is_admin,
            'is_active_account': self.is_active_account,
            'measurements': self.saved_measurements,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'cart_count': sum(item.quantity for item in self.cart_items),
            'wishlist_count': len(self.wishlist_items),
        }
