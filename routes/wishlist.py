"""
Wishlist API - lets a signed-in customer save products for later and move
them into the cart in one step.
"""
from flask import Blueprint, jsonify
from flask_login import login_required, current_user
from sqlalchemy.orm import joinedload

from models import db, Product, WishlistItem, CartItem
from .helpers import payload, get_int, error

wishlist_bp = Blueprint('wishlist', __name__, url_prefix='/api/wishlist')


@wishlist_bp.route('')
@login_required
def view_wishlist():
    """Everything the current user has saved."""
    items = (WishlistItem.query
             .options(joinedload(WishlistItem.product).joinedload(Product.images))
             .filter_by(user_id=current_user.id)
             .order_by(WishlistItem.added_at.desc())
             .all())
    return jsonify({
        'items': [item.to_dict() for item in items],
        'product_ids': [item.product_id for item in items],
        'count': len(items),
    })


@wishlist_bp.route('/ids')
@login_required
def wishlist_ids():
    """Just the saved product ids - used to light up hearts in listings."""
    rows = db.session.query(WishlistItem.product_id).filter_by(user_id=current_user.id).all()
    return jsonify({'product_ids': [row[0] for row in rows]})


@wishlist_bp.route('/toggle', methods=['POST'])
@login_required
def toggle():
    """Add the product to the wishlist, or remove it if already saved."""
    product_id = get_int(payload(), 'product_id')
    if product_id is None:
        return error('A product is required.')

    product = db.session.get(Product, product_id)
    if product is None:
        return error('That product does not exist.', 404)

    existing = WishlistItem.query.filter_by(user_id=current_user.id, product_id=product_id).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
        return jsonify({
            'message': f'"{product.name}" removed from your wishlist.',
            'saved': False,
            'count': WishlistItem.query.filter_by(user_id=current_user.id).count(),
        })

    db.session.add(WishlistItem(user_id=current_user.id, product_id=product_id))
    db.session.commit()
    return jsonify({
        'message': f'"{product.name}" saved to your wishlist.',
        'saved': True,
        'count': WishlistItem.query.filter_by(user_id=current_user.id).count(),
    }), 201


@wishlist_bp.route('/<int:product_id>', methods=['DELETE'])
@login_required
def remove(product_id):
    """Remove one product from the wishlist."""
    item = WishlistItem.query.filter_by(user_id=current_user.id, product_id=product_id).first()
    if item is None:
        return error('That item is not in your wishlist.', 404)

    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Removed from wishlist.'})


@wishlist_bp.route('/<int:product_id>/move-to-cart', methods=['POST'])
@login_required
def move_to_cart(product_id):
    """Move a saved product into the cart."""
    item = WishlistItem.query.filter_by(user_id=current_user.id, product_id=product_id).first()
    if item is None:
        return error('That item is not in your wishlist.', 404)

    product = item.product
    if product is None or not product.is_active:
        return error('That product is no longer available.')
    if not product.is_made_to_order and product.stock < 1:
        return error(f'"{product.name}" is out of stock.')

    cart_item = CartItem.query.filter_by(user_id=current_user.id, product_id=product_id).first()
    if cart_item:
        cart_item.quantity += 1
    else:
        db.session.add(CartItem(user_id=current_user.id, product_id=product_id, quantity=1))

    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': f'"{product.name}" moved to your cart.'})
