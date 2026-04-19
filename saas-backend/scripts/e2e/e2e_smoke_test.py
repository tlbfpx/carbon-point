#!/usr/bin/env python3
"""
Carbon Point - E2E Smoke Test
Quick validation that all core services and APIs are up and responding.

Usage:
    python3 scripts/e2e/e2e_smoke_test.py

Exit code:
    0 = all services healthy
    1 = one or more services unhealthy
"""

import urllib.request
import urllib.error
import sys
import time
import json

API_BASE = "http://localhost:8080/api"
NGINX_BASE = "http://localhost:80"
VITE_DEV = "http://localhost:3000"

results = []


def check(name: str, url: str, expected_status: int = 200, timeout: float = 5.0) -> bool:
    """Check if a URL returns the expected status code."""
    try:
        req = urllib.request.Request(url)
        resp = urllib.request.urlopen(req, timeout=timeout)
        status = resp.getcode()
        passed = status == expected_status
        print(f"  [{'OK' if passed else 'FAIL'}] {name}: HTTP {status} (expected {expected_status})")
        results.append((name, passed))
        return passed
    except urllib.error.HTTPError as e:
        print(f"  [FAIL] {name}: HTTP {e.code} (expected {expected_status})")
        results.append((name, False))
        return False
    except Exception as e:
        print(f"  [FAIL] {name}: {type(e).__name__}: {e}")
        results.append((name, False))
        return False


def check_api(name: str, path: str, method: str = "GET", data: dict = None, expected_status: int = 200) -> bool:
    """Check an API endpoint."""
    url = f"{API_BASE}{path}"
    try:
        body = json.dumps(data).encode() if data else None
        req = urllib.request.Request(url, data=body, method=method)
        req.add_header("Content-Type", "application/json")
        resp = urllib.request.urlopen(req, timeout=10)
        status = resp.getcode()
        passed = status == expected_status
        if passed:
            try:
                body_resp = json.loads(resp.read())
                code = body_resp.get("code", -1)
                print(f"  [{'OK' if code == 200 else 'WARN'}] {name}: HTTP {status}, API code={code}")
            except:
                print(f"  [OK] {name}: HTTP {status}")
        else:
            print(f"  [FAIL] {name}: HTTP {status} (expected {expected_status})")
        results.append((name, passed))
        return passed
    except urllib.error.HTTPError as e:
        body_text = e.read().decode() or "{}"
        try:
            body_resp = json.loads(body_text)
            code = body_resp.get("code", -1)
            print(f"  [{'OK' if code == expected_status else 'FAIL'}] {name}: HTTP {e.code}, API code={code}")
            passed = code == expected_status
        except:
            print(f"  [FAIL] {name}: HTTP {e.code}")
            passed = False
        results.append((name, passed))
        return passed
    except Exception as e:
        print(f"  [FAIL] {name}: {type(e).__name__}: {e}")
        results.append((name, False))
        return False


def check_authenticated_api(name: str, path: str, token: str, expected_status: int = 200) -> bool:
    """Check an authenticated API endpoint."""
    url = f"{API_BASE}{path}"
    try:
        req = urllib.request.Request(url)
        req.add_header("Authorization", f"Bearer {token}")
        resp = urllib.request.urlopen(req, timeout=10)
        status = resp.getcode()
        passed = status == expected_status
        body_resp = json.loads(resp.read())
        code = body_resp.get("code", -1)
        print(f"  [{'OK' if code == 200 else 'WARN'}] {name}: HTTP {status}, API code={code}")
        results.append((name, passed))
        return passed
    except urllib.error.HTTPError as e:
        body_text = e.read().decode() or "{}"
        try:
            body_resp = json.loads(body_text)
            code = body_resp.get("code", -1)
            print(f"  [{'OK' if code == expected_status else 'FAIL'}] {name}: HTTP {e.code}, API code={code}")
            passed = code == expected_status
        except:
            print(f"  [FAIL] {name}: HTTP {e.code}")
            passed = False
        results.append((name, passed))
        return passed
    except Exception as e:
        print(f"  [FAIL] {name}: {type(e).__name__}: {e}")
        results.append((name, False))
        return False


def main():
    print(f"\n{'='*60}")
    print("Carbon Point - E2E Smoke Test")
    print(f"{'='*60}\n")

    # ── Layer 1: Infrastructure ────────────────────────────────────
    print("--- Infrastructure ---")
    check("Nginx HTTP", f"{NGINX_BASE}/")
    check("Backend API", f"{API_BASE}/auth/login", method="POST",
          data={"phone": "13800138001", "password": "password123"})

    # ── Layer 2: Auth API ────────────────────────────────────────
    print("\n--- Authentication ---")
    token = None
    try:
        body = json.dumps({"phone": "13800138001", "password": "password123"}).encode()
        req = urllib.request.Request(f"{API_BASE}/auth/login", data=body, method="POST")
        req.add_header("Content-Type", "application/json")
        resp = urllib.request.urlopen(req, timeout=10)
        data = json.loads(resp.read())
        if data.get("code") == 200 and data.get("data"):
            token = data["data"]["accessToken"]
            print(f"  [OK] Login: Auth successful, token={token[:20]}...")
        else:
            print(f"  [WARN] Login: code={data.get('code')}, msg={data.get('message')}")
            results.append(("Login", False))
    except Exception as e:
        print(f"  [FAIL] Login: {e}")
        results.append(("Login", False))

    # ── Layer 3: Authenticated APIs ────────────────────────────
    if token:
        print("\n--- Check-in API ---")
        check_authenticated_api("Checkin - Today", "/checkin/today", token)
        check_authenticated_api("Checkin - Time Slots", "/checkin/time-slots", token)

        print("\n--- Points API ---")
        check_authenticated_api("Points - Account", "/points/account", token)
        check_authenticated_api("Points - Transactions", "/points/transactions", token)

        print("\n--- Mall API ---")
        check_authenticated_api("Mall - Products", "/products", token)

        print("\n--- User API ---")
        check_authenticated_api("User - Profile", "/users/me", token)
    else:
        print("\n  [SKIP] Authenticated APIs skipped (no token)")

    # ── Summary ─────────────────────────────────────────────────
    print(f"\n{'='*60}")
    passed = sum(1 for _, p in results if p)
    failed = sum(1 for _, p in results if not p)
    total = len(results)
    print(f"  Total: {total}  |  PASS: {passed}  |  FAIL: {failed}")
    print(f"{'='*60}")

    if failed > 0:
        print("\nFailed checks:")
        for name, p in results:
            if not p:
                print(f"  - {name}")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
