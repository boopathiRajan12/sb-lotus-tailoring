"""
ProductImage model - supports multiple images per product.
Images are stored on disk (local dev) AND as binary in the database
so they persist on cloud platforms like Render where the filesystem is ephemeral.
"""
from sqlalchemy.orm import deferred

from .database import db, utcnow


class ProductImage(db.Model):
    __tablename__ = 'product_images'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    image_path = db.Column(db.String(300), nullable=False)
    is_primary = db.Column(db.Boolean, default=False)
    uploaded_at = db.Column(db.DateTime, default=utcnow)
    # Store image binary in DB for cloud deployments with ephemeral filesystems.
    #
    # Deferred: product listings eager-load `Product.images` to build thumbnail
    # URLs, and `to_dict()` only ever emits an id. Without this the bytes of
    # every image on the page are fetched, decoded and discarded - tens of MB
    # per request. It loads on first access, which is exactly what the
    # /product-image/<id> route does.
    image_data = deferred(db.Column(db.LargeBinary, nullable=True))
    image_mimetype = db.Column(db.String(50), nullable=True)

    def __repr__(self):
        return f'<ProductImage {self.image_path}>'

    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'is_primary': self.is_primary,
            'url': f'/product-image/{self.id}',
        }
