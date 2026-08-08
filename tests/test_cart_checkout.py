"""Cart, checkout, cancellation, and the stock accounting around them."""
from conftest import make_product, make_user
from models import CartItem, Order, Product, db


def add_to_cart(client, product, quantity=1):
    return client.post('/api/cart/items', json={'product_id': product.id, 'quantity': quantity})


def checkout(client, **overrides):
    body = {'shipping_address': '12 Mill Road', 'phone': '9876543210'}
    body.update(overrides)
    return client.post('/api/checkout', json=body)


def test_cart_requires_login(client, product):
    assert add_to_cart(client, product).status_code == 401


def test_add_to_cart_then_view(auth_client, product):
    assert add_to_cart(auth_client, product, 2).status_code == 201
    data = auth_client.get('/api/cart').get_json()
    assert data['item_count'] == 2
    assert data['subtotal'] == product.price * 2


def test_adding_the_same_product_twice_increments_quantity(auth_client, product):
    add_to_cart(auth_client, product, 1)
    add_to_cart(auth_client, product, 2)
    assert auth_client.get('/api/cart').get_json()['item_count'] == 3


def test_cannot_add_more_than_stock(auth_client, product):
    response = add_to_cart(auth_client, product, product.stock + 1)
    assert response.status_code == 400
    assert 'left in stock' in response.get_json()['error']


def test_made_to_order_products_ignore_stock(auth_client, category):
    stitching = make_product(category, name='Custom Blouse', stock=0)
    assert add_to_cart(auth_client, stitching, 3).status_code == 201


def test_cannot_touch_another_users_cart_item(auth_client, client, app, product, category):
    add_to_cart(auth_client, product)
    item_id = CartItem.query.first().id

    make_user(username='intruder')
    other = app.test_client()
    other.post('/api/auth/login', json={'username': 'intruder', 'password': 'secret123'})

    assert other.put(f'/api/cart/items/{item_id}', json={'quantity': 9}).status_code == 403
    assert other.delete(f'/api/cart/items/{item_id}').status_code == 403


def test_checkout_creates_order_and_decrements_stock(auth_client, app, product):
    starting_stock = product.stock
    add_to_cart(auth_client, product, 2)

    response = checkout(auth_client)
    assert response.status_code == 201

    order = Order.query.one()
    assert order.total_amount == product.price * 2
    assert order.status == 'pending'
    assert db.session.get(Product, product.id).stock == starting_stock - 2
    assert CartItem.query.count() == 0, 'cart should be emptied by checkout'


def test_checkout_requires_address_and_phone(auth_client, product):
    add_to_cart(auth_client, product)
    assert checkout(auth_client, shipping_address='').status_code == 400
    assert checkout(auth_client, phone='').status_code == 400


def test_checkout_rejects_an_empty_cart(auth_client):
    assert checkout(auth_client).status_code == 400


def test_checkout_rechecks_stock_that_moved_since_add(auth_client, app, product):
    add_to_cart(auth_client, product, 3)

    # Someone else buys the shelf out in the meantime.
    product.stock = 1
    db.session.commit()

    response = checkout(auth_client)
    assert response.status_code == 400
    assert 'remain in stock' in response.get_json()['error']
    assert Order.query.count() == 0


def test_checkout_records_price_at_time_of_order(auth_client, app, product):
    add_to_cart(auth_client, product)
    checkout(auth_client)

    product.price = 9999.0
    db.session.commit()

    order = Order.query.one()
    assert order.items[0].price == 500.0


def test_checkout_saves_delivery_details_to_the_profile(auth_client, app, product, user):
    add_to_cart(auth_client, product)
    checkout(auth_client)
    assert user.address == '12 Mill Road'
    assert user.phone == '9876543210'


# ─── Cancellation ────────────────────────────────────────────────────────────

def test_cancel_restores_stock(auth_client, app, product):
    starting_stock = product.stock
    add_to_cart(auth_client, product, 2)
    checkout(auth_client)
    order = Order.query.one()

    response = auth_client.post(f'/api/orders/{order.id}/cancel', json={'reason': 'Changed my mind'})
    assert response.status_code == 200
    assert db.session.get(Order, order.id).status == 'cancelled'
    assert db.session.get(Product, product.id).stock == starting_stock


def test_cannot_cancel_once_stitching_has_started(auth_client, app, product):
    add_to_cart(auth_client, product)
    checkout(auth_client)
    order = Order.query.one()
    order.set_status('stitching')
    db.session.commit()

    assert auth_client.post(f'/api/orders/{order.id}/cancel', json={}).status_code == 400


def test_cannot_cancel_someone_elses_order(auth_client, app, product):
    add_to_cart(auth_client, product)
    checkout(auth_client)
    order_id = Order.query.one().id

    make_user(username='intruder')
    other = app.test_client()
    other.post('/api/auth/login', json={'username': 'intruder', 'password': 'secret123'})

    assert other.post(f'/api/orders/{order_id}/cancel', json={}).status_code == 403
    assert other.get(f'/api/orders/{order_id}').status_code == 403


def test_reorder_puts_items_back_in_the_cart(auth_client, app, product):
    add_to_cart(auth_client, product)
    checkout(auth_client)
    order = Order.query.one()

    assert auth_client.post(f'/api/orders/{order.id}/reorder').status_code == 200
    assert auth_client.get('/api/cart').get_json()['item_count'] == 1
