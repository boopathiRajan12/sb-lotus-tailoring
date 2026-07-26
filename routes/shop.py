"""
Shop API - public-facing endpoints for browsing products.
Includes home feed, product listing, product detail, and custom blouse feature.
"""
from flask import Blueprint, jsonify, request
from sqlalchemy.orm import joinedload
from models import Product, Category

shop_bp = Blueprint('shop', __name__, url_prefix='/api')


@shop_bp.route('/home')
def home():
    """Home feed - featured products and categories."""
    categories = Category.query.order_by(Category.name).all()
    featured_products = (Product.query
        .options(joinedload(Product.images), joinedload(Product.category))
        .filter_by(is_active=True)
        .order_by(Product.created_at.desc())
        .limit(8).all())
    return jsonify({
        'categories': [c.to_dict() for c in categories],
        'products': [p.to_dict() for p in featured_products],
    })


@shop_bp.route('/categories')
def categories():
    """All categories."""
    all_categories = Category.query.order_by(Category.name).all()
    return jsonify({'categories': [c.to_dict() for c in all_categories]})


@shop_bp.route('/products')
def product_list():
    """Product listing with optional category filter, search, and pagination."""
    category_id = request.args.get('category', type=int)
    search_query = request.args.get('q', '').strip()
    page = request.args.get('page', 1, type=int)

    query = (Product.query
        .options(joinedload(Product.images), joinedload(Product.category))
        .filter_by(is_active=True))

    if category_id:
        query = query.filter_by(category_id=category_id)

    if search_query:
        query = query.filter(Product.name.ilike(f'%{search_query}%'))

    pagination = query.order_by(Product.created_at.desc()).paginate(page=page, per_page=12, error_out=False)
    categories_list = Category.query.order_by(Category.name).all()

    return jsonify({
        'products': [p.to_dict() for p in pagination.items],
        'categories': [c.to_dict() for c in categories_list],
        'current_category': category_id,
        'search_query': search_query,
        'pagination': {
            'page': pagination.page,
            'pages': pagination.pages,
            'total': pagination.total,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev,
        },
    })


@shop_bp.route('/products/<int:product_id>')
def product_detail(product_id):
    """Product detail with all images/info plus related products."""
    product = (Product.query
        .options(joinedload(Product.images), joinedload(Product.category))
        .get_or_404(product_id))
    related_products = (Product.query
        .options(joinedload(Product.images))
        .filter(
            Product.category_id == product.category_id,
            Product.id != product.id,
            Product.is_active == True
        ).limit(4).all())
    return jsonify({
        'product': product.to_dict(),
        'related_products': [p.to_dict() for p in related_products],
    })


@shop_bp.route('/custom-blouse')
def custom_blouse():
    """Custom blouse designs users can select."""
    designs = (Product.query
        .options(joinedload(Product.images))
        .filter_by(is_custom_blouse=True, is_active=True).all())
    return jsonify({'designs': [d.to_dict() for d in designs]})
