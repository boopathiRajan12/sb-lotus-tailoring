"""
Cart and checkout API.
Handles add/remove/update cart items, order placement, and cancellation.
"""
from flask import Blueprint, jsonify
from flask_login import login_required, current_user
from sqlalchemy.orm import joinedload

from models import db, Product, CartItem, Order, OrderItem
from .helpers import payload, get_str, get_int, get_bool, error, clean_measurements

cart_bp = Blueprint('cart', __name__, url_prefix='/api')

MAX_QTY_PER_ITEM = 20


def _load_cart():
    """The current user's cart rows, with product data eagerly loaded."""
    return (CartItem.query
            .options(joinedload(CartItem.product).joinedload(Product.images))
            .filter_by(user_id=current_user.id)
            .order_by(CartItem.added_at.desc())
            .all())


def _cart_response(cart_items):
    """Cart payload with totals and any blocking issues spelled out."""
    subtotal = sum(item.product.price * item.quantity for item in cart_items if item.product)
    issues = []
    for item in cart_items:
        if not item.product or not item.product.is_active:
            issues.append(f'"{item.product.name if item.product else "An item"}" is no longer available.')
        elif not item.product.is_made_to_order and item.quantity > item.product.stock:
            issues.append(f'Only {item.product.stock} left of "{item.product.name}".')

    return {
        'cart_items': [item.to_dict() for item in cart_items],
        'subtotal': subtotal,
        'total': subtotal,
        'item_count': sum(item.quantity for item in cart_items),
        'issues': issues,
    }


def _lock_cart_products(cart_items):
    """Take a row lock on every product in the cart, for the checkout window.

    Checking stock and then decrementing it are two statements; without a lock
    two concurrent checkouts both see the last item available and both sell it.
    `SELECT ... FOR UPDATE` serialises them, and the lock is released by the
    commit (or rollback) that ends the request.

    `populate_existing()` matters: the products are already in the session's
    identity map from `_load_cart`, and SQLAlchemy would otherwise hand back
    those stale instances without applying the freshly locked values.

    Ordering by id gives every request the same lock acquisition order, so two
    overlapping checkouts of the same two products cannot deadlock. On SQLite
    (used by the tests) FOR UPDATE is not supported and is silently omitted -
    harmless, since its writes are serialised by a database-level lock anyway.
    """
    product_ids = {item.product_id for item in cart_items if item.product_id}
    if not product_ids:
        return

    (db.session.query(Product)
     .filter(Product.id.in_(product_ids))
     .order_by(Product.id)
     .populate_existing()
     .with_for_update()
     .all())


@cart_bp.route('/cart')
@login_required
def view_cart():
    """The current user's shopping cart."""
    return jsonify(_cart_response(_load_cart()))


@cart_bp.route('/cart/items', methods=['POST'])
@login_required
def add_to_cart():
    """Add a product to the cart (or increment quantity if already present)."""
    data = payload()
    product_id = get_int(data, 'product_id')
    if product_id is None:
        return error('A product is required.')

    product = db.session.get(Product, product_id)
    if product is None or not product.is_active:
        return error('That product is not available.', 404)

    quantity = get_int(data, 'quantity', default=1, minimum=1, maximum=MAX_QTY_PER_ITEM)
    measurements = clean_measurements(data.get('measurements'))

    existing = CartItem.query.filter_by(user_id=current_user.id, product_id=product_id).first()
    new_quantity = (existing.quantity if existing else 0) + quantity

    if not product.is_made_to_order and new_quantity > product.stock:
        return error(f'Only {product.stock} of "{product.name}" left in stock.')
    if new_quantity > MAX_QTY_PER_ITEM:
        return error(f'You can order at most {MAX_QTY_PER_ITEM} of one item.')

    if existing:
        existing.quantity = new_quantity
        if measurements:
            existing.measurements = measurements
    else:
        db.session.add(CartItem(
            user_id=current_user.id,
            product_id=product_id,
            quantity=quantity,
            measurements=measurements,
        ))

    db.session.commit()
    return jsonify({
        'message': f'"{product.name}" added to cart!',
        'cart_count': sum(i.quantity for i in current_user.cart_items),
    }), 201


@cart_bp.route('/cart/items/<int:item_id>', methods=['PUT'])
@login_required
def update_cart(item_id):
    """Update the quantity or measurements of a cart item."""
    cart_item = db.session.get(CartItem, item_id)
    if cart_item is None:
        return error('Cart item not found.', 404)
    if cart_item.user_id != current_user.id:
        return error('Access denied.', 403)

    data = payload()

    if 'measurements' in data:
        cart_item.measurements = clean_measurements(data.get('measurements'))

    if 'quantity' in data:
        quantity = get_int(data, 'quantity', default=1, maximum=MAX_QTY_PER_ITEM)
        if quantity is not None and quantity < 1:
            db.session.delete(cart_item)
            db.session.commit()
            return jsonify({'message': 'Item removed from cart.'})

        product = cart_item.product
        if product and not product.is_made_to_order and quantity > product.stock:
            return error(f'Only {product.stock} of "{product.name}" left in stock.')
        cart_item.quantity = quantity

    db.session.commit()
    return jsonify({'message': 'Cart updated.', 'cart_item': cart_item.to_dict()})


@cart_bp.route('/cart/items/<int:item_id>', methods=['DELETE'])
@login_required
def remove_from_cart(item_id):
    """Remove an item from the cart."""
    cart_item = db.session.get(CartItem, item_id)
    if cart_item is None:
        return error('Cart item not found.', 404)
    if cart_item.user_id != current_user.id:
        return error('Access denied.', 403)

    db.session.delete(cart_item)
    db.session.commit()
    return jsonify({'message': 'Item removed from cart.'})


@cart_bp.route('/cart', methods=['DELETE'])
@login_required
def clear_cart():
    """Empty the whole cart."""
    CartItem.query.filter_by(user_id=current_user.id).delete()
    db.session.commit()
    return jsonify({'message': 'Cart cleared.'})


@cart_bp.route('/checkout', methods=['GET'])
@login_required
def checkout_summary():
    """Cart items + total for the checkout review screen."""
    data = _cart_response(_load_cart())
    data['user'] = {
        'address': current_user.address or '',
        'phone': current_user.phone or '',
    }
    return jsonify(data)


@cart_bp.route('/checkout', methods=['POST'])
@login_required
def checkout():
    """Place an order from the current cart.

    No payment is taken here, by design: orders are settled with the shop
    directly. No payment provider is integrated and no card details are
    collected or stored anywhere in this codebase.
    """
    cart_items = _load_cart()
    if not cart_items:
        return error('Your cart is empty.')

    data = payload()
    shipping_address = get_str(data, 'shipping_address')
    phone = get_str(data, 'phone')
    notes = get_str(data, 'notes')

    if not shipping_address or not phone:
        return error('Shipping address and phone number are required.')
    if len(phone) > 15:
        return error('Please enter a valid phone number.')

    _lock_cart_products(cart_items)

    # Re-check availability at the moment of purchase - stock may have moved
    # since the item was added to the cart. The rows are locked above, so the
    # values read here still hold when they are decremented below.
    for item in cart_items:
        product = item.product
        if not product or not product.is_active:
            return error(f'"{product.name if product else "An item"}" is no longer available. Please remove it from your cart.')
        if not product.is_made_to_order and item.quantity > product.stock:
            return error(f'Only {product.stock} of "{product.name}" remain in stock.')

    total = sum(item.product.price * item.quantity for item in cart_items)

    order = Order(
        user_id=current_user.id,
        total_amount=total,
        shipping_address=shipping_address,
        phone=phone,
        notes=notes,
    )
    order.set_status('pending', note='Order received.')
    db.session.add(order)
    db.session.flush()

    for cart_item in cart_items:
        db.session.add(OrderItem(
            order_id=order.id,
            product_id=cart_item.product_id,
            quantity=cart_item.quantity,
            price=cart_item.product.price,
            measurements=cart_item.measurements,
        ))
        # Stocked goods are decremented; made-to-order stitching stays at 0.
        if not cart_item.product.is_made_to_order:
            cart_item.product.stock -= cart_item.quantity
        db.session.delete(cart_item)

    # Remember the delivery details so the next checkout pre-fills.
    if get_bool(data, 'save_details', default=True):
        current_user.address = shipping_address
        current_user.phone = phone

    db.session.commit()
    return jsonify({
        'message': f'Order #{order.id} placed successfully! We will contact you soon.',
        'order': order.to_dict(),
    }), 201


@cart_bp.route('/orders/<int:order_id>')
@login_required
def order_detail(order_id):
    """A single order belonging to the current user."""
    order = db.session.get(Order, order_id)
    if order is None:
        return error('Order not found.', 404)
    if order.user_id != current_user.id:
        return error('Access denied.', 403)
    return jsonify({'order': order.to_dict()})


@cart_bp.route('/orders/<int:order_id>/cancel', methods=['POST'])
@login_required
def cancel_order(order_id):
    """Cancel an order that hasn't gone into stitching yet."""
    order = db.session.get(Order, order_id)
    if order is None:
        return error('Order not found.', 404)
    if order.user_id != current_user.id:
        return error('Access denied.', 403)
    if not order.can_cancel:
        return error(f'An order that is already "{order.status}" cannot be cancelled. Please call the shop.')

    reason = get_str(payload(), 'reason')
    order.cancel_reason = reason or None
    order.set_status('cancelled', note=reason or 'Cancelled by customer.')

    # Put reserved stock back on the shelf. `Product.stock + n` is evaluated by
    # the database rather than in Python, so a concurrent checkout decrementing
    # the same row cannot clobber the increment.
    for item in order.items:
        if item.product and not item.product.is_made_to_order:
            item.product.stock = Product.stock + item.quantity

    db.session.commit()
    return jsonify({'message': f'Order #{order.id} has been cancelled.', 'order': order.to_dict()})


@cart_bp.route('/orders/<int:order_id>/reorder', methods=['POST'])
@login_required
def reorder(order_id):
    """Copy a past order's items back into the cart."""
    order = db.session.get(Order, order_id)
    if order is None:
        return error('Order not found.', 404)
    if order.user_id != current_user.id:
        return error('Access denied.', 403)

    added, skipped = 0, 0
    for item in order.items:
        product = item.product
        if not product or not product.is_active:
            skipped += 1
            continue
        if not product.is_made_to_order and product.stock < item.quantity:
            skipped += 1
            continue

        existing = CartItem.query.filter_by(user_id=current_user.id, product_id=product.id).first()
        if existing:
            existing.quantity = min(MAX_QTY_PER_ITEM, existing.quantity + item.quantity)
        else:
            db.session.add(CartItem(
                user_id=current_user.id,
                product_id=product.id,
                quantity=min(MAX_QTY_PER_ITEM, item.quantity),
                measurements=item.measurements,
            ))
        added += 1

    db.session.commit()
    if not added:
        return error('None of the items from that order are available right now.')

    message = f'{added} item(s) added back to your cart.'
    if skipped:
        message += f' {skipped} item(s) were unavailable and skipped.'
    return jsonify({'message': message})


@cart_bp.route('/orders')
@login_required
def my_orders():
    """All orders for the current user."""
    orders = (Order.query.filter_by(user_id=current_user.id)
              .order_by(Order.created_at.desc()).all())
    return jsonify({'orders': [o.to_dict() for o in orders]})
