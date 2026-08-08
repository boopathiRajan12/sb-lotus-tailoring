"""Admin authorisation, order workflow, uploads, and pagination."""
import io

from conftest import make_product, make_user
from models import Order, Product, ProductImage, db
from routes.admin import ADMIN_PER_PAGE


ADMIN_ENDPOINTS = [
    '/api/admin/dashboard',
    '/api/admin/products',
    '/api/admin/categories',
    '/api/admin/orders',
    '/api/admin/users',
    '/api/admin/reviews',
]


def test_admin_endpoints_reject_anonymous(client):
    for path in ADMIN_ENDPOINTS:
        assert client.get(path).status_code == 401, path


def test_admin_endpoints_reject_ordinary_customers(auth_client):
    for path in ADMIN_ENDPOINTS:
        assert auth_client.get(path).status_code == 403, path


def test_admin_can_reach_the_dashboard(admin_client):
    assert admin_client.get('/api/admin/dashboard').status_code == 200


# ─── Order workflow ──────────────────────────────────────────────────────────

def place_order(app, product, username='customer'):
    """Create a delivered-path order directly, without going through the API."""
    user = make_user(username=username) if username != 'customer' else None
    from models import Order, OrderItem, User
    owner = user or User.query.filter_by(username='customer').first()
    order = Order(user_id=owner.id, total_amount=product.price, shipping_address='x', phone='1')
    order.set_status('pending')
    db.session.add(order)
    db.session.flush()
    db.session.add(OrderItem(order_id=order.id, product_id=product.id,
                             quantity=1, price=product.price))
    product.stock -= 1
    db.session.commit()
    return order


def test_status_update_appends_to_the_timeline(admin_client, app, product, user):
    order = place_order(app, product)
    response = admin_client.put(f'/api/admin/orders/{order.id}/status',
                                json={'status': 'confirmed', 'note': 'Fabric received'})
    assert response.status_code == 200

    refreshed = db.session.get(Order, order.id)
    assert refreshed.status == 'confirmed'
    assert [h.status for h in refreshed.history] == ['pending', 'confirmed']


def test_status_update_rejects_an_unknown_status(admin_client, app, product, user):
    order = place_order(app, product)
    assert admin_client.put(f'/api/admin/orders/{order.id}/status',
                            json={'status': 'teleported'}).status_code == 400


def test_admin_cancel_restores_stock(admin_client, app, product, user):
    order = place_order(app, product)
    stock_after_order = db.session.get(Product, product.id).stock

    admin_client.put(f'/api/admin/orders/{order.id}/status', json={'status': 'cancelled'})
    assert db.session.get(Product, product.id).stock == stock_after_order + 1


def test_reinstating_a_cancelled_order_takes_stock_back(admin_client, app, product, user):
    order = place_order(app, product)
    stock_after_order = db.session.get(Product, product.id).stock

    admin_client.put(f'/api/admin/orders/{order.id}/status', json={'status': 'cancelled'})
    admin_client.put(f'/api/admin/orders/{order.id}/status', json={'status': 'confirmed'})
    assert db.session.get(Product, product.id).stock == stock_after_order


def test_stock_restore_never_goes_negative(admin_client, app, category, user):
    scarce = make_product(category, name='Last One', stock=1)
    order = place_order(app, scarce)          # stock now 0
    admin_client.put(f'/api/admin/orders/{order.id}/status', json={'status': 'cancelled'})

    scarce_row = db.session.get(Product, scarce.id)
    scarce_row.stock = 0                       # someone zeroes it by hand
    db.session.commit()

    admin_client.put(f'/api/admin/orders/{order.id}/status', json={'status': 'confirmed'})
    assert db.session.get(Product, scarce.id).stock == 0


# ─── Products ────────────────────────────────────────────────────────────────

def test_delete_is_refused_for_a_product_with_order_history(admin_client, app, product, user):
    place_order(app, product)
    response = admin_client.delete(f'/api/admin/products/{product.id}')
    assert response.status_code == 400
    assert 'past orders' in response.get_json()['error']


def test_toggle_flips_visibility(admin_client, app, product):
    admin_client.put(f'/api/admin/products/{product.id}/toggle')
    assert db.session.get(Product, product.id).is_active is False


def test_upload_mimetype_comes_from_the_extension_not_the_header(admin_client, app, category):
    """A browser-supplied Content-Type must never be echoed back by the image route."""
    response = admin_client.post('/api/admin/products', data={
        'name': 'Uploaded', 'price': '100', 'category_id': str(category.id), 'stock': '1',
        'images': (io.BytesIO(b'\x89PNG\r\n\x1a\nfake'), 'evil.png', 'text/html'),
    }, content_type='multipart/form-data')
    assert response.status_code == 201

    image = ProductImage.query.one()
    assert image.image_mimetype == 'image/png'

    served = admin_client.get(f'/product-image/{image.id}')
    assert served.status_code == 200
    assert served.headers['Content-Type'].startswith('image/png')


def test_disallowed_extensions_are_skipped(admin_client, app, category):
    response = admin_client.post('/api/admin/products', data={
        'name': 'Uploaded', 'price': '100', 'category_id': str(category.id), 'stock': '1',
        'images': (io.BytesIO(b'<svg/onload=alert(1)>'), 'evil.svg', 'image/svg+xml'),
    }, content_type='multipart/form-data')
    assert response.status_code == 201
    assert ProductImage.query.count() == 0
    assert 'skipped' in response.get_json()['message']


# ─── Pagination ──────────────────────────────────────────────────────────────

def test_product_list_is_paginated(admin_client, app, category):
    for n in range(ADMIN_PER_PAGE + 5):
        make_product(category, name=f'Product {n}')

    first = admin_client.get('/api/admin/products').get_json()
    assert len(first['products']) == ADMIN_PER_PAGE
    assert first['total'] == ADMIN_PER_PAGE + 5
    assert first['pagination']['pages'] == 2

    second = admin_client.get('/api/admin/products?page=2').get_json()
    assert len(second['products']) == 5


def test_order_revenue_covers_the_whole_filtered_set_not_just_the_page(
    admin_client, app, category, user
):
    product = make_product(category, name='Bulk', price=100.0, stock=200)
    for n in range(ADMIN_PER_PAGE + 3):
        place_order(app, product)

    data = admin_client.get('/api/admin/orders').get_json()
    assert len(data['orders']) == ADMIN_PER_PAGE
    assert data['total'] == ADMIN_PER_PAGE + 3
    # Revenue is summed in SQL over every matching order, not the visible page.
    assert data['filtered_revenue'] == 100.0 * (ADMIN_PER_PAGE + 3)
