"""
CartItem model - tracks items in a user's shopping cart.
Each row links a user to a product with a quantity.
"""
import json
from datetime import datetime
from .database import db


class CartItem(db.Model):
    __tablename__ = 'cart_items'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, default=1, nullable=False)
    # For custom blouse orders, store selected measurements
    measurements = db.Column(db.Text, nullable=True)
    added_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<CartItem user={self.user_id} product={self.product_id} qty={self.quantity}>'

    def to_dict(self):
        parsed_measurements = None
        if self.measurements:
            try:
                parsed_measurements = json.loads(self.measurements)
            except (json.JSONDecodeError, TypeError):
                parsed_measurements = None
        return {
            'id': self.id,
            'product_id': self.product_id,
            'product': self.product.to_dict() if self.product else None,
            'quantity': self.quantity,
            'measurements': parsed_measurements,
            'subtotal': self.product.price * self.quantity if self.product else 0,
            # Surfaced in the cart so a customer knows before checkout that a
            # line has become unavailable or exceeds what's in stock.
            'available': bool(self.product and self.product.is_active),
            'stock_shortfall': max(0, self.quantity - self.product.stock)
                if self.product and not self.product.is_made_to_order else 0,
        }
