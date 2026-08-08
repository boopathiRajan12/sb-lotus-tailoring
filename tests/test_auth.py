"""Registration, login, throttling, and profile endpoints."""
import routes.auth as auth_module
from conftest import login, make_user
from models import User, db


def test_register_creates_account(client, app):
    response = client.post('/api/auth/register', json={
        'username': 'priya',
        'email': 'priya@example.com',
        'password': 'secret123',
        'confirm_password': 'secret123',
    })
    assert response.status_code == 201
    assert User.query.filter_by(username='priya').count() == 1


def test_register_rejects_short_password(client):
    response = client.post('/api/auth/register', json={
        'username': 'priya', 'email': 'priya@example.com', 'password': 'abc',
    })
    assert response.status_code == 400
    assert 'at least' in response.get_json()['error']


def test_register_rejects_mismatched_confirmation(client):
    response = client.post('/api/auth/register', json={
        'username': 'priya', 'email': 'priya@example.com',
        'password': 'secret123', 'confirm_password': 'secret124',
    })
    assert response.status_code == 400


def test_register_is_case_insensitive_on_username(client, user):
    response = client.post('/api/auth/register', json={
        'username': 'CUSTOMER', 'email': 'other@example.com', 'password': 'secret123',
    })
    assert response.status_code == 400
    assert 'already exists' in response.get_json()['error']


def test_register_is_case_insensitive_on_email(client, user):
    response = client.post('/api/auth/register', json={
        'username': 'someone', 'email': 'CUSTOMER@example.com', 'password': 'secret123',
    })
    assert response.status_code == 400


def test_database_enforces_case_insensitive_email(app, user):
    """The unique index is the backstop when two signups race the check."""
    from sqlalchemy.exc import IntegrityError

    duplicate = User(username='another', email='CUSTOMER@example.com')
    duplicate.set_password('secret123')
    db.session.add(duplicate)
    try:
        db.session.commit()
        raised = False
    except IntegrityError:
        db.session.rollback()
        raised = True
    assert raised, 'expected uq_users_email_lower to reject a case-variant duplicate'


def test_login_accepts_email_as_identifier(client, user):
    response = client.post('/api/auth/login', json={
        'username': 'customer@example.com', 'password': 'secret123',
    })
    assert response.status_code == 200
    assert response.get_json()['user']['username'] == 'customer'


def test_login_rejects_bad_password(client, user):
    response = login(client, password='wrong')
    assert response.status_code == 401


def test_suspended_account_cannot_log_in(client, app, user):
    user.is_active_account = False
    db.session.commit()
    assert login(client).status_code == 403


def test_logout_clears_the_session(auth_client):
    assert auth_client.post('/api/auth/logout').status_code == 200
    assert auth_client.get('/api/auth/me').get_json()['user'] is None


def test_me_is_anonymous_before_login(client):
    assert client.get('/api/auth/me').get_json()['user'] is None


# ─── Throttling ──────────────────────────────────────────────────────────────

def test_account_lockout_after_repeated_failures(client, user):
    for _ in range(auth_module.MAX_ATTEMPTS_PER_ACCOUNT):
        assert login(client, password='wrong').status_code == 401

    # Locked out even with the correct password now.
    assert login(client).status_code == 429


def test_lockout_cannot_be_bypassed_by_spoofing_forwarded_for(client, user):
    """The old throttle keyed on a client-controlled header; rotating it bypassed it."""
    for attempt in range(auth_module.MAX_ATTEMPTS_PER_ACCOUNT):
        client.post(
            '/api/auth/login',
            json={'username': 'customer', 'password': 'wrong'},
            headers={'X-Forwarded-For': f'10.0.0.{attempt}'},
        )

    response = client.post(
        '/api/auth/login',
        json={'username': 'customer', 'password': 'secret123'},
        headers={'X-Forwarded-For': '10.0.0.99'},
    )
    assert response.status_code == 429


def test_successful_login_clears_the_failure_count(client, user):
    for _ in range(auth_module.MAX_ATTEMPTS_PER_ACCOUNT - 1):
        login(client, password='wrong')

    assert login(client).status_code == 200
    client.post('/api/auth/logout')

    # Budget reset, so a fresh run of failures is needed to lock out again.
    assert login(client, password='wrong').status_code == 401


def test_throttle_state_does_not_grow_without_bound(app):
    """A spray across many identifiers must not grow the counter dict forever."""
    auth_module._login_attempts.clear()
    with app.test_request_context('/api/auth/login'):
        for n in range(auth_module._MAX_TRACKED_KEYS + 50):
            auth_module._record_failure(f'user{n}')
    assert len(auth_module._login_attempts) <= auth_module._MAX_TRACKED_KEYS + 2


# ─── Profile ─────────────────────────────────────────────────────────────────

def test_profile_requires_login(client):
    assert client.get('/api/auth/profile').status_code == 401


def test_change_password_requires_the_current_one(auth_client):
    response = auth_client.put('/api/auth/password', json={
        'current_password': 'wrong', 'new_password': 'newsecret1',
    })
    assert response.status_code == 400


def test_change_password_succeeds(auth_client, client):
    response = auth_client.put('/api/auth/password', json={
        'current_password': 'secret123',
        'new_password': 'newsecret1',
        'confirm_password': 'newsecret1',
    })
    assert response.status_code == 200

    auth_client.post('/api/auth/logout')
    assert login(auth_client, password='newsecret1').status_code == 200


def test_measurements_round_trip_and_reject_unknown_keys(auth_client):
    response = auth_client.put('/api/auth/measurements', json={
        'measurements': {'bust': '34', 'waist': '30', 'nonsense': 'x'},
    })
    saved = response.get_json()['measurements']
    assert saved == {'bust': '34', 'waist': '30'}


def test_edit_profile_rejects_an_email_taken_by_someone_else(auth_client, app):
    make_user(username='rival')
    response = auth_client.put('/api/auth/profile', json={'email': 'rival@example.com'})
    assert response.status_code == 400
