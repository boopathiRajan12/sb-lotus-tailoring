"""Public shop endpoints, reviews, and the app-level hardening in app.py/config.py."""
import pytest
from sqlalchemy import event

from conftest import make_product
from models import Product, Review, db


# ─── Shop ────────────────────────────────────────────────────────────────────

def test_home_feed_is_public(client, product):
    data = client.get('/api/home').get_json()
    assert data['stats']['products'] == 1
    assert len(data['products']) == 1


def test_inactive_products_are_hidden_from_the_shop(client, app, category):
    make_product(category, name='Retired', is_active=False)
    assert client.get('/api/products').get_json()['pagination']['total'] == 0


def test_product_search_matches_description(client, app, category):
    make_product(category, name='Blouse', description='Soft cotton lining')
    assert len(client.get('/api/products?q=cotton').get_json()['products']) == 1


def test_product_list_pagination(client, app, category):
    for n in range(15):
        make_product(category, name=f'Item {n}')
    data = client.get('/api/products').get_json()
    assert len(data['products']) == 12         # PRODUCTS_PER_PAGE
    assert data['pagination']['pages'] == 2


def test_unknown_sort_falls_back_instead_of_erroring(client, product):
    assert client.get('/api/products?sort=;DROP TABLE').status_code == 200


def test_missing_product_returns_json_404(client):
    response = client.get('/api/products/9999')
    assert response.status_code == 404
    assert response.get_json()['error']


# ─── Reviews ─────────────────────────────────────────────────────────────────

def test_review_updates_the_denormalised_rating(auth_client, app, product):
    auth_client.post('/api/reviews', json={'product_id': product.id, 'rating': 4})
    refreshed = db.session.get(Product, product.id)
    assert refreshed.rating_count == 1
    assert refreshed.rating_avg == 4.0


def test_second_review_by_the_same_user_updates_rather_than_duplicates(auth_client, app, product):
    auth_client.post('/api/reviews', json={'product_id': product.id, 'rating': 4})
    auth_client.post('/api/reviews', json={'product_id': product.id, 'rating': 2})
    assert Review.query.count() == 1
    assert db.session.get(Product, product.id).rating_avg == 2.0


def test_review_rating_must_be_in_range(auth_client, product):
    assert auth_client.post('/api/reviews',
                            json={'product_id': product.id, 'rating': 9}).status_code == 400


def test_deleting_a_review_refreshes_the_rating(auth_client, app, product):
    auth_client.post('/api/reviews', json={'product_id': product.id, 'rating': 5})
    review_id = Review.query.one().id
    auth_client.delete(f'/api/reviews/{review_id}')
    assert db.session.get(Product, product.id).rating_count == 0


# ─── Hardening ───────────────────────────────────────────────────────────────

def test_health_endpoint_reports_database_reachability(client):
    body = client.get('/api/health').get_json()
    assert body == {'status': 'ok', 'database': 'ok'}


def test_security_headers_are_present(client):
    headers = client.get('/api/home').headers
    assert headers['X-Content-Type-Options'] == 'nosniff'
    assert headers['X-Frame-Options'] == 'DENY'
    assert "frame-ancestors 'none'" in headers['Content-Security-Policy']


def test_hsts_is_absent_without_secure_cookies(client, app):
    """HSTS on a plain-HTTP dev server would poison the browser for localhost."""
    assert app.config['SESSION_COOKIE_SECURE'] is False
    assert 'Strict-Transport-Security' not in client.get('/api/home').headers


def test_session_cookie_hardening_is_configured(app):
    assert app.config['SESSION_COOKIE_HTTPONLY'] is True
    assert app.config['SESSION_COOKIE_SAMESITE'] == 'Lax'
    # The remember-me cookie carries the same authority as the session and must
    # be hardened to match; Flask-Login's defaults do not do this.
    assert app.config['REMEMBER_COOKIE_HTTPONLY'] is True
    assert app.config['REMEMBER_COOKIE_SAMESITE'] == 'Lax'
    assert app.config['REMEMBER_COOKIE_SECURE'] == app.config['SESSION_COOKIE_SECURE']


def test_production_refuses_a_default_secret_key(monkeypatch):
    import importlib
    import config as config_module

    monkeypatch.setenv('PRODUCTION', 'true')
    monkeypatch.setenv('SECRET_KEY', 'sb-lotus-tailoring-secret-key-change-in-production')
    with pytest.raises(RuntimeError, match='SECRET_KEY'):
        importlib.reload(config_module)

    # Leave the module as the rest of the suite expects it.
    monkeypatch.setenv('PRODUCTION', 'false')
    monkeypatch.setenv('SECRET_KEY', 'test-secret-key-not-used-anywhere-real')
    importlib.reload(config_module)


def test_no_admin_is_created_without_an_explicit_password(app, monkeypatch):
    from app import _create_default_admin
    from models import User

    monkeypatch.delenv('ADMIN_PASSWORD', raising=False)
    User.query.delete()
    db.session.commit()

    _create_default_admin()
    assert User.query.filter_by(is_admin=True).count() == 0


def test_admin_is_created_from_a_strong_password(app, monkeypatch):
    from app import _create_default_admin
    from models import User

    monkeypatch.setenv('ADMIN_PASSWORD', 'a-properly-long-password')
    User.query.delete()
    db.session.commit()

    _create_default_admin()
    admin = User.query.filter_by(is_admin=True).one()
    assert admin.check_password('a-properly-long-password')


def test_listing_products_does_not_load_image_blobs(app, client, category):
    """The blob column is deferred; a listing that loads it costs tens of MB."""
    from models import ProductImage

    product = make_product(category, name='With Image')
    db.session.add(ProductImage(product_id=product.id, image_path='x.png',
                                image_data=b'0' * 1024, image_mimetype='image/png'))
    db.session.commit()
    db.session.expunge_all()

    selected = []
    engine = db.session.get_bind()

    @event.listens_for(engine, 'before_cursor_execute')
    def record(conn, cursor, statement, params, context, executemany):
        selected.append(statement)

    try:
        assert client.get('/api/products').status_code == 200
    finally:
        event.remove(engine, 'before_cursor_execute', record)

    assert not any('image_data' in statement for statement in selected), \
        'product listing should not select product_images.image_data'
