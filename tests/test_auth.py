def test_health(client):
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_register_login_and_me(client):
    creds = {"email": "auth-flow@example.com", "password": "password123"}
    assert client.post("/api/v1/auth/register", json=creds).status_code == 201

    resp = client.post(
        "/api/v1/auth/login", data={"username": creds["email"], "password": creds["password"]}
    )
    assert resp.status_code == 200
    token = resp.json()["access_token"]

    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == creds["email"]


def test_duplicate_email_rejected(client):
    creds = {"email": "dupe@example.com", "password": "password123"}
    assert client.post("/api/v1/auth/register", json=creds).status_code == 201
    assert client.post("/api/v1/auth/register", json=creds).status_code == 400


def test_short_password_rejected(client):
    resp = client.post("/api/v1/auth/register", json={"email": "short@example.com", "password": "abc"})
    assert resp.status_code == 422


def test_wrong_password_rejected(client):
    client.post("/api/v1/auth/register", json={"email": "wrongpw@example.com", "password": "password123"})
    resp = client.post("/api/v1/auth/login", data={"username": "wrongpw@example.com", "password": "nope"})
    assert resp.status_code == 401


def test_protected_routes_require_token(client):
    for path in ("/api/v1/documents", "/api/v1/quiz", "/api/v1/session", "/api/v1/auth/me"):
        assert client.get(path).status_code == 401, path


def test_invalid_token_rejected(client):
    resp = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert resp.status_code == 401
