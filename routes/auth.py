"""
Authentication API - handles user registration, login, logout, and profile.
Both regular users and admins use the same login endpoint.
Admin accounts are identified by the is_admin flag.
"""
from flask import Blueprint, jsonify, request
from flask_login import login_user, logout_user, login_required, current_user
from models import db, User, Order

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user account."""
    if current_user.is_authenticated:
        return jsonify({'error': 'Already logged in.'}), 400

    data = request.get_json(silent=True) or request.form
    username = (data.get('username') or '').strip()
    email = (data.get('email') or '').strip()
    password = data.get('password') or ''
    confirm_password = data.get('confirm_password') or ''
    phone = (data.get('phone') or '').strip()
    address = (data.get('address') or '').strip()

    if not username or not email or not password:
        return jsonify({'error': 'Username, email, and password are required.'}), 400

    if password != confirm_password:
        return jsonify({'error': 'Passwords do not match.'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters.'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists.'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered.'}), 400

    user = User(username=username, email=email, phone=phone, address=address)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return jsonify({'message': 'Registration successful! Please log in.'}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """Log in an existing user or admin."""
    if current_user.is_authenticated:
        return jsonify({'message': 'Already logged in.', 'user': current_user.to_dict()})

    data = request.get_json(silent=True) or request.form
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''

    user = User.query.filter_by(username=username).first()

    if user and user.check_password(password):
        login_user(user)
        return jsonify({'message': f'Welcome back, {user.username}!', 'user': user.to_dict()})

    return jsonify({'error': 'Invalid username or password.'}), 401


@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """Log out the current user."""
    logout_user()
    return jsonify({'message': 'You have been logged out.'})


@auth_bp.route('/me')
def me():
    """Return the current user, or null if not authenticated."""
    if current_user.is_authenticated:
        return jsonify({'user': current_user.to_dict()})
    return jsonify({'user': None})


@auth_bp.route('/profile')
@login_required
def profile():
    """Current user's order summary."""
    user_orders = Order.query.filter_by(user_id=current_user.id)\
        .order_by(Order.created_at.desc()).all()
    total_spent = sum(o.total_amount for o in user_orders)
    return jsonify({
        'user': current_user.to_dict(),
        'orders': [o.to_dict() for o in user_orders],
        'total_spent': total_spent,
    })


@auth_bp.route('/profile', methods=['PUT'])
@login_required
def edit_profile():
    """Update user profile details."""
    data = request.get_json(silent=True) or request.form
    email = (data.get('email') or '').strip()
    phone = (data.get('phone') or '').strip()
    address = (data.get('address') or '').strip()

    if email and email != current_user.email:
        existing = User.query.filter_by(email=email).first()
        if existing:
            return jsonify({'error': 'Email already in use by another account.'}), 400
        current_user.email = email

    current_user.phone = phone
    current_user.address = address
    db.session.commit()
    return jsonify({'message': 'Profile updated successfully!', 'user': current_user.to_dict()})
