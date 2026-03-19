"""
Product model - represents items available in the shop.
Each product belongs to a category and can have multiple images.
"""
from datetime import datetime
from .database import db


class Product(db.Model):
    __tablename__ = 'products'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    price = db.Column(db.Float, nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=False)
    # Whether this is a custom blouse design that users can select
    is_custom_blouse = db.Column(db.Boolean, default=False)
    # Stock quantity (0 = made to order / stitching service)
    stock = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    images = db.relationship('ProductImage', backref='product', lazy=True, cascade='all, delete-orphan')
    cart_items = db.relationship('CartItem', backref='product', lazy=True, cascade='all, delete-orphan')
    order_items = db.relationship('OrderItem', backref='product', lazy=True)

    @property
    def primary_image(self):
        """Return the first image or a default placeholder."""
        if self.images:
            return self.images[0].image_path
        return 'images/products/default.png'

    def __repr__(self):
        return f'<Product {self.name}>'
