"""
Product model - represents items available in the shop.
Each product belongs to a category and can have multiple images.

Rating totals are denormalised onto the row (`rating_count` / `rating_avg`) so
product listings can sort and display stars without an N+1 review query. Call
`refresh_rating()` whenever a review is written or removed.
"""
from .database import db, utcnow


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
    # Optional strike-through "was" price used to show a discount
    compare_at_price = db.Column(db.Float, nullable=True)
    # Manually curated highlight for the home page
    is_featured = db.Column(db.Boolean, default=False, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    # Denormalised review aggregates
    rating_count = db.Column(db.Integer, default=0, nullable=False)
    rating_avg = db.Column(db.Float, default=0.0, nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    # Relationships
    images = db.relationship('ProductImage', backref='product', lazy=True, cascade='all, delete-orphan')
    cart_items = db.relationship('CartItem', backref='product', lazy=True, cascade='all, delete-orphan')
    order_items = db.relationship('OrderItem', backref='product', lazy=True)
    wishlist_items = db.relationship('WishlistItem', backref='product', lazy=True, cascade='all, delete-orphan')
    reviews = db.relationship('Review', backref='product', lazy=True, cascade='all, delete-orphan')

    @property
    def primary_image(self):
        """Return the first image path or a default placeholder."""
        if self.images:
            return self.images[0].image_path
        return 'images/products/default.png'

    @property
    def primary_image_id(self):
        """Return the first image ID (for DB-served images on Render)."""
        if self.images:
            return self.images[0].id
        return None

    @property
    def discount_percent(self):
        """Percent saved versus compare_at_price, or 0 when not discounted."""
        if self.compare_at_price and self.compare_at_price > self.price:
            return round((self.compare_at_price - self.price) / self.compare_at_price * 100)
        return 0

    @property
    def is_made_to_order(self):
        """Stitching services carry no stock - they are always orderable."""
        return (self.stock or 0) <= 0

    def refresh_rating(self):
        """Recompute the denormalised rating aggregates from the reviews table."""
        from .review import Review
        rows = db.session.query(Review.rating).filter(Review.product_id == self.id).all()
        ratings = [r[0] for r in rows]
        self.rating_count = len(ratings)
        self.rating_avg = round(sum(ratings) / len(ratings), 2) if ratings else 0.0

    def __repr__(self):
        return f'<Product {self.name}>'

    def to_dict(self, include_images=True):
        data = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'price': self.price,
            'compare_at_price': self.compare_at_price,
            'discount_percent': self.discount_percent,
            'category_id': self.category_id,
            'category': self.category.to_dict() if self.category else None,
            'is_custom_blouse': self.is_custom_blouse,
            'is_featured': self.is_featured,
            'stock': self.stock,
            'is_made_to_order': self.is_made_to_order,
            'is_active': self.is_active,
            'rating_count': self.rating_count or 0,
            'rating_avg': self.rating_avg or 0.0,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        if include_images:
            data['images'] = [img.to_dict() for img in self.images]
        return data
