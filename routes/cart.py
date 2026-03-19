"""
Cart and checkout routes.
Handles add/remove/update cart items and order placement.
"""
from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from models import db, Product, CartItem, Order, OrderItem

cart_bp = Blueprint('cart', __name__)


@cart_bp.route('/cart')
@login_required
def view_cart():
    """Display the user's shopping cart."""
    cart_items = CartItem.query.filter_by(user_id=current_user.id).all()
    total = sum(item.product.price * item.quantity for item in cart_items)
    return render_template('user/cart.html', cart_items=cart_items, total=total)


@cart_bp.route('/cart/add/<int:product_id>', methods=['POST'])
@login_required
def add_to_cart(product_id):
    """Add a product to the cart (or increment quantity if already present)."""
    product = Product.query.get_or_404(product_id)
    quantity = int(request.form.get('quantity', 1))
    measurements = request.form.get('measurements', '').strip()

    # Check if this product is already in the cart
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
    flash(f'"{product.name}" added to cart!', 'success')
    return redirect(request.referrer or url_for('shop.product_list'))


@cart_bp.route('/cart/update/<int:item_id>', methods=['POST'])
@login_required
def update_cart(item_id):
    """Update the quantity of a cart item."""
    cart_item = CartItem.query.get_or_404(item_id)

    # Ensure the item belongs to the current user
    if cart_item.user_id != current_user.id:
        flash('Access denied.', 'danger')
        return redirect(url_for('cart.view_cart'))

    quantity = int(request.form.get('quantity', 1))
    if quantity < 1:
        db.session.delete(cart_item)
        flash('Item removed from cart.', 'info')
    else:
        cart_item.quantity = quantity
        flash('Cart updated.', 'success')

    db.session.commit()
    return redirect(url_for('cart.view_cart'))


@cart_bp.route('/cart/remove/<int:item_id>', methods=['POST'])
@login_required
def remove_from_cart(item_id):
    """Remove an item from the cart."""
    cart_item = CartItem.query.get_or_404(item_id)

    if cart_item.user_id != current_user.id:
        flash('Access denied.', 'danger')
        return redirect(url_for('cart.view_cart'))

    db.session.delete(cart_item)
    db.session.commit()
    flash('Item removed from cart.', 'info')
    return redirect(url_for('cart.view_cart'))


@cart_bp.route('/checkout', methods=['GET', 'POST'])
@login_required
def checkout():
    """Checkout page - review order and place it."""
    cart_items = CartItem.query.filter_by(user_id=current_user.id).all()

    if not cart_items:
        flash('Your cart is empty.', 'info')
        return redirect(url_for('shop.product_list'))

    total = sum(item.product.price * item.quantity for item in cart_items)

    if request.method == 'POST':
        shipping_address = request.form.get('shipping_address', '').strip()
        phone = request.form.get('phone', '').strip()
        notes = request.form.get('notes', '').strip()

        if not shipping_address or not phone:
            flash('Shipping address and phone number are required.', 'danger')
            return render_template('user/checkout.html', cart_items=cart_items, total=total)

        # Create the order
        order = Order(
            user_id=current_user.id,
            total_amount=total,
            shipping_address=shipping_address,
            phone=phone,
            notes=notes
        )
        db.session.add(order)
        db.session.flush()

        # Move cart items to order items
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
        flash(f'Order #{order.id} placed successfully! We will contact you soon.', 'success')
        return redirect(url_for('cart.order_confirmation', order_id=order.id))

    return render_template('user/checkout.html', cart_items=cart_items, total=total)


@cart_bp.route('/order-confirmation/<int:order_id>')
@login_required
def order_confirmation(order_id):
    """Order confirmation page."""
    order = Order.query.get_or_404(order_id)
    if order.user_id != current_user.id:
        flash('Access denied.', 'danger')
        return redirect(url_for('shop.home'))
    return render_template('user/order_confirmation.html', order=order)


@cart_bp.route('/my-orders')
@login_required
def my_orders():
    """Show all orders for the current user."""
    orders = Order.query.filter_by(user_id=current_user.id).order_by(Order.created_at.desc()).all()
    return render_template('user/my_orders.html', orders=orders)
