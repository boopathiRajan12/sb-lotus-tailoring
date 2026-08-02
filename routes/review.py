"""
Review API - customer ratings and written feedback on products.

A customer gets one review per product, editable afterwards. Reviews from
someone who actually ordered the item are flagged as verified purchases.
"""
from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user

from models import db, Product, Review, Order, OrderItem
from .helpers import payload, get_str, get_int, error

review_bp = Blueprint('review', __name__, url_prefix='/api/reviews')


def _has_purchased(user_id, product_id):
    """True when the user has a non-cancelled order containing the product."""
    return db.session.query(OrderItem.id).join(
        Order, Order.id == OrderItem.order_id
    ).filter(
        Order.user_id == user_id,
        OrderItem.product_id == product_id,
        Order.status != 'cancelled',
    ).first() is not None


@review_bp.route('/product/<int:product_id>')
def product_reviews(product_id):
    """Public list of reviews for one product, newest first."""
    page = max(1, request.args.get('page', 1, type=int) or 1)
    pagination = (Review.query.filter_by(product_id=product_id)
                  .order_by(Review.created_at.desc())
                  .paginate(page=page, per_page=10, error_out=False))

    mine = None
    if current_user.is_authenticated:
        existing = Review.query.filter_by(user_id=current_user.id, product_id=product_id).first()
        mine = existing.to_dict() if existing else None

    return jsonify({
        'reviews': [r.to_dict() for r in pagination.items],
        'my_review': mine,
        'can_review': bool(current_user.is_authenticated and not current_user.is_admin),
        'pagination': {
            'page': pagination.page,
            'pages': pagination.pages,
            'total': pagination.total,
            'has_next': pagination.has_next,
        },
    })


@review_bp.route('', methods=['POST'])
@login_required
def create_or_update_review():
    """Write a review, or update the one this user already left."""
    if current_user.is_admin:
        return error('Admin accounts cannot post reviews.', 403)

    data = payload()
    product_id = get_int(data, 'product_id')
    rating = get_int(data, 'rating')

    if product_id is None:
        return error('A product is required.')
    if rating is None or not 1 <= rating <= 5:
        return error('Please choose a rating between 1 and 5 stars.')

    product = db.session.get(Product, product_id)
    if product is None:
        return error('That product does not exist.', 404)

    title = get_str(data, 'title')[:150]
    comment = get_str(data, 'comment')[:2000]

    review = Review.query.filter_by(user_id=current_user.id, product_id=product_id).first()
    created = review is None
    if created:
        review = Review(user_id=current_user.id, product_id=product_id)
        db.session.add(review)

    review.rating = rating
    review.title = title or None
    review.comment = comment or None
    review.is_verified = _has_purchased(current_user.id, product_id)

    # flush so refresh_rating() sees this row when recomputing the average
    db.session.flush()
    product.refresh_rating()
    db.session.commit()

    return jsonify({
        'message': 'Thanks for your review!' if created else 'Your review has been updated.',
        'review': review.to_dict(),
        'rating_avg': product.rating_avg,
        'rating_count': product.rating_count,
    }), (201 if created else 200)


@review_bp.route('/<int:review_id>', methods=['DELETE'])
@login_required
def delete_review(review_id):
    """Delete a review. Customers can remove their own; admins can remove any."""
    review = db.session.get(Review, review_id)
    if review is None:
        return error('Review not found.', 404)
    if review.user_id != current_user.id and not current_user.is_admin:
        return error('Access denied.', 403)

    product = review.product
    db.session.delete(review)
    db.session.flush()
    if product:
        product.refresh_rating()
    db.session.commit()
    return jsonify({'message': 'Review deleted.'})


@review_bp.route('/mine')
@login_required
def my_reviews():
    """Every review the current user has written."""
    reviews = (Review.query.filter_by(user_id=current_user.id)
               .order_by(Review.created_at.desc()).all())
    payload_items = []
    for review in reviews:
        item = review.to_dict()
        item['product_name'] = review.product.name if review.product else None
        payload_items.append(item)
    return jsonify({'reviews': payload_items})


@review_bp.route('/pending')
@login_required
def pending_reviews():
    """Delivered products the customer hasn't reviewed yet - a nudge list."""
    reviewed = {r.product_id for r in Review.query.filter_by(user_id=current_user.id).all()}

    rows = (db.session.query(OrderItem.product_id)
            .join(Order, Order.id == OrderItem.order_id)
            .filter(Order.user_id == current_user.id, Order.status == 'delivered')
            .distinct().all())

    pending = []
    for (product_id,) in rows:
        if product_id in reviewed:
            continue
        product = db.session.get(Product, product_id)
        if product and product.is_active:
            pending.append({'id': product.id, 'name': product.name,
                            'images': [img.to_dict() for img in product.images]})
    return jsonify({'products': pending})
