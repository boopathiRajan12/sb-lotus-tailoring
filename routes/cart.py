"""
Cart and checkout API.
Handles add/remove/update cart items and order placement.
"""
import json
from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from models import db, Product, CartItem, Order, OrderItem

cart_bp = Blueprint('cart', __name__, url_prefix='/api')


@cart_bp.route('/cart')
@login_required
def view_cart():
    """The current user's shopping cart."""
    cart_items = CartItem.query.filter_by(user_id=current_user.id).all()
    total = sum(item.product.price * item.quantity for item in cart_items)
    return jsonify({
        'cart_items': [item.to_dict() for item in cart_items],
        'total': total,
    })


@cart_bp.route('/cart/items', methods=['POST'])
@login_required
def add_to_cart():
    """Add a product to the cart (or increment quantity if already present)."""
    data = request.get_json(silent=True)
    if data is None:
        data = request.form
    product_id = int(data.get('product_id'))
    product = Product.query.get_or_404(product_id)
    quantity = int(data.get('quantity', 1) or 1)
    measurements = data.get('measurements')
    if isinstance(measurements, dict):
        measurements = json.dumps(measurements)
    measurements = (measurements or '').strip() if isinstance(measurements, str) else measurements

    existing = CartItem.query.filter_by(user_id=current_user.id, product_id=product_id).first()
    if existing:
        existing.quantity += quantity
        if measurements:
            existing.measurements = measurements
    else:
        cart_item = CartItem(
            user_id=current_user.id,
            product_id=product_id,
            quantity=quantity,
            measurements=measurements if measurements else None
        )
        db.session.add(cart_item)

    db.session.commit()
    return jsonify({'message': f'"{product.name}" added to cart!'}), 201


@cart_bp.route('/cart/items/<int:item_id>', methods=['PUT'])
@login_required
def update_cart(item_id):
    """Update the quantity of a cart item."""
    cart_item = CartItem.query.get_or_404(item_id)

    if cart_item.user_id != current_user.id:
        return jsonify({'error': 'Access denied.'}), 403

    data = request.get_json(silent=True) or request.form
    quantity = int(data.get('quantity', 1) or 1)
    if quantity < 1:
        db.session.delete(cart_item)
        db.session.commit()
        return jsonify({'message': 'Item removed from cart.'})

    cart_item.quantity = quantity
    db.session.commit()
    return jsonify({'message': 'Cart updated.', 'cart_item': cart_item.to_dict()})


@cart_bp.route('/cart/items/<int:item_id>', methods=['DELETE'])
@login_required
def remove_from_cart(item_id):
    """Remove an item from the cart."""
    cart_item = CartItem.query.get_or_404(item_id)

    if cart_item.user_id != current_user.id:
        return jsonify({'error': 'Access denied.'}), 403

    db.session.delete(cart_item)
    db.session.commit()
    return jsonify({'message': 'Item removed from cart.'})


@cart_bp.route('/checkout', methods=['GET'])
@login_required
def checkout_summary():
    """Cart items + total for the checkout review screen."""
    cart_items = CartItem.query.filter_by(user_id=current_user.id).all()
    total = sum(item.product.price * item.quantity for item in cart_items)
    return jsonify({
        'cart_items': [item.to_dict() for item in cart_items],
        'total': total,
    })


@cart_bp.route('/checkout', methods=['POST'])
@login_required
def checkout():
    """Place an order from the current cart."""
    cart_items = CartItem.query.filter_by(user_id=current_user.id).all()

    if not cart_items:
        return jsonify({'error': 'Your cart is empty.'}), 400

    data = request.get_json(silent=True) or request.form
    shipping_address = (data.get('shipping_address') or '').strip()
    phone = (data.get('phone') or '').strip()
    notes = (data.get('notes') or '').strip()

    if not shipping_address or not phone:
        return jsonify({'error': 'Shipping address and phone number are required.'}), 400

    total = sum(item.product.price * item.quantity for item in cart_items)

    order = Order(
        user_id=current_user.id,
        total_amount=total,
        shipping_address=shipping_address,
        phone=phone,
        notes=notes
    )
    db.session.add(order)
    db.session.flush()

    for cart_item in cart_items:
        order_item = OrderItem(
            order_id=order.id,
            product_id=cart_item.product_id,
            quantity=cart_item.quantity,
            price=cart_item.product.price,
            measurements=cart_item.measurements
        )
        db.session.add(order_item)
        db.session.delete(cart_item)

    db.session.commit()
    return jsonify({
        'message': f'Order #{order.id} placed successfully! We will contact you soon.',
        'order': order.to_dict(),
    }), 201


@cart_bp.route('/orders/<int:order_id>')
@login_required
def order_detail(order_id):
    """A single order belonging to the current user."""
    order = Order.query.get_or_404(order_id)
    if order.user_id != current_user.id:
        return jsonify({'error': 'Access denied.'}), 403
    return jsonify({'order': order.to_dict()})


@cart_bp.route('/orders')
@login_required
def my_orders():
    """All orders for the current user."""
    orders = Order.query.filter_by(user_id=current_user.id).order_by(Order.created_at.desc()).all()
    return jsonify({'orders': [o.to_dict() for o in orders]})
