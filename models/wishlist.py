"""
WishlistItem model - products a user has saved for later.
One row per (user, product); the unique constraint keeps it idempotent.
"""
from .database import db, utcnow


class WishlistItem(db.Model):
    __tablename__ = 'wishlist_items'
    __table_args__ = (db.UniqueConstraint('user_id', 'product_id', name='uq_wishlist_user_product'),)

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    added_at = db.Column(db.DateTime, default=utcnow)

    def __repr__(self):
        return f'<WishlistItem user={self.user_id} product={self.product_id}>'

    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'product': self.product.to_dict() if self.product else None,
            'added_at': self.added_at.isoformat() if self.added_at else None,
        }
