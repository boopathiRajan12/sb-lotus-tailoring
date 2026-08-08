"""
Order, OrderItem, and OrderStatusHistory models.

Order   = the overall order placed by a user.
OrderItem = each product line in the order.
OrderStatusHistory = an append-only audit trail of status changes, which the
customer sees as a delivery timeline.
"""
import json
from .database import db, utcnow

# The happy-path lifecycle, in order. `cancelled` sits outside it.
ORDER_FLOW = ('pending', 'confirmed', 'stitching', 'ready', 'delivered')
ORDER_STATUSES = ORDER_FLOW + ('cancelled',)
# A customer may withdraw an order only before work has started.
CUSTOMER_CANCELLABLE = ('pending', 'confirmed')


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
    # Free-text note captured when an order is cancelled
    cancel_reason = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    # Relationships
    items = db.relationship('OrderItem', backref='order', lazy=True, cascade='all, delete-orphan')
    history = db.relationship(
        'OrderStatusHistory', backref='order', lazy=True,
        cascade='all, delete-orphan', order_by='OrderStatusHistory.created_at'
    )

    @property
    def item_count(self):
        return sum(item.quantity for item in self.items)

    @property
    def can_cancel(self):
        return self.status in CUSTOMER_CANCELLABLE

    def set_status(self, new_status, note=None):
        """Move the order to `new_status` and append a history entry."""
        self.status = new_status
        self.history.append(OrderStatusHistory(status=new_status, note=note))

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
            'cancel_reason': self.cancel_reason,
            'can_cancel': self.can_cancel,
            'item_count': self.item_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'items': [item.to_dict() for item in self.items],
            'history': [h.to_dict() for h in self.history],
        }
        if include_user and self.user:
            data['user'] = {
                'id': self.user.id,
                'username': self.user.username,
                'email': self.user.email,
            }
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
            'product_image': self.product.images[0].to_dict()['url'] if self.product and self.product.images else None,
            'quantity': self.quantity,
            'price': self.price,
            'subtotal': self.price * self.quantity,
            'measurements': parsed_measurements,
        }


class OrderStatusHistory(db.Model):
    __tablename__ = 'order_status_history'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    status = db.Column(db.String(30), nullable=False)
    note = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    def __repr__(self):
        return f'<OrderStatusHistory order={self.order_id} status={self.status}>'

    def to_dict(self):
        return {
            'id': self.id,
            'status': self.status,
            'note': self.note,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
