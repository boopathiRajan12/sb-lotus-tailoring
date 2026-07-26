"""
Admin API - dashboard, product management, category management, order management.
All routes require admin login (is_admin=True).
"""
import os
import uuid
from datetime import datetime
from functools import wraps
from flask import Blueprint, jsonify, request, current_app
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename
from models import db, Product, ProductImage, Category, Order, User

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


def admin_required(f):
    """Decorator: ensure the current user is an admin."""
    @wraps(f)
    @login_required
    def decorated_function(*args, **kwargs):
        if not current_user.is_admin:
            return jsonify({'error': 'Access denied. Admin only.'}), 403
        return f(*args, **kwargs)
    return decorated_function


def allowed_file(filename):
    """Check if the uploaded file has an allowed extension."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']


def save_image(file):
    """Save an uploaded image to disk and return (path, binary_data, mimetype).
    Binary data is stored in DB so images persist on cloud platforms like Render.
    """
    filename = secure_filename(file.filename)
    unique_name = f"{uuid.uuid4().hex[:8]}_{filename}"
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_name)

    file_data = file.read()
    mimetype = file.content_type or 'image/jpeg'

    with open(filepath, 'wb') as f:
        f.write(file_data)

    return f"images/products/{unique_name}", file_data, mimetype


# ─── Dashboard ───────────────────────────────────────────────────────────────

@admin_bp.route('/dashboard')
@admin_required
def dashboard():
    """Admin dashboard summary statistics including user stats."""
    total_products = Product.query.count()
    total_categories = Category.query.count()
    total_orders = Order.query.count()
    pending_orders = Order.query.filter_by(status='pending').count()
    recent_orders = Order.query.order_by(Order.created_at.desc()).limit(5).all()

    total_users = User.query.filter_by(is_admin=False).count()
    first_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    new_users_month = User.query.filter(
        User.is_admin == False,
        User.created_at >= first_of_month
    ).count()

    return jsonify({
        'total_products': total_products,
        'total_categories': total_categories,
        'total_orders': total_orders,
        'pending_orders': pending_orders,
        'total_users': total_users,
        'new_users_month': new_users_month,
        'recent_orders': [o.to_dict(include_user=True) for o in recent_orders],
    })


# ─── Category Management ────────────────────────────────────────────────────

@admin_bp.route('/categories')
@admin_required
def categories():
    """List all categories."""
    all_categories = Category.query.order_by(Category.name).all()
    return jsonify({'categories': [c.to_dict(include_product_count=True) for c in all_categories]})


@admin_bp.route('/categories', methods=['POST'])
@admin_required
def add_category():
    """Add a new category."""
    data = request.get_json(silent=True) or request.form
    name = (data.get('name') or '').strip()
    description = (data.get('description') or '').strip()
    category_type = data.get('category_type') or 'stitching'

    if not name:
        return jsonify({'error': 'Category name is required.'}), 400

    if Category.query.filter_by(name=name).first():
        return jsonify({'error': 'Category already exists.'}), 400

    category = Category(name=name, description=description, category_type=category_type)
    db.session.add(category)
    db.session.commit()
    return jsonify({'message': f'Category "{name}" added successfully!', 'category': category.to_dict()}), 201


@admin_bp.route('/categories/<int:category_id>', methods=['PUT'])
@admin_required
def edit_category(category_id):
    """Edit an existing category."""
    category = Category.query.get_or_404(category_id)
    data = request.get_json(silent=True) or request.form
    name = (data.get('name') or '').strip()
    description = (data.get('description') or '').strip()
    category_type = data.get('category_type') or 'stitching'

    if not name:
        return jsonify({'error': 'Category name is required.'}), 400

    existing = Category.query.filter_by(name=name).first()
    if existing and existing.id != category.id:
        return jsonify({'error': 'Another category with this name already exists.'}), 400

    category.name = name
    category.description = description
    category.category_type = category_type
    db.session.commit()
    return jsonify({'message': f'Category "{name}" updated!', 'category': category.to_dict()})


@admin_bp.route('/categories/<int:category_id>', methods=['DELETE'])
@admin_required
def delete_category(category_id):
    """Delete a category (only if it has no products)."""
    category = Category.query.get_or_404(category_id)
    if category.products:
        return jsonify({'error': 'Cannot delete category with existing products. Remove products first.'}), 400

    db.session.delete(category)
    db.session.commit()
    return jsonify({'message': f'Category "{category.name}" deleted.'})


# ─── Product Management ─────────────────────────────────────────────────────

@admin_bp.route('/products')
@admin_required
def products():
    """List all products."""
    all_products = Product.query.order_by(Product.created_at.desc()).all()
    return jsonify({'products': [p.to_dict() for p in all_products]})


@admin_bp.route('/products/<int:product_id>')
@admin_required
def get_product(product_id):
    """Fetch a single product for editing."""
    product = Product.query.get_or_404(product_id)
    return jsonify({'product': product.to_dict()})


@admin_bp.route('/products', methods=['POST'])
@admin_required
def add_product():
    """Add a new product with images."""
    name = (request.form.get('name') or '').strip()
    description = (request.form.get('description') or '').strip()
    price = request.form.get('price', '0')
    category_id = request.form.get('category_id')
    is_custom_blouse = request.form.get('is_custom_blouse') in ('on', 'true', '1')
    stock = request.form.get('stock', '0')

    if not name or not category_id:
        return jsonify({'error': 'Product name and category are required.'}), 400

    try:
        price = float(price)
        stock = int(stock)
    except ValueError:
        return jsonify({'error': 'Invalid price or stock value.'}), 400

    product = Product(
        name=name,
        description=description,
        price=price,
        category_id=int(category_id),
        is_custom_blouse=is_custom_blouse,
        stock=stock
    )
    db.session.add(product)
    db.session.flush()

    files = request.files.getlist('images')
    for i, file in enumerate(files):
        if file and file.filename and allowed_file(file.filename):
            image_path, file_data, mimetype = save_image(file)
            img = ProductImage(
                product_id=product.id,
                image_path=image_path,
                is_primary=(i == 0),
                image_data=file_data,
                image_mimetype=mimetype
            )
            db.session.add(img)

    db.session.commit()
    return jsonify({'message': f'Product "{name}" added successfully!', 'product': product.to_dict()}), 201


@admin_bp.route('/products/<int:product_id>', methods=['PUT'])
@admin_required
def edit_product(product_id):
    """Edit an existing product."""
    product = Product.query.get_or_404(product_id)

    product.name = (request.form.get('name') or '').strip()
    product.description = (request.form.get('description') or '').strip()
    product.category_id = int(request.form.get('category_id'))
    product.is_custom_blouse = request.form.get('is_custom_blouse') in ('on', 'true', '1')
    product.is_active = request.form.get('is_active') in ('on', 'true', '1')

    try:
        product.price = float(request.form.get('price', '0'))
        product.stock = int(request.form.get('stock', '0'))
    except ValueError:
        return jsonify({'error': 'Invalid price or stock value.'}), 400

    files = request.files.getlist('images')
    for file in files:
        if file and file.filename and allowed_file(file.filename):
            image_path, file_data, mimetype = save_image(file)
            img = ProductImage(
                product_id=product.id,
                image_path=image_path,
                image_data=file_data,
                image_mimetype=mimetype
            )
            db.session.add(img)

    db.session.commit()
    return jsonify({'message': f'Product "{product.name}" updated!', 'product': product.to_dict()})


@admin_bp.route('/products/<int:product_id>', methods=['DELETE'])
@admin_required
def delete_product(product_id):
    """Delete a product and its images."""
    product = Product.query.get_or_404(product_id)

    for img in product.images:
        filepath = os.path.join(current_app.static_folder, img.image_path)
        if os.path.exists(filepath):
            os.remove(filepath)

    db.session.delete(product)
    db.session.commit()
    return jsonify({'message': f'Product "{product.name}" deleted.'})


@admin_bp.route('/products/images/<int:image_id>', methods=['DELETE'])
@admin_required
def delete_product_image(image_id):
    """Delete a single product image."""
    img = ProductImage.query.get_or_404(image_id)

    filepath = os.path.join(current_app.static_folder, img.image_path)
    if os.path.exists(filepath):
        os.remove(filepath)

    db.session.delete(img)
    db.session.commit()
    return jsonify({'message': 'Image deleted.'})


# ─── Order Management ───────────────────────────────────────────────────────

@admin_bp.route('/orders')
@admin_required
def orders():
    """View all orders."""
    all_orders = Order.query.order_by(Order.created_at.desc()).all()
    return jsonify({'orders': [o.to_dict(include_user=True) for o in all_orders]})


@admin_bp.route('/orders/<int:order_id>')
@admin_required
def order_detail(order_id):
    """View order details with parsed measurements."""
    order = Order.query.get_or_404(order_id)
    return jsonify({'order': order.to_dict(include_user=True)})


@admin_bp.route('/orders/<int:order_id>/status', methods=['PUT'])
@admin_required
def update_order_status(order_id):
    """Update order status (pending, confirmed, stitching, ready, delivered)."""
    order = Order.query.get_or_404(order_id)
    data = request.get_json(silent=True) or request.form
    new_status = data.get('status') or 'pending'
    order.status = new_status
    db.session.commit()
    return jsonify({'message': f'Order #{order.id} status updated to "{new_status}".', 'order': order.to_dict(include_user=True)})


# ─── User Management ──────────────────────────────────────────────────────

@admin_bp.route('/users')
@admin_required
def users():
    """List all registered users with stats."""
    all_users = User.query.filter_by(is_admin=False).order_by(User.created_at.desc()).all()

    user_stats = []
    for user in all_users:
        user_orders = Order.query.filter_by(user_id=user.id).all()
        total_orders = len(user_orders)
        total_spent = sum(o.total_amount for o in user_orders)
        user_stats.append({
            'user': user.to_dict(),
            'total_orders': total_orders,
            'total_spent': total_spent,
        })

    total_users = len(all_users)
    first_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    new_users_month = User.query.filter(
        User.is_admin == False,
        User.created_at >= first_of_month
    ).count()

    return jsonify({
        'user_stats': user_stats,
        'total_users': total_users,
        'new_users_month': new_users_month,
    })


@admin_bp.route('/users/<int:user_id>')
@admin_required
def user_detail(user_id):
    """View individual user details and their orders."""
    user = User.query.get_or_404(user_id)
    user_orders = Order.query.filter_by(user_id=user.id).order_by(Order.created_at.desc()).all()
    total_spent = sum(o.total_amount for o in user_orders)
    return jsonify({
        'user': user.to_dict(),
        'orders': [o.to_dict() for o in user_orders],
        'total_spent': total_spent,
    })
