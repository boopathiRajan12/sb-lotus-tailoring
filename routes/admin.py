"""
Admin API - dashboard, product, category, order, user, and review management.
All routes require admin login (is_admin=True).
"""
import csv
import io
import os
import uuid
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request, current_app, Response
from flask_login import current_user
from sqlalchemy import case, func, or_
from sqlalchemy.orm import joinedload
from werkzeug.utils import secure_filename

from models import (
    db, Product, ProductImage, Category, Order, OrderItem, User, Review,
    ORDER_STATUSES, ORDER_FLOW, utcnow,
)
from .helpers import payload, get_str, get_int, get_float, get_bool, error, admin_required

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

# Statuses that count as realised revenue.
REVENUE_STATUSES = tuple(s for s in ORDER_FLOW)

# Admin tables are paginated: an unbounded `.all()` serialises every row (and,
# for orders, every line item and status-history entry) into one response, which
# grows without limit as the shop does.
ADMIN_PER_PAGE = 25


def _paginate(query, per_page=ADMIN_PER_PAGE):
    """Paginate `query` from the `page` query parameter."""
    page = max(1, request.args.get('page', 1, type=int) or 1)
    return query.paginate(page=page, per_page=per_page, error_out=False)


def _pagination_payload(pagination):
    return {
        'page': pagination.page,
        'pages': pagination.pages,
        'total': pagination.total,
        'per_page': pagination.per_page,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev,
    }


# The MIME type served back for each permitted extension. The browser's own
# Content-Type header is NOT used: it is attacker-supplied, and echoing it back
# from /product-image/<id> would let an upload be served as text/html from this
# origin - stored XSS against every visitor, admin-authored or not.
EXTENSION_MIMETYPES = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
}


def _extension(filename):
    return filename.rsplit('.', 1)[1].lower() if '.' in filename else ''


def allowed_file(filename):
    """Check if the uploaded file has an allowed extension."""
    return _extension(filename) in current_app.config['ALLOWED_EXTENSIONS']


def save_image(file):
    """Save an uploaded image to disk and return (path, binary_data, mimetype).

    Binary data is stored in the DB too, so images survive on cloud platforms
    like Render where the filesystem is ephemeral.
    """
    filename = secure_filename(file.filename)
    unique_name = f"{uuid.uuid4().hex[:8]}_{filename}"
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_name)

    file_data = file.read()
    mimetype = EXTENSION_MIMETYPES.get(_extension(filename), 'application/octet-stream')

    with open(filepath, 'wb') as f:
        f.write(file_data)

    return f"images/products/{unique_name}", file_data, mimetype


def _month_start(offset=0):
    """First instant of the month, `offset` months back from today."""
    now = utcnow()
    year, month = now.year, now.month - offset
    while month <= 0:
        month += 12
        year -= 1
    return datetime(year, month, 1)


# ─── Dashboard & Analytics ───────────────────────────────────────────────────

@admin_bp.route('/dashboard')
@admin_required
def dashboard():
    """Headline stats, revenue trend, status mix, and best sellers."""
    total_products = Product.query.count()
    active_products = Product.query.filter_by(is_active=True).count()
    total_categories = Category.query.count()
    total_orders = Order.query.count()
    pending_orders = Order.query.filter_by(status='pending').count()
    in_progress = Order.query.filter(Order.status.in_(('confirmed', 'stitching'))).count()

    total_users = User.query.filter_by(is_admin=False).count()
    first_of_month = _month_start()
    new_users_month = User.query.filter(
        User.is_admin.is_(False), User.created_at >= first_of_month
    ).count()

    revenue_filter = Order.status.in_(REVENUE_STATUSES)
    total_revenue = db.session.query(func.coalesce(func.sum(Order.total_amount), 0.0)) \
        .filter(revenue_filter).scalar() or 0.0
    month_revenue = db.session.query(func.coalesce(func.sum(Order.total_amount), 0.0)) \
        .filter(revenue_filter, Order.created_at >= first_of_month).scalar() or 0.0
    last_month_revenue = db.session.query(func.coalesce(func.sum(Order.total_amount), 0.0)) \
        .filter(revenue_filter,
                Order.created_at >= _month_start(1),
                Order.created_at < first_of_month).scalar() or 0.0

    # Six-month revenue series for the dashboard chart.
    revenue_series = []
    for offset in range(5, -1, -1):
        start = _month_start(offset)
        end = _month_start(offset - 1) if offset > 0 else utcnow() + timedelta(days=1)
        amount = db.session.query(func.coalesce(func.sum(Order.total_amount), 0.0)) \
            .filter(revenue_filter, Order.created_at >= start, Order.created_at < end).scalar() or 0.0
        count = Order.query.filter(Order.created_at >= start, Order.created_at < end).count()
        revenue_series.append({
            'label': start.strftime('%b'),
            'month': start.strftime('%Y-%m'),
            'revenue': float(amount),
            'orders': count,
        })

    status_counts = dict(
        db.session.query(Order.status, func.count(Order.id)).group_by(Order.status).all()
    )
    status_breakdown = [
        {'status': status, 'count': status_counts.get(status, 0)}
        for status in ORDER_STATUSES
    ]

    top_products = [
        {'id': pid, 'name': name, 'units': int(units or 0), 'revenue': float(revenue or 0)}
        for pid, name, units, revenue in (
            db.session.query(
                Product.id, Product.name,
                func.sum(OrderItem.quantity), func.sum(OrderItem.quantity * OrderItem.price)
            )
            .join(OrderItem, OrderItem.product_id == Product.id)
            .join(Order, Order.id == OrderItem.order_id)
            .filter(Order.status.in_(REVENUE_STATUSES))
            .group_by(Product.id, Product.name)
            .order_by(func.sum(OrderItem.quantity).desc())
            .limit(5).all()
        )
    ]

    low_stock = [
        p.to_dict(include_images=False) for p in
        Product.query.filter(Product.is_active.is_(True), Product.stock > 0, Product.stock <= 5)
        .order_by(Product.stock.asc()).limit(5).all()
    ]

    recent_orders = (Order.query.options(joinedload(Order.user))
                     .order_by(Order.created_at.desc()).limit(5).all())

    growth = None
    if last_month_revenue:
        growth = round((month_revenue - last_month_revenue) / last_month_revenue * 100, 1)

    return jsonify({
        'total_products': total_products,
        'active_products': active_products,
        'total_categories': total_categories,
        'total_orders': total_orders,
        'pending_orders': pending_orders,
        'in_progress_orders': in_progress,
        'total_users': total_users,
        'new_users_month': new_users_month,
        'total_revenue': float(total_revenue),
        'month_revenue': float(month_revenue),
        'last_month_revenue': float(last_month_revenue),
        'revenue_growth': growth,
        'average_order_value': float(total_revenue / total_orders) if total_orders else 0.0,
        'revenue_series': revenue_series,
        'status_breakdown': status_breakdown,
        'top_products': top_products,
        'low_stock': low_stock,
        'recent_orders': [o.to_dict(include_user=True) for o in recent_orders],
    })


# ─── Category Management ────────────────────────────────────────────────────

@admin_bp.route('/categories')
@admin_required
def categories():
    """List all categories."""
    all_categories = Category.query.order_by(Category.name).all()
    return jsonify({'categories': [c.to_dict(include_product_count=True) for c in all_categories]})


@admin_bp.route('/categories/<int:category_id>')
@admin_required
def get_category(category_id):
    """Fetch a single category for editing."""
    category = db.session.get(Category, category_id)
    if category is None:
        return error('Category not found.', 404)
    return jsonify({'category': category.to_dict(include_product_count=True)})


@admin_bp.route('/categories', methods=['POST'])
@admin_required
def add_category():
    """Add a new category."""
    data = payload()
    name = get_str(data, 'name')
    description = get_str(data, 'description')
    category_type = get_str(data, 'category_type') or 'stitching'

    if not name:
        return error('Category name is required.')
    if Category.query.filter(func.lower(Category.name) == name.lower()).first():
        return error('Category already exists.')

    category = Category(name=name, description=description, category_type=category_type)
    db.session.add(category)
    db.session.commit()
    return jsonify({'message': f'Category "{name}" added successfully!', 'category': category.to_dict()}), 201


@admin_bp.route('/categories/<int:category_id>', methods=['PUT'])
@admin_required
def edit_category(category_id):
    """Edit an existing category."""
    category = db.session.get(Category, category_id)
    if category is None:
        return error('Category not found.', 404)

    data = payload()
    name = get_str(data, 'name')
    if not name:
        return error('Category name is required.')

    existing = Category.query.filter(func.lower(Category.name) == name.lower()).first()
    if existing and existing.id != category.id:
        return error('Another category with this name already exists.')

    category.name = name
    category.description = get_str(data, 'description')
    category.category_type = get_str(data, 'category_type') or 'stitching'
    db.session.commit()
    return jsonify({'message': f'Category "{name}" updated!', 'category': category.to_dict()})


@admin_bp.route('/categories/<int:category_id>', methods=['DELETE'])
@admin_required
def delete_category(category_id):
    """Delete a category (only if it has no products)."""
    category = db.session.get(Category, category_id)
    if category is None:
        return error('Category not found.', 404)
    if category.products:
        return error('Cannot delete a category that still has products. Move or remove them first.')

    db.session.delete(category)
    db.session.commit()
    return jsonify({'message': f'Category "{category.name}" deleted.'})


# ─── Product Management ─────────────────────────────────────────────────────

@admin_bp.route('/products')
@admin_required
def products():
    """Product list with search, category filter, and status filter."""
    search = (request.args.get('q') or '').strip()
    category_id = request.args.get('category', type=int)
    status = request.args.get('status')  # active | inactive | low_stock | custom

    query = Product.query.options(joinedload(Product.images), joinedload(Product.category))

    if search:
        query = query.filter(Product.name.ilike(f'%{search}%'))
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if status == 'active':
        query = query.filter(Product.is_active.is_(True))
    elif status == 'inactive':
        query = query.filter(Product.is_active.is_(False))
    elif status == 'low_stock':
        query = query.filter(Product.stock > 0, Product.stock <= 5)
    elif status == 'custom':
        query = query.filter(Product.is_custom_blouse.is_(True))

    pagination = _paginate(query.order_by(Product.created_at.desc()))
    return jsonify({
        'products': [p.to_dict() for p in pagination.items],
        'total': pagination.total,
        'pagination': _pagination_payload(pagination),
    })


@admin_bp.route('/products/<int:product_id>')
@admin_required
def get_product(product_id):
    """Fetch a single product for editing."""
    product = db.session.get(Product, product_id)
    if product is None:
        return error('Product not found.', 404)
    return jsonify({'product': product.to_dict()})


def _apply_product_fields(product, form, require_name=True):
    """Copy validated form fields onto a product. Returns an error string or None."""
    name = get_str(form, 'name')
    category_id = get_int(form, 'category_id')

    if require_name and not name:
        return 'Product name is required.'
    if category_id is None:
        return 'Please choose a category.'
    if db.session.get(Category, category_id) is None:
        return 'That category does not exist.'

    price = get_float(form, 'price', minimum=0)
    if price is None:
        return 'Please enter a valid price.'

    stock = get_int(form, 'stock', default=0, minimum=0)
    compare_at = get_float(form, 'compare_at_price', minimum=0)
    if compare_at is not None and compare_at <= price:
        # A "was" price at or below the current price isn't a discount.
        compare_at = None

    product.name = name
    product.description = get_str(form, 'description')
    product.price = price
    product.stock = stock
    product.compare_at_price = compare_at
    product.category_id = category_id
    product.is_custom_blouse = get_bool(form, 'is_custom_blouse')
    product.is_featured = get_bool(form, 'is_featured')
    return None


@admin_bp.route('/products', methods=['POST'])
@admin_required
def add_product():
    """Add a new product with images."""
    product = Product(name='', price=0, category_id=0)
    problem = _apply_product_fields(product, request.form)
    if problem:
        return error(problem)

    product.is_active = True
    db.session.add(product)
    db.session.flush()

    rejected = _attach_images(product, request.files.getlist('images'), mark_primary=True)

    db.session.commit()
    message = f'Product "{product.name}" added successfully!'
    if rejected:
        message += f' ({rejected} file(s) skipped - unsupported format.)'
    return jsonify({'message': message, 'product': product.to_dict()}), 201


@admin_bp.route('/products/<int:product_id>', methods=['PUT'])
@admin_required
def edit_product(product_id):
    """Edit an existing product."""
    product = db.session.get(Product, product_id)
    if product is None:
        return error('Product not found.', 404)

    problem = _apply_product_fields(product, request.form)
    if problem:
        return error(problem)

    product.is_active = get_bool(request.form, 'is_active')
    rejected = _attach_images(product, request.files.getlist('images'), mark_primary=not product.images)

    db.session.commit()
    message = f'Product "{product.name}" updated!'
    if rejected:
        message += f' ({rejected} file(s) skipped - unsupported format.)'
    return jsonify({'message': message, 'product': product.to_dict()})


def _attach_images(product, files, mark_primary=False):
    """Save uploaded images against a product. Returns the count rejected."""
    rejected = 0
    for index, file in enumerate(files):
        if not file or not file.filename:
            continue
        if not allowed_file(file.filename):
            rejected += 1
            continue
        image_path, file_data, mimetype = save_image(file)
        db.session.add(ProductImage(
            product_id=product.id,
            image_path=image_path,
            is_primary=(mark_primary and index == 0),
            image_data=file_data,
            image_mimetype=mimetype,
        ))
    return rejected


@admin_bp.route('/products/<int:product_id>/toggle', methods=['PUT'])
@admin_required
def toggle_product(product_id):
    """Flip a product between visible and hidden without opening the form."""
    product = db.session.get(Product, product_id)
    if product is None:
        return error('Product not found.', 404)

    product.is_active = not product.is_active
    db.session.commit()
    state = 'visible to customers' if product.is_active else 'hidden'
    return jsonify({'message': f'"{product.name}" is now {state}.', 'product': product.to_dict()})


@admin_bp.route('/products/<int:product_id>', methods=['DELETE'])
@admin_required
def delete_product(product_id):
    """Delete a product and its images."""
    product = db.session.get(Product, product_id)
    if product is None:
        return error('Product not found.', 404)

    if product.order_items:
        # Deleting would orphan historical order lines, so hide it instead.
        return error(
            'This product appears in past orders and cannot be deleted. '
            'Set it to inactive to hide it from the shop.'
        )

    for img in product.images:
        filepath = os.path.join(current_app.static_folder, img.image_path)
        if os.path.exists(filepath):
            os.remove(filepath)

    name = product.name
    db.session.delete(product)
    db.session.commit()
    return jsonify({'message': f'Product "{name}" deleted.'})


@admin_bp.route('/products/images/<int:image_id>', methods=['DELETE'])
@admin_required
def delete_product_image(image_id):
    """Delete a single product image."""
    img = db.session.get(ProductImage, image_id)
    if img is None:
        return error('Image not found.', 404)

    filepath = os.path.join(current_app.static_folder, img.image_path)
    if os.path.exists(filepath):
        os.remove(filepath)

    db.session.delete(img)
    db.session.commit()
    return jsonify({'message': 'Image deleted.'})


# ─── Order Management ───────────────────────────────────────────────────────

def _filtered_orders(eager=True):
    """Order query honouring the status / search / date query parameters.

    `eager=False` drops the eager-loading options, for callers that aggregate
    rather than serialise - there is no point joining in items to sum a column.
    """
    status = request.args.get('status')
    search = (request.args.get('q') or '').strip()
    days = request.args.get('days', type=int)

    query = Order.query
    if eager:
        query = query.options(joinedload(Order.user), joinedload(Order.items))

    if status and status in ORDER_STATUSES:
        query = query.filter(Order.status == status)
    if days:
        query = query.filter(Order.created_at >= utcnow() - timedelta(days=days))

    if search:
        like = f'%{search}%'
        # Outer join so an order whose user row is missing still matches on
        # phone or id, and so the search stacks with the other filters rather
        # than replacing them.
        conditions = [
            User.username.ilike(like),
            User.email.ilike(like),
            Order.phone.ilike(like),
        ]
        bare = search.lstrip('#')
        if bare.isdigit():
            conditions.append(Order.id == int(bare))

        query = query.outerjoin(User, User.id == Order.user_id).filter(or_(*conditions))

    return query.order_by(Order.created_at.desc())


@admin_bp.route('/orders')
@admin_required
def orders():
    """Orders page, with optional status/search/date filtering."""
    pagination = _paginate(_filtered_orders())

    # Revenue covers the whole filtered set, not just the visible page, so it is
    # summed in the database rather than over `pagination.items`.
    revenue = (_filtered_orders(eager=False)
               .filter(Order.status != 'cancelled')
               .with_entities(func.coalesce(func.sum(Order.total_amount), 0.0))
               .order_by(None)
               .scalar()) or 0.0

    return jsonify({
        'orders': [o.to_dict(include_user=True) for o in pagination.items],
        'total': pagination.total,
        'filtered_revenue': float(revenue),
        'statuses': list(ORDER_STATUSES),
        'pagination': _pagination_payload(pagination),
    })


@admin_bp.route('/orders/export')
@admin_required
def export_orders():
    """Download the current order view as a CSV file."""
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([
        'Order ID', 'Date', 'Customer', 'Email', 'Phone',
        'Items', 'Total', 'Status', 'Shipping Address', 'Notes',
    ])
    for order in _filtered_orders().all():
        writer.writerow([
            order.id,
            order.created_at.strftime('%Y-%m-%d %H:%M') if order.created_at else '',
            order.user.username if order.user else '',
            order.user.email if order.user else '',
            order.phone or '',
            '; '.join(f'{i.product.name if i.product else "?"} x{i.quantity}' for i in order.items),
            f'{order.total_amount:.2f}',
            order.status,
            (order.shipping_address or '').replace('\n', ' '),
            (order.notes or '').replace('\n', ' '),
        ])

    filename = f'sb-lotus-orders-{utcnow():%Y-%m-%d}.csv'
    return Response(
        buffer.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': f'attachment; filename={filename}'},
    )


@admin_bp.route('/orders/<int:order_id>')
@admin_required
def order_detail(order_id):
    """View order details with parsed measurements."""
    order = db.session.get(Order, order_id)
    if order is None:
        return error('Order not found.', 404)
    return jsonify({'order': order.to_dict(include_user=True)})


@admin_bp.route('/orders/<int:order_id>/status', methods=['PUT'])
@admin_required
def update_order_status(order_id):
    """Update order status and append to its timeline."""
    order = db.session.get(Order, order_id)
    if order is None:
        return error('Order not found.', 404)

    data = payload()
    new_status = get_str(data, 'status')
    note = get_str(data, 'note')

    if new_status not in ORDER_STATUSES:
        return error(f'Unknown status. Choose one of: {", ".join(ORDER_STATUSES)}.')
    if new_status == order.status:
        return error(f'This order is already marked "{new_status}".')

    was_cancelled = order.status == 'cancelled'
    order.set_status(new_status, note=note or None)

    # Cancelling releases reserved stock; reinstating an order takes it back.
    # Both use a SQL-side expression rather than a Python read-modify-write, so
    # a concurrent checkout on the same product cannot overwrite the change.
    if new_status == 'cancelled' and not was_cancelled:
        order.cancel_reason = note or None
        for item in order.items:
            if item.product and not item.product.is_made_to_order:
                item.product.stock = Product.stock + item.quantity
    elif was_cancelled and new_status != 'cancelled':
        order.cancel_reason = None
        for item in order.items:
            if item.product and not item.product.is_made_to_order:
                # Floor at zero without reading the value first. `case` is used
                # rather than GREATEST/MAX because those differ between
                # Postgres and SQLite.
                restored = Product.stock - item.quantity
                item.product.stock = case((restored < 0, 0), else_=restored)

    db.session.commit()
    return jsonify({
        'message': f'Order #{order.id} status updated to "{new_status}".',
        'order': order.to_dict(include_user=True),
    })


# ─── User Management ──────────────────────────────────────────────────────

@admin_bp.route('/users')
@admin_required
def users():
    """List registered users with order stats, in a single aggregate query."""
    search = (request.args.get('q') or '').strip()

    query = User.query.filter(User.is_admin.is_(False))
    if search:
        like = f'%{search}%'
        query = query.filter(or_(User.username.ilike(like), User.email.ilike(like)))

    pagination = _paginate(query.order_by(User.created_at.desc()))
    page_users = pagination.items

    # One grouped query for the whole page instead of two per user.
    stats_rows = {}
    if page_users:
        for user_id, count, spent in (
            db.session.query(Order.user_id, func.count(Order.id), func.coalesce(func.sum(Order.total_amount), 0.0))
            .filter(Order.status != 'cancelled',
                    Order.user_id.in_([u.id for u in page_users]))
            .group_by(Order.user_id).all()
        ):
            stats_rows[user_id] = (count, float(spent or 0))

    user_stats = [
        {
            'user': user.to_dict(),
            'total_orders': stats_rows.get(user.id, (0, 0.0))[0],
            'total_spent': stats_rows.get(user.id, (0, 0.0))[1],
        }
        for user in page_users
    ]

    first_of_month = _month_start()
    return jsonify({
        'user_stats': user_stats,
        'pagination': _pagination_payload(pagination),
        'total_users': User.query.filter_by(is_admin=False).count(),
        'new_users_month': User.query.filter(
            User.is_admin.is_(False), User.created_at >= first_of_month
        ).count(),
        'suspended_users': User.query.filter(
            User.is_admin.is_(False), User.is_active_account.is_(False)
        ).count(),
    })


@admin_bp.route('/users/<int:user_id>')
@admin_required
def user_detail(user_id):
    """View individual user details, orders, and reviews."""
    user = db.session.get(User, user_id)
    if user is None:
        return error('User not found.', 404)

    user_orders = (Order.query.filter_by(user_id=user.id)
                   .order_by(Order.created_at.desc()).all())
    reviews = Review.query.filter_by(user_id=user.id).order_by(Review.created_at.desc()).all()

    return jsonify({
        'user': user.to_dict(),
        'orders': [o.to_dict() for o in user_orders],
        'total_spent': sum(o.total_amount for o in user_orders if o.status != 'cancelled'),
        'reviews': [r.to_dict() for r in reviews],
    })


@admin_bp.route('/users/<int:user_id>/toggle', methods=['PUT'])
@admin_required
def toggle_user(user_id):
    """Suspend or reinstate a customer account."""
    user = db.session.get(User, user_id)
    if user is None:
        return error('User not found.', 404)
    if user.is_admin:
        return error('Admin accounts cannot be suspended here.')
    if user.id == current_user.id:
        return error('You cannot suspend your own account.')

    user.is_active_account = not user.is_active_account
    db.session.commit()
    state = 'reinstated' if user.is_active_account else 'suspended'
    return jsonify({'message': f'{user.username} has been {state}.', 'user': user.to_dict()})


# ─── Review Moderation ────────────────────────────────────────────────────

@admin_bp.route('/reviews')
@admin_required
def reviews():
    """All customer reviews, newest first, for moderation."""
    all_reviews = (Review.query.options(joinedload(Review.user), joinedload(Review.product))
                   .order_by(Review.created_at.desc()).limit(200).all())

    payload_items = []
    for review in all_reviews:
        item = review.to_dict()
        item['product_name'] = review.product.name if review.product else None
        payload_items.append(item)

    average = db.session.query(func.coalesce(func.avg(Review.rating), 0.0)).scalar() or 0.0
    return jsonify({
        'reviews': payload_items,
        'total': Review.query.count(),
        'average_rating': round(float(average), 2),
    })
