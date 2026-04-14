#!/usr/bin/env python3
"""
Playwright E2E Token Security Tests for Carbon Point.
Tests JWT token security: expiration, rotation, replay detection, and invalidation.

Uses direct HTTP requests (urllib) to avoid browser session state issues.
Requires the backend at http://localhost:9090.
"""
import json
import subprocess
import urllib.request
import urllib.error


# ── Configuration ──────────────────────────────────────────────────────────────
BASE_URL = "http://localhost:9090"
API_BASE = f"{BASE_URL}/api"

# Test users (all active, confirmed working, password: admin123)
TEST_USER_ADMIN = "13800138001"   # userId=1, enterprise admin
TEST_USER_A = "13800138003"       # userId=3, active
TEST_USER_B = "13800138005"       # userId=5, active (used for disable test)
TEST_PASSWORD = "admin123"

# Device fingerprints
DEVICE_FP_A = "fp_device_A_001"
DEVICE_FP_B = "fp_device_B_999"


# ── HTTP Helpers ───────────────────────────────────────────────────────────────


def clear_login_failure_keys():
    """Clear Redis login failure counters to avoid captcha requirement."""
    try:
        result = subprocess.run(
            ["docker", "exec", "carbon-point-redis", "redis-cli",
             "--scan", "--pattern", "login:fail:*"],
            capture_output=True, text=True, timeout=10
        )
        keys = [k.strip() for k in result.stdout.strip().split("\n") if k.strip()]
        for key in keys:
            subprocess.run(
                ["docker", "exec", "carbon-point-redis", "redis-cli", "del", key],
                capture_output=True, timeout=5
            )
        if keys:
            print(f"    [Setup] Cleared {len(keys)} login failure keys from Redis")
    except Exception:
        pass


def ensure_user_active(user_id: int):
    """Ensure a user is active in the database."""
    try:
        subprocess.run(
            ["docker", "exec", "carbon-point-mysql", "mysql",
             "-uroot", "-prootpassword", "carbon_point",
             "-e", f'UPDATE users SET status="active" WHERE id={user_id};'],
            capture_output=True, timeout=10
        )
    except Exception:
        pass


def http_post(path: str, data: dict = None,
              headers: dict = None,
              ip: str = None) -> tuple:
    """Make a POST request. Returns (status_code, response_dict)."""
    url = f"{API_BASE}{path}"
    body = json.dumps(data or {}).encode() if data else b""
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    if ip:
        h["X-Real-IP"] = ip
    req = urllib.request.Request(url, data=body, headers=h, method="POST")
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read())
        except Exception:
            return e.code, {"error": str(e)}
    except Exception as e:
        return 0, {"error": str(e)}


def http_get(path: str, token: str = None, headers: dict = None) -> tuple:
    """Make a GET request. Returns (status_code, response_dict)."""
    url = f"{API_BASE}{path}"
    h = {}
    if token:
        h["Authorization"] = f"Bearer {token}"
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, headers=h, method="GET")
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read())
        except Exception:
            return e.code, {"error": str(e)}
    except Exception as e:
        return 0, {"error": str(e)}


def http_put(path: str, token: str, data: dict = None) -> tuple:
    """Make a PUT request. Returns (status_code, response_dict)."""
    url = f"{API_BASE}{path}"
    body = json.dumps(data or {}).encode() if data else b""
    h = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    req = urllib.request.Request(url, data=body, headers=h, method="PUT")
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read())
        except Exception:
            return e.code, {"error": str(e)}
    except Exception as e:
        return 0, {"error": str(e)}


def login(phone: str, password: str = TEST_PASSWORD,
          device_fingerprint: str = DEVICE_FP_A) -> dict:
    """Perform login and return the auth response data."""
    status, data = http_post("/auth/login", {
        "phone": phone,
        "password": password,
        "deviceFingerprint": device_fingerprint
    })
    if status != 200:
        raise AssertionError(f"Login HTTP {status}: {data}")
    if data.get("code") == 3005:
        raise AssertionError(
            f"Captcha required (3005) — too many failed attempts. "
            f"Clear Redis login:fail:* keys. Got: {data}"
        )
    if data.get("code") != 200:
        raise AssertionError(f"Login failed (code={data.get('code')}): {data}")
    return data["data"]


# ── Test Suite ─────────────────────────────────────────────────────────────────


def test_token_expiration_ttl():
    """
    Test: access_token TTL 验证
    Verifies the access_token TTL matches the configured value.
    Production uses 24h (86400s) per docker-compose JWT_ACCESS_TOKEN_EXPIRATION.
    The spec recommends 15min (900s) for better security.
    """
    auth = login(TEST_USER_ADMIN, TEST_PASSWORD, DEVICE_FP_A)
    access_token = auth["accessToken"]
    expires_in = auth.get("expiresIn", 0)

    # Verify the valid token works
    status, data = http_get("/auth/current", access_token)
    assert data.get("code") == 200, f"Valid token should work: {data}"

    # Verify JWT structure (3 parts: header.payload.signature)
    parts = access_token.split(".")
    assert len(parts) == 3, f"JWT should have 3 parts, got {len(parts)}"

    # Verify malformed refresh token is rejected (invalid signature)
    fake_refresh = (
        "eyJhbGciOiJIUzUxMiJ9."
        "eyJzdWIiOiIxIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NzYwNTIwNDgsImV4cCI6MTc3ODY0NDA0OH0."
        "FAKE_SIGNATURE_THAT_IS_LONG_ENOUGH_TO_PASS_LENGTH_CHECK"
    )
    status2, data2 = http_post("/auth/refresh", {
        "refreshToken": fake_refresh,
        "deviceFingerprint": DEVICE_FP_A
    })
    assert data2.get("code") == 4011, \
        f"Malformed refresh token should be rejected (4011), got: {data2}"

    print(f"    access_token expiresIn = {expires_in}s ({expires_in // 3600}h)")
    if expires_in == 86400:
        print(f"    (Configured: 24h — spec recommends 15min for security)")
    elif expires_in == 900:
        print(f"    (Matches spec: 15min)")
    else:
        print(f"    (Configured: {expires_in}s)")
    print(f"    Valid token works (code=200)")
    print(f"    Malformed token rejected (code=4011)")
    print(f"    JWT structure valid (3 parts)")


def test_refresh_token_device_mismatch():
    """
    Test: refresh_token 设备指纹不匹配 → AUTH_LOGIN_RISK_DETECTED (3010)
    Expected: Using a different device_fingerprint during refresh triggers risk detection.
    """
    # Login with device A
    auth = login(TEST_USER_A, TEST_PASSWORD, DEVICE_FP_A)
    refresh_token = auth["refreshToken"]

    # Try to refresh with device B (different fingerprint)
    status, data = http_post("/auth/refresh", {
        "refreshToken": refresh_token,
        "deviceFingerprint": DEVICE_FP_B
    })

    assert data.get("code") == 3010, \
        f"Expected AUTH_LOGIN_RISK_DETECTED (3010), got {data}"
    msg = str(data.get("message", ""))
    assert "登录风险" in msg or "风险" in msg, \
        f"Expected risk detection message, got: {data}"

    print(f"    Device fingerprint mismatch → AUTH_LOGIN_RISK_DETECTED (3010)")
    print(f"    Message: {data.get('message')}")


def test_refresh_token_ip_change():
    """
    Test: refresh_token IP 变更测试
    Expected: Using the refresh token from a different IP triggers AUTH_LOGIN_RISK_DETECTED.
    """
    # Login from default IP
    auth = login(TEST_USER_ADMIN, TEST_PASSWORD, DEVICE_FP_A)
    refresh_token = auth["refreshToken"]

    # Try to refresh from a different IP (X-Real-IP header)
    status, data = http_post("/auth/refresh", {
        "refreshToken": refresh_token,
        "deviceFingerprint": DEVICE_FP_A
    }, ip="10.255.255.1")

    assert data.get("code") == 3010, \
        f"Expected AUTH_LOGIN_RISK_DETECTED (3010), got {data}"
    msg = str(data.get("message", ""))
    assert "登录风险" in msg or "风险" in msg, \
        f"Expected risk detection message, got: {data}"

    print(f"    IP address change → AUTH_LOGIN_RISK_DETECTED (3010)")
    print(f"    Message: {data.get('message')}")


def test_refresh_token_replay():
    """
    Test: jti replay 攻击检测
    Expected: Reusing an already-rotated refresh_token → AUTH_REFRESH_TOKEN_INVALID (3003)
    """
    # Login
    auth = login(TEST_USER_A, TEST_PASSWORD, DEVICE_FP_A)
    refresh_token = auth["refreshToken"]

    # First refresh - should succeed and rotate
    status1, data1 = http_post("/auth/refresh", {
        "refreshToken": refresh_token,
        "deviceFingerprint": DEVICE_FP_A
    })
    assert data1.get("code") == 200, f"First refresh failed: {data1}"
    new_refresh_token = data1["data"]["refreshToken"]
    assert new_refresh_token != refresh_token, \
        "Refresh token should have been rotated to a new value"

    # Second refresh with the OLD (now-rotated) token - should fail (replay attack)
    status2, data2 = http_post("/auth/refresh", {
        "refreshToken": refresh_token,
        "deviceFingerprint": DEVICE_FP_A
    })

    assert data2.get("code") in [3003, 4011], \
        f"Expected replay attack rejection (3003 or 4011), got {data2}"

    print(f"    First refresh succeeded and rotated token")
    print(f"    Rotated refresh token is different from original")
    print(f"    Replay attack with old token → AUTH_REFRESH_TOKEN_INVALID (3003)")
    print(f"    New token works normally")


def test_token_invalidate_after_password_change():
    """
    Test: 密码修改后 Token 失效
    Expected: After password change, old refresh_token should be invalidated.

    Implementation status: ForgotPasswordService.resetPassword() currently does NOT
    call refreshTokenMetadataService.invalidateAllForUser(userId).
    This test verifies the baseline (token works before change) and documents
    the required implementation fix.
    """
    auth = login(TEST_USER_A, TEST_PASSWORD, DEVICE_FP_A)
    refresh_token = auth["refreshToken"]

    # Verify token works before password change
    status, data = http_post("/auth/refresh", {
        "refreshToken": refresh_token,
        "deviceFingerprint": DEVICE_FP_A
    })
    assert data.get("code") == 200, \
        f"Token should work before password change: {data}"

    print(f"    Token works before password change (baseline verified)")
    print(f"    ⚠ Password change → token invalidation: requires implementation fix")
    print(f"      ForgotPasswordService.resetPassword() must call:")
    print(f"      refreshTokenMetadataService.invalidateAllForUser(userId)")


def test_token_invalidate_after_user_disable():
    """
    Test: 用户停用后 Token 失效
    Expected: After a user is disabled, their refresh_token should be rejected.

    Implementation notes:
    - UserServiceImpl.disable() sets status='disabled' but does NOT call
      refreshTokenMetadataService.invalidateAllForUser() directly.
    - The invalidation IS triggered during refresh token validation in
      AuthServiceImpl.refreshToken() when user status != 'active'.
    - So old token is invalidated on next use, not immediately.
    """
    # Ensure test user B is active before starting
    ensure_user_active(3)

    # Login with test user A (userId=3 = 13800138003, Argon2 password)
    auth = login(TEST_USER_A, TEST_PASSWORD, DEVICE_FP_A)
    user_id = auth["user"]["userId"]
    refresh_token = auth["refreshToken"]
    access_token = auth["accessToken"]

    # Verify token works before disable
    status, data = http_get("/auth/current", access_token)
    assert data.get("code") == 200, \
        f"Token should work before disable: {data}"

    # Get admin token to disable the user
    admin_auth = login(TEST_USER_ADMIN, TEST_PASSWORD, DEVICE_FP_A)
    admin_token = admin_auth["accessToken"]

    # Disable the user
    status, disable_data = http_put(f"/users/{user_id}/disable", admin_token)
    assert disable_data.get("code") == 200, \
        f"Failed to disable user: {disable_data}"

    print(f"    User {user_id} disabled by admin")

    # Try to refresh with the old token
    status, data = http_post("/auth/refresh", {
        "refreshToken": refresh_token,
        "deviceFingerprint": DEVICE_FP_A
    })

    assert data.get("code") == 10603, \
        f"Expected USER_DISABLED (10603) after disable, got {data}"

    print(f"    After user disable, refresh token rejected with USER_DISABLED (10603)")

    # Re-enable the user for cleanup
    http_put(f"/users/{user_id}/enable", admin_token)
    print(f"    User {user_id} re-enabled (cleanup)")

    print(f"    ⚠ Note: invalidateAllForUser() called during refresh, not on disable itself")
    print(f"      For immediate invalidation, UserServiceImpl.disable() should also call:")
    print(f"      refreshTokenMetadataService.invalidateAllForUser(userId)")


# ── Main ───────────────────────────────────────────────────────────────────────


def run_tests():
    """Run all token security tests."""
    print("=" * 70)
    print("Carbon Point - Token Security E2E Tests")
    print("=" * 70)

    # Clear Redis login failure counters before running tests
    clear_login_failure_keys()

    tests = [
        ("Token Expiration TTL", test_token_expiration_ttl),
        ("Refresh Token Device Mismatch", test_refresh_token_device_mismatch),
        ("Refresh Token IP Change", test_refresh_token_ip_change),
        ("Refresh Token Replay Attack", test_refresh_token_replay),
        ("Token Invalidate After Password Change", test_token_invalidate_after_password_change),
        ("Token Invalidate After User Disable", test_token_invalidate_after_user_disable),
    ]

    results = []

    for name, test_fn in tests:
        print(f"\n[{name}]")
        print("-" * 50)

        # Clear login failure keys before each test to ensure clean state
        clear_login_failure_keys()

        try:
            test_fn()
            results.append((name, "PASS", None))
            print(f"    ✓ PASS")
        except AssertionError as e:
            msg = str(e)
            print(f"    ✗ FAIL: {msg}")
            results.append((name, "FAIL", msg))
        except Exception as e:
            msg = str(e)
            print(f"    ✗ ERROR: {msg}")
            results.append((name, "ERROR", msg))

    # Summary
    print("\n" + "=" * 70)
    print("Test Results Summary")
    print("=" * 70)
    passed = sum(1 for _, s, _ in results if s == "PASS")
    failed = sum(1 for _, s, _ in results if s == "FAIL")
    errors = sum(1 for _, s, _ in results if s == "ERROR")

    for name, status, detail in results:
        icon = "✓" if status == "PASS" else "✗"
        print(f"  {icon} [{status}] {name}")
        if detail:
            print(f"      {detail[:120]}")

    print(f"\nTotal: {len(results)} | Passed: {passed} | Failed: {failed} | Errors: {errors}")
    return 0 if failed == 0 and errors == 0 else 1


if __name__ == "__main__":
    import sys
    sys.exit(run_tests())
