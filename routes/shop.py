"""
Shop routes - public-facing pages for browsing products.
Includes home page, product listing, product detail, and custom blouse feature.
"""
from flask import Blueprint, render_template, request
from models import Product, Category

shop_bp = Blueprint('shop', __name__)


@shop_bp.route('/')
def home():
    """Home page - shows featured products and categories."""
    categories = Category.query.order_by(Category.name).all()
    featured_products = Product.query.filter_by(is_active=True).order_by(Product.created_at.desc()).limit(8).all()
    return render_template('user/home.html', categories=categories, products=featured_products)


@shop_bp.route('/products')
def product_list():
    """Product listing with optional category filter and search."""
    category_id = request.args.get('category', type=int)
    search_query = request.args.get('q', '').strip()
    page = request.args.get('page', 1, type=int)

    query = Product.query.filter_by(is_active=True)

    if category_id:
        query = query.filter_by(category_id=category_id)

    if search_query:
        query = query.filter(Product.name.ilike(f'%{search_query}%'))

    products = query.order_by(Product.created_at.desc()).paginate(page=page, per_page=12, error_out=False)
    categories = Category.query.order_by(Category.name).all()

    return render_template('user/products.html',
                           products=products,
                           categories=categories,
                           current_category=category_id,
                           search_query=search_query)


@shop_bp.route('/products/<int:product_id>')
def product_detail(product_id):
    """Product detail page with all images and info."""
    product = Product.query.get_or_404(product_id)
    related_products = Product.query.filter(
        Product.category_id == product.category_id,
        Product.id != product.id,
        Product.is_active == True
    ).limit(4).all()
    return render_template('user/product_detail.html', product=product, related_products=related_products)


@shop_bp.route('/custom-blouse')
def custom_blouse():
    """Custom blouse designs - users can view and select pre-made designs."""
    designs = Product.query.filter_by(is_custom_blouse=True, is_active=True).all()
    return render_template('user/custom_blouse.html', designs=designs)


@shop_bp.route('/about')
def about():
    """About the shop."""
    return render_template('user/about.html')
