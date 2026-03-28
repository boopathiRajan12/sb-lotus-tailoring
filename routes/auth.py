"""
Authentication routes - handles user registration, login, logout, and profile.
Both regular users and admins use the same login page.
Admin accounts are identified by the is_admin flag.
"""
from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_user, logout_user, login_required, current_user
from models import db, User, Order

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    """Register a new user account."""
    if current_user.is_authenticated:
        return redirect(url_for('shop.home'))

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')
        phone = request.form.get('phone', '').strip()
        address = request.form.get('address', '').strip()

        # Validation
        if not username or not email or not password:
            flash('Username, email, and password are required.', 'danger')
            return render_template('auth/register.html')

        if password != confirm_password:
            flash('Passwords do not match.', 'danger')
            return render_template('auth/register.html')

        if len(password) < 6:
            flash('Password must be at least 6 characters.', 'danger')
            return render_template('auth/register.html')

        if User.query.filter_by(username=username).first():
            flash('Username already exists.', 'danger')
            return render_template('auth/register.html')

        if User.query.filter_by(email=email).first():
            flash('Email already registered.', 'danger')
            return render_template('auth/register.html')

        # Create user
        user = User(username=username, email=email, phone=phone, address=address)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        flash('Registration successful! Please log in.', 'success')
        return redirect(url_for('auth.login'))

    return render_template('auth/register.html')


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """Log in an existing user or admin."""
    if current_user.is_authenticated:
        if current_user.is_admin:
            return redirect(url_for('admin.dashboard'))
        return redirect(url_for('shop.home'))

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')

        user = User.query.filter_by(username=username).first()

        if user and user.check_password(password):
            login_user(user)
            flash(f'Welcome back, {user.username}!', 'success')
            # Redirect admin to dashboard, regular users to home
            if user.is_admin:
                return redirect(url_for('admin.dashboard'))
            next_page = request.args.get('next')
            return redirect(next_page or url_for('shop.home'))
        else:
            flash('Invalid username or password.', 'danger')

    return render_template('auth/login.html')


@auth_bp.route('/profile')
@login_required
def profile():
    """View user profile with order summary."""
    user_orders = Order.query.filter_by(user_id=current_user.id)\
        .order_by(Order.created_at.desc()).all()
    total_spent = sum(o.total_amount for o in user_orders)
    return render_template('user/profile.html',
                           user_orders=user_orders,
                           total_spent=total_spent)


@auth_bp.route('/profile/edit', methods=['POST'])
@login_required
def edit_profile():
    """Update user profile details."""
    email = request.form.get('email', '').strip()
    phone = request.form.get('phone', '').strip()
    address = request.form.get('address', '').strip()

    # Check email uniqueness (if changed)
    if email and email != current_user.email:
        existing = User.query.filter_by(email=email).first()
        if existing:
            flash('Email already in use by another account.', 'danger')
            return redirect(url_for('auth.profile'))
        current_user.email = email

    current_user.phone = phone
    current_user.address = address
    db.session.commit()
    flash('Profile updated successfully!', 'success')
    return redirect(url_for('auth.profile'))


@auth_bp.route('/logout')
@login_required
def logout():
    """Log out the current user."""
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('shop.home'))
