"""
Category model - organizes products into groups.
Examples: Blouse, School Uniform, Sudithar, Tops, Pants, Pavadai & Sattai,
          Sarees, Ready-made items, etc.
"""
from datetime import datetime
from .database import db


class Category(db.Model):
    __tablename__ = 'categories'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    # 'stitching' for current services, 'readymade' for future ready-made items
    category_type = db.Column(db.String(20), default='stitching', nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    products = db.relationship('Product', backref='category', lazy=True)

    def __repr__(self):
        return f'<Category {self.name}>'
