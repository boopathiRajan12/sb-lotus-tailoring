"""
Small shared helpers for the API blueprints: request parsing that never raises,
measurement sanitising, and the admin-only decorator.
"""
import json
import re
from functools import wraps

from flask import jsonify, request
from flask_login import current_user, login_required

from models import MEASUREMENT_KEYS

EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$')
PHONE_RE = re.compile(r'^[0-9+\-\s()]{6,15}$')


def payload():
    """Request body as a dict, accepting either JSON or form encoding."""
    data = request.get_json(silent=True)
    if data is None:
        data = request.form
    return data if hasattr(data, 'get') else {}


def get_str(data, key, default=''):
    value = data.get(key, default)
    return value.strip() if isinstance(value, str) else default


def get_int(data, key, default=None, minimum=None, maximum=None):
    """Parse an int without raising; out-of-range values are clamped."""
    raw = data.get(key, None)
    if raw is None or raw == '':
        return default
    try:
        value = int(float(raw))
    except (TypeError, ValueError):
        return default
    if minimum is not None:
        value = max(minimum, value)
    if maximum is not None:
        value = min(maximum, value)
    return value


def get_float(data, key, default=None, minimum=None):
    raw = data.get(key, None)
    if raw is None or raw == '':
        return default
    try:
        value = float(raw)
    except (TypeError, ValueError):
        return default
    if minimum is not None and value < minimum:
        return default
    return value


def get_bool(data, key, default=False):
    raw = data.get(key, None)
    if raw is None:
        return default
    if isinstance(raw, bool):
        return raw
    return str(raw).strip().lower() in ('on', 'true', '1', 'yes')


def error(message, status=400):
    return jsonify({'error': message}), status


def clean_measurements(raw):
    """Normalise a measurements payload to a JSON string, or None if empty.

    Accepts either a dict or an already-encoded JSON string, keeps only known
    keys, and caps values so a stray paste can't bloat the column.
    """
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return None
    if not isinstance(raw, dict):
        return None

    cleaned = {}
    for key in MEASUREMENT_KEYS:
        value = raw.get(key)
        if value is None:
            continue
        value = str(value).strip()[:20]
        if value:
            cleaned[key] = value
    return json.dumps(cleaned) if cleaned else None


def admin_required(f):
    """Ensure the current user is a logged-in admin."""
    @wraps(f)
    @login_required
    def decorated_function(*args, **kwargs):
        if not current_user.is_admin:
            return jsonify({'error': 'Access denied. Admin only.'}), 403
        return f(*args, **kwargs)
    return decorated_function
