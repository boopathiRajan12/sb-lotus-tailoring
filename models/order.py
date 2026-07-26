"""
Order and OrderItem models.
Order = the overall order placed by a user.
OrderItem = each product line in the order.
"""
import json
from datetime import datetime
from .database import db


class Order(db.Model):
    __tablename__ = 'orders'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(30), default='pending', nullable=False)
    # Delivery address for this order
    shipping_address = db.Column(db.Text, nullable=True)
    phone = db.Column(db.String(15), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    items = db.relationship('OrderItem', backref='order', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Order #{self.id} by User {self.user_id}>'

    def to_dict(self, include_user=False):
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'total_amount': self.total_amount,
            'status': self.status,
            'shipping_address': self.shipping_address,
            'phone': self.phone,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'items': [item.to_dict() for item in self.items],
        }
        if include_user and self.user:
            data['user'] = {'username': self.user.username, 'email': self.user.email}
        return data


class OrderItem(db.Model):
    __tablename__ = 'order_items'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Float, nullable=False)  # Price at time of order
    measurements = db.Column(db.Text, nullable=True)

    def __repr__(self):
        return f'<OrderItem order={self.order_id} product={self.product_id}>'

    def to_dict(self):
        parsed_measurements = None
        if self.measurements:
            try:
                parsed_measurements = json.loads(self.measurements)
            except (json.JSONDecodeError, TypeError):
                parsed_measurements = None
        return {
            'id': self.id,
            'order_id': self.order_id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else None,
            'quantity': self.quantity,
            'price': self.price,
            'measurements': parsed_measurements,
        }
