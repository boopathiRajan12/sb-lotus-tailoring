"""
Shop API - public-facing endpoints for browsing products.
Includes home feed, product listing, product detail, and custom blouse feature.
"""
from flask import Blueprint, current_app, jsonify, request
from sqlalchemy import func, or_
from sqlalchemy.orm import joinedload

from models import db, Product, Category, Review, OrderItem

shop_bp = Blueprint('shop', __name__, url_prefix='/api')

# Maps the `sort` query parameter to an ORDER BY clause.
SORT_OPTIONS = {
    'newest': (Product.created_at.desc(),),
    'oldest': (Product.created_at.asc(),),
    'price_low': (Product.price.asc(),),
    'price_high': (Product.price.desc(),),
    'name': (Product.name.asc(),),
    'rating': (Product.rating_avg.desc(), Product.rating_count.desc()),
}
DEFAULT_SORT = 'newest'


def _base_query():
    """Active products with images and category eagerly loaded."""
    return (Product.query
            .options(joinedload(Product.images), joinedload(Product.category))
            .filter(Product.is_active.is_(True)))


@shop_bp.route('/home')
def home():
    """Home feed - categories plus featured, newest, and top-rated products."""
    categories = Category.query.order_by(Category.name).all()

    # Product counts per category in one query rather than one per card.
    counts = dict(
        db.session.query(Product.category_id, func.count(Product.id))
        .filter(Product.is_active.is_(True))
        .group_by(Product.category_id).all()
    )

    latest = _base_query().order_by(Product.created_at.desc()).limit(8).all()
    featured = _base_query().filter(Product.is_featured.is_(True)).limit(8).all()
    top_rated = (_base_query()
                 .filter(Product.rating_count > 0)
                 .order_by(Product.rating_avg.desc(), Product.rating_count.desc())
                 .limit(4).all())

    category_payload = []
    for category in categories:
        item = category.to_dict()
        item['product_count'] = counts.get(category.id, 0)
        category_payload.append(item)

    return jsonify({
        'categories': category_payload,
        'products': [p.to_dict() for p in latest],
        # Fall back to the newest items so the strip is never empty on a fresh shop.
        'featured': [p.to_dict() for p in (featured or latest[:4])],
        'top_rated': [p.to_dict() for p in top_rated],
        'stats': {
            'products': Product.query.filter_by(is_active=True).count(),
            'categories': len(categories),
            'reviews': Review.query.count(),
        },
    })


@shop_bp.route('/categories')
def categories():
    """All categories."""
    all_categories = Category.query.order_by(Category.name).all()
    return jsonify({'categories': [c.to_dict() for c in all_categories]})


@shop_bp.route('/products')
def product_list():
    """Product listing with category, search, price, sort, and pagination."""
    category_id = request.args.get('category', type=int)
    search_query = (request.args.get('q') or '').strip()
    page = max(1, request.args.get('page', 1, type=int) or 1)
    sort = request.args.get('sort', DEFAULT_SORT)
    min_price = request.args.get('min_price', type=float)
    max_price = request.args.get('max_price', type=float)
    custom_only = request.args.get('custom') == '1'
    in_stock_only = request.args.get('in_stock') == '1'

    if sort not in SORT_OPTIONS:
        sort = DEFAULT_SORT

    query = _base_query()

    if category_id:
        query = query.filter(Product.category_id == category_id)

    if search_query:
        # Search descriptions too, so "cotton" finds products that only mention
        # it in the body text.
        like = f'%{search_query}%'
        query = query.filter(or_(Product.name.ilike(like), Product.description.ilike(like)))

    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)
    if custom_only:
        query = query.filter(Product.is_custom_blouse.is_(True))
    if in_stock_only:
        query = query.filter(Product.stock > 0)

    per_page = current_app.config.get('PRODUCTS_PER_PAGE', 12)
    pagination = (query.order_by(*SORT_OPTIONS[sort])
                  .paginate(page=page, per_page=per_page, error_out=False))

    categories_list = Category.query.order_by(Category.name).all()
    price_floor, price_ceiling = db.session.query(
        func.min(Product.price), func.max(Product.price)
    ).filter(Product.is_active.is_(True)).first()

    return jsonify({
        'products': [p.to_dict() for p in pagination.items],
        'categories': [c.to_dict() for c in categories_list],
        'current_category': category_id,
        'search_query': search_query,
        'sort': sort,
        'price_range': {
            'min': float(price_floor or 0),
            'max': float(price_ceiling or 0),
        },
        'pagination': {
            'page': pagination.page,
            'pages': pagination.pages,
            'total': pagination.total,
            'per_page': per_page,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev,
        },
    })


@shop_bp.route('/products/<int:product_id>')
def product_detail(product_id):
    """Product detail with images, reviews, rating breakdown, and related items."""
    product = (Product.query
               .options(joinedload(Product.images), joinedload(Product.category))
               .filter(Product.id == product_id)
               .first_or_404())

    related_products = (_base_query()
                        .filter(Product.category_id == product.category_id,
                                Product.id != product.id)
                        .order_by(Product.rating_avg.desc(), Product.created_at.desc())
                        .limit(4).all())

    reviews = (Review.query.filter_by(product_id=product.id)
               .order_by(Review.created_at.desc()).limit(20).all())

    # Star histogram (1-5) powering the ratings summary bars.
    distribution = {str(star): 0 for star in range(1, 6)}
    for star, count in (db.session.query(Review.rating, func.count(Review.id))
                        .filter(Review.product_id == product.id)
                        .group_by(Review.rating).all()):
        distribution[str(star)] = count

    units_sold = (db.session.query(func.coalesce(func.sum(OrderItem.quantity), 0))
                  .filter(OrderItem.product_id == product.id).scalar()) or 0

    return jsonify({
        'product': product.to_dict(),
        'related_products': [p.to_dict() for p in related_products],
        'reviews': [r.to_dict() for r in reviews],
        'rating_distribution': distribution,
        'units_sold': int(units_sold),
    })


@shop_bp.route('/custom-blouse')
def custom_blouse():
    """Custom blouse designs users can select."""
    designs = _base_query().filter(Product.is_custom_blouse.is_(True)).all()
    return jsonify({'designs': [d.to_dict() for d in designs]})


@shop_bp.route('/search-suggestions')
def search_suggestions():
    """Lightweight typeahead results for the search box."""
    term = (request.args.get('q') or '').strip()
    if len(term) < 2:
        return jsonify({'suggestions': []})

    matches = (Product.query
               .filter(Product.is_active.is_(True), Product.name.ilike(f'%{term}%'))
               .order_by(Product.rating_avg.desc())
               .limit(6).all())
    return jsonify({
        'suggestions': [
            {'id': p.id, 'name': p.name, 'price': p.price,
             'category': p.category.name if p.category else None}
            for p in matches
        ]
    })
