"""
Admin routes - dashboard, product management, category management, order management.
All routes require admin login (is_admin=True).
"""
import os
import uuid
from functools import wraps
from flask import Blueprint, render_template, redirect, url_for, flash, request, current_app
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename
from models import db, Product, ProductImage, Category, Order

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')


def admin_required(f):
    """Decorator: ensure the current user is an admin."""
    @wraps(f)
    @login_required
    def decorated_function(*args, **kwargs):
        if not current_user.is_admin:
            flash('Access denied. Admin only.', 'danger')
            return redirect(url_for('shop.home'))
        return f(*args, **kwargs)
    return decorated_function


def allowed_file(filename):
    """Check if the uploaded file has an allowed extension."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']


def save_image(file):
    """Save an uploaded image and return its relative path."""
    filename = secure_filename(file.filename)
    # Add a unique prefix to avoid name collisions
    unique_name = f"{uuid.uuid4().hex[:8]}_{filename}"
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_name)
    file.save(filepath)
    return f"images/products/{unique_name}"


# ─── Dashboard ───────────────────────────────────────────────────────────────

@admin_bp.route('/')
@admin_required
def dashboard():
    """Admin dashboard with summary statistics."""
    total_products = Product.query.count()
    total_categories = Category.query.count()
    total_orders = Order.query.count()
    pending_orders = Order.query.filter_by(status='pending').count()
    recent_orders = Order.query.order_by(Order.created_at.desc()).limit(5).all()
    return render_template('admin/dashboard.html',
                           total_products=total_products,
                           total_categories=total_categories,
                           total_orders=total_orders,
                           pending_orders=pending_orders,
                           recent_orders=recent_orders)


# ─── Category Management ────────────────────────────────────────────────────

@admin_bp.route('/categories')
@admin_required
def categories():
    """List all categories."""
    all_categories = Category.query.order_by(Category.name).all()
    return render_template('admin/categories.html', categories=all_categories)


@admin_bp.route('/categories/add', methods=['GET', 'POST'])
@admin_required
def add_category():
    """Add a new category."""
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        description = request.form.get('description', '').strip()
        category_type = request.form.get('category_type', 'stitching')

        if not name:
            flash('Category name is required.', 'danger')
            return render_template('admin/category_form.html', category=None)

        if Category.query.filter_by(name=name).first():
            flash('Category already exists.', 'danger')
            return render_template('admin/category_form.html', category=None)

        category = Category(name=name, description=description, category_type=category_type)
        db.session.add(category)
        db.session.commit()
        flash(f'Category "{name}" added successfully!', 'success')
        return redirect(url_for('admin.categories'))

    return render_template('admin/category_form.html', category=None)


@admin_bp.route('/categories/edit/<int:category_id>', methods=['GET', 'POST'])
@admin_required
def edit_category(category_id):
    """Edit an existing category."""
    category = Category.query.get_or_404(category_id)

    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        description = request.form.get('description', '').strip()
        category_type = request.form.get('category_type', 'stitching')

        if not name:
            flash('Category name is required.', 'danger')
            return render_template('admin/category_form.html', category=category)

        existing = Category.query.filter_by(name=name).first()
        if existing and existing.id != category.id:
            flash('Another category with this name already exists.', 'danger')
            return render_template('admin/category_form.html', category=category)

        category.name = name
        category.description = description
        category.category_type = category_type
        db.session.commit()
        flash(f'Category "{name}" updated!', 'success')
        return redirect(url_for('admin.categories'))

    return render_template('admin/category_form.html', category=category)


@admin_bp.route('/categories/delete/<int:category_id>', methods=['POST'])
@admin_required
def delete_category(category_id):
    """Delete a category (only if it has no products)."""
    category = Category.query.get_or_404(category_id)
    if category.products:
        flash('Cannot delete category with existing products. Remove products first.', 'danger')
        return redirect(url_for('admin.categories'))

    db.session.delete(category)
    db.session.commit()
    flash(f'Category "{category.name}" deleted.', 'success')
    return redirect(url_for('admin.categories'))


# ─── Product Management ─────────────────────────────────────────────────────

@admin_bp.route('/products')
@admin_required
def products():
    """List all products."""
    all_products = Product.query.order_by(Product.created_at.desc()).all()
    return render_template('admin/products.html', products=all_products)


@admin_bp.route('/products/add', methods=['GET', 'POST'])
@admin_required
def add_product():
    """Add a new product with images."""
    all_categories = Category.query.order_by(Category.name).all()

    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        description = request.form.get('description', '').strip()
        price = request.form.get('price', '0')
        category_id = request.form.get('category_id')
        is_custom_blouse = request.form.get('is_custom_blouse') == 'on'
        stock = request.form.get('stock', '0')

        if not name or not category_id:
            flash('Product name and category are required.', 'danger')
            return render_template('admin/product_form.html', product=None, categories=all_categories)

        try:
            price = float(price)
            stock = int(stock)
        except ValueError:
            flash('Invalid price or stock value.', 'danger')
            return render_template('admin/product_form.html', product=None, categories=all_categories)

        product = Product(
            name=name,
            description=description,
            price=price,
            category_id=int(category_id),
            is_custom_blouse=is_custom_blouse,
            stock=stock
        )
        db.session.add(product)
        db.session.flush()  # Get the product ID before committing

        # Handle multiple image uploads
        files = request.files.getlist('images')
        for i, file in enumerate(files):
            if file and file.filename and allowed_file(file.filename):
                image_path = save_image(file)
                img = ProductImage(
                    product_id=product.id,
                    image_path=image_path,
                    is_primary=(i == 0)  # First image is primary
                )
                db.session.add(img)

        db.session.commit()
        flash(f'Product "{name}" added successfully!', 'success')
        return redirect(url_for('admin.products'))

    return render_template('admin/product_form.html', product=None, categories=all_categories)


@admin_bp.route('/products/edit/<int:product_id>', methods=['GET', 'POST'])
@admin_required
def edit_product(product_id):
    """Edit an existing product."""
    product = Product.query.get_or_404(product_id)
    all_categories = Category.query.order_by(Category.name).all()

    if request.method == 'POST':
        product.name = request.form.get('name', '').strip()
        product.description = request.form.get('description', '').strip()
        product.category_id = int(request.form.get('category_id'))
        product.is_custom_blouse = request.form.get('is_custom_blouse') == 'on'
        product.is_active = request.form.get('is_active') == 'on'

        try:
            product.price = float(request.form.get('price', '0'))
            product.stock = int(request.form.get('stock', '0'))
        except ValueError:
            flash('Invalid price or stock value.', 'danger')
            return render_template('admin/product_form.html', product=product, categories=all_categories)

        # Handle new image uploads
        files = request.files.getlist('images')
        for file in files:
            if file and file.filename and allowed_file(file.filename):
                image_path = save_image(file)
                img = ProductImage(product_id=product.id, image_path=image_path)
                db.session.add(img)

        db.session.commit()
        flash(f'Product "{product.name}" updated!', 'success')
        return redirect(url_for('admin.products'))

    return render_template('admin/product_form.html', product=product, categories=all_categories)


@admin_bp.route('/products/delete/<int:product_id>', methods=['POST'])
@admin_required
def delete_product(product_id):
    """Delete a product and its images."""
    product = Product.query.get_or_404(product_id)

    # Delete image files from disk
    for img in product.images:
        filepath = os.path.join(current_app.static_folder, img.image_path)
        if os.path.exists(filepath):
            os.remove(filepath)

    db.session.delete(product)
    db.session.commit()
    flash(f'Product "{product.name}" deleted.', 'success')
    return redirect(url_for('admin.products'))


@admin_bp.route('/products/delete-image/<int:image_id>', methods=['POST'])
@admin_required
def delete_product_image(image_id):
    """Delete a single product image."""
    img = ProductImage.query.get_or_404(image_id)
    product_id = img.product_id

    filepath = os.path.join(current_app.static_folder, img.image_path)
    if os.path.exists(filepath):
        os.remove(filepath)

    db.session.delete(img)
    db.session.commit()
    flash('Image deleted.', 'success')
    return redirect(url_for('admin.edit_product', product_id=product_id))


# ─── Order Management ───────────────────────────────────────────────────────

@admin_bp.route('/orders')
@admin_required
def orders():
    """View all orders."""
    all_orders = Order.query.order_by(Order.created_at.desc()).all()
    return render_template('admin/orders.html', orders=all_orders)


@admin_bp.route('/orders/<int:order_id>')
@admin_required
def order_detail(order_id):
    """View order details."""
    order = Order.query.get_or_404(order_id)
    return render_template('admin/order_detail.html', order=order)


@admin_bp.route('/orders/<int:order_id>/update-status', methods=['POST'])
@admin_required
def update_order_status(order_id):
    """Update order status (pending, confirmed, stitching, ready, delivered)."""
    order = Order.query.get_or_404(order_id)
    new_status = request.form.get('status', 'pending')
    order.status = new_status
    db.session.commit()
    flash(f'Order #{order.id} status updated to "{new_status}".', 'success')
    return redirect(url_for('admin.order_detail', order_id=order.id))
