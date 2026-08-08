"""
Shared pytest fixtures.

The suite runs against in-memory SQLite, not Supabase: tests must be
destructive, isolated and fast, and none of those are true of the production
database. The application code is dialect-agnostic apart from the startup
bootstrap in app.py, which already branches on the dialect.

`SUPABASE_DB_URL` is set before `config` is imported, because Config resolves
the database URL at class-definition time.
"""
import os

os.environ.setdefault('SUPABASE_DB_URL', 'sqlite://')
os.environ.setdefault('SECRET_KEY', 'test-secret-key-not-used-anywhere-real')
# Guarantee the production guards stay off no matter what the developer's shell
# happens to export.
os.environ.pop('RENDER', None)
os.environ['PRODUCTION'] = 'false'

import pytest  # noqa: E402
from flask import g  # noqa: E402
from flask.testing import FlaskClient  # noqa: E402

import routes.auth as auth_module  # noqa: E402
from app import _migrate_db, create_app  # noqa: E402
from models import db, Category, Product, User  # noqa: E402


class IsolatedClient(FlaskClient):
    """Test client that doesn't inherit the previous request's identity.

    These tests run inside a pushed application context so they can use the ORM
    directly. Flask reuses an already-pushed context rather than creating one
    per request, and Flask-Login caches the resolved user on `g` - so without
    this, one client's login would leak into every later request, including
    other clients'. In production each request gets a fresh context and the
    cache is correct; this only papers over the fixture's own shortcut.
    """

    def open(self, *args, **kwargs):
        g.pop('_login_user', None)
        return super().open(*args, **kwargs)


@pytest.fixture
def app():
    """A fresh application with an empty schema for every test."""
    application = create_app()
    application.config.update(TESTING=True)
    application.test_client_class = IsolatedClient

    with application.app_context():
        db.drop_all()
        db.create_all()
        # create_all() builds tables from the models, which cannot express the
        # functional unique indexes; _migrate_db adds them, exactly as it does
        # at startup. Tests assert on them, so they must exist here too.
        _migrate_db()

        # The login throttle is module-level state, so it survives between
        # tests and would otherwise make them order-dependent.
        auth_module._login_attempts.clear()

        yield application
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


# ─── Data helpers ────────────────────────────────────────────────────────────

@pytest.fixture
def category(app):
    row = Category(name='Blouse', description='Blouse stitching')
    db.session.add(row)
    db.session.commit()
    return row


def make_user(username='customer', password='secret123', is_admin=False, **kwargs):
    user = User(
        username=username,
        email=kwargs.pop('email', f'{username}@example.com'),
        is_admin=is_admin,
        **kwargs,
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return user


def make_product(category, name='Silk Blouse', price=500.0, stock=5, **kwargs):
    product = Product(name=name, price=price, stock=stock, category_id=category.id, **kwargs)
    db.session.add(product)
    db.session.commit()
    return product


@pytest.fixture
def user(app):
    return make_user()


@pytest.fixture
def admin(app):
    return make_user(username='boss', password='secret123', is_admin=True)


@pytest.fixture
def product(app, category):
    return make_product(category)


def login(client, username='customer', password='secret123'):
    return client.post('/api/auth/login', json={'username': username, 'password': password})


@pytest.fixture
def auth_client(client, user):
    login(client)
    return client


@pytest.fixture
def admin_client(client, admin):
    login(client, username='boss')
    return client
