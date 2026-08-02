"""
Authentication API - handles user registration, login, logout, and profile.
Both regular users and admins use the same login endpoint.
Admin accounts are identified by the is_admin flag.
"""
import json
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request
from flask_login import login_user, logout_user, login_required, current_user
from sqlalchemy import func

from models import db, User, Order
from .helpers import payload, get_str, get_bool, error, clean_measurements, EMAIL_RE, PHONE_RE

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

MIN_PASSWORD_LENGTH = 6
# Simple in-process throttle. Enough to blunt credential stuffing on a
# single-instance deployment; swap for Redis if the app is ever scaled out.
MAX_LOGIN_ATTEMPTS = 8
LOCKOUT_WINDOW = timedelta(minutes=10)
_login_attempts = {}


def _throttle_key():
    return request.headers.get('X-Forwarded-For', request.remote_addr or 'unknown').split(',')[0].strip()


def _is_locked_out(key):
    attempts, first_seen = _login_attempts.get(key, (0, datetime.utcnow()))
    if datetime.utcnow() - first_seen > LOCKOUT_WINDOW:
        _login_attempts.pop(key, None)
        return False
    return attempts >= MAX_LOGIN_ATTEMPTS


def _record_failure(key):
    attempts, first_seen = _login_attempts.get(key, (0, datetime.utcnow()))
    if datetime.utcnow() - first_seen > LOCKOUT_WINDOW:
        attempts, first_seen = 0, datetime.utcnow()
    _login_attempts[key] = (attempts + 1, first_seen)


def _validate_password(password, confirm):
    if len(password) < MIN_PASSWORD_LENGTH:
        return f'Password must be at least {MIN_PASSWORD_LENGTH} characters.'
    if confirm is not None and password != confirm:
        return 'Passwords do not match.'
    return None


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user account."""
    if current_user.is_authenticated:
        return error('Already logged in.')

    data = payload()
    username = get_str(data, 'username')
    email = get_str(data, 'email').lower()
    password = data.get('password') or ''
    confirm_password = data.get('confirm_password')
    phone = get_str(data, 'phone')
    address = get_str(data, 'address')

    if not username or not email or not password:
        return error('Username, email, and password are required.')
    if len(username) < 3 or len(username) > 80:
        return error('Username must be between 3 and 80 characters.')
    if not EMAIL_RE.match(email):
        return error('Please enter a valid email address.')
    if phone and not PHONE_RE.match(phone):
        return error('Please enter a valid phone number.')

    password_problem = _validate_password(password, confirm_password)
    if password_problem:
        return error(password_problem)

    # Case-insensitive uniqueness so "Priya" and "priya" can't both exist.
    if User.query.filter(func.lower(User.username) == username.lower()).first():
        return error('Username already exists.')
    if User.query.filter(func.lower(User.email) == email).first():
        return error('Email already registered.')

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

    key = _throttle_key()
    if _is_locked_out(key):
        return error('Too many failed attempts. Please try again in a few minutes.', 429)

    data = payload()
    username = get_str(data, 'username')
    password = data.get('password') or ''
    remember = get_bool(data, 'remember', default=True)

    # Accept either the username or the email address as the identifier.
    user = User.query.filter(
        (func.lower(User.username) == username.lower()) |
        (func.lower(User.email) == username.lower())
    ).first()

    if user and user.check_password(password):
        if not user.is_active_account:
            return error('This account has been suspended. Please contact the shop.', 403)
        _login_attempts.pop(key, None)
        login_user(user, remember=remember)
        return jsonify({'message': f'Welcome back, {user.username}!', 'user': user.to_dict()})

    _record_failure(key)
    return error('Invalid username or password.', 401)


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
    user_orders = (Order.query.filter_by(user_id=current_user.id)
                   .order_by(Order.created_at.desc()).all())
    # Cancelled orders shouldn't count toward lifetime spend.
    billable = [o for o in user_orders if o.status != 'cancelled']
    return jsonify({
        'user': current_user.to_dict(),
        'orders': [o.to_dict() for o in user_orders],
        'total_spent': sum(o.total_amount for o in billable),
        'order_count': len(user_orders),
        'active_orders': sum(1 for o in user_orders if o.status not in ('delivered', 'cancelled')),
    })


@auth_bp.route('/profile', methods=['PUT'])
@login_required
def edit_profile():
    """Update user profile details."""
    data = payload()
    email = get_str(data, 'email').lower()
    phone = get_str(data, 'phone')
    address = get_str(data, 'address')

    if email and email != current_user.email:
        if not EMAIL_RE.match(email):
            return error('Please enter a valid email address.')
        if User.query.filter(func.lower(User.email) == email, User.id != current_user.id).first():
            return error('Email already in use by another account.')
        current_user.email = email

    if phone and not PHONE_RE.match(phone):
        return error('Please enter a valid phone number.')

    current_user.phone = phone
    current_user.address = address
    db.session.commit()
    return jsonify({'message': 'Profile updated successfully!', 'user': current_user.to_dict()})


@auth_bp.route('/password', methods=['PUT'])
@login_required
def change_password():
    """Change the current user's password."""
    data = payload()
    current_password = data.get('current_password') or ''
    new_password = data.get('new_password') or ''
    confirm_password = data.get('confirm_password')

    if not current_user.check_password(current_password):
        return error('Your current password is incorrect.')

    problem = _validate_password(new_password, confirm_password)
    if problem:
        return error(problem)
    if new_password == current_password:
        return error('The new password must be different from the current one.')

    current_user.set_password(new_password)
    db.session.commit()
    return jsonify({'message': 'Password changed successfully.'})


@auth_bp.route('/measurements', methods=['PUT'])
@login_required
def save_measurements():
    """Save the customer's default body measurements for future orders."""
    cleaned = clean_measurements(payload().get('measurements'))
    current_user.measurements = cleaned
    db.session.commit()
    return jsonify({
        'message': 'Measurements saved.' if cleaned else 'Measurements cleared.',
        'measurements': json.loads(cleaned) if cleaned else {},
        'user': current_user.to_dict(),
    })
