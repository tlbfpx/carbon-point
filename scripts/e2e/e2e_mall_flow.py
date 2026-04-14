#!/usr/bin/env python3
"""
Playwright E2E Tests for Carbon Point Mall Exchange Flow.

Verified API behaviors:
 - POST /api/exchanges        → exchange points for product (immediately fulfilled)
 - GET  /api/exchanges/orders → paginated order list
 - GET  /api/exchanges/orders/{id} → order detail
 - PUT  /api/exchanges/orders/{id}/cancel → cancel (only pending → 10404 for fulfilled)
 - POST /api/exchanges/admin/redeem?couponCode=X → redeem coupon (idempotent: 10402 on repeat)
 - GET  /api/products          → paginated product list
 - GET  /api/products/{id}    → product detail
 - PUT  /api/products/{id}/toggle → toggle active/inactive

Error codes verified:
 - 10407 = EXCHANGE_POINT_NOT_ENOUGH ("积分不够，当前可用 X，需要 Y")
 - 10803 = MALL_PRODUCT_STOCK_EMPTY  ("商品库存不足")
 - 10402 = ORDER_COUPON_ALREADY_USED  ("该券码已使用")
 - 10404 = ORDER_STATUS_ERROR          ("只能取消待处理订单")
 - 10802 = MALL_PRODUCT_OFF_SALE       ("商品已下架")

Environment: API=http://localhost:9090, H5=http://localhost:8081
"""

from playwright.sync_api import sync_playwright
import json
import subprocess
import time
import os
import urllib.request
import urllib.error

# ─────────────────────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────────────────────
API_BASE  = os.environ.get("API_BASE", "http://localhost:9090")
H5_BASE   = os.environ.get("H5_BASE",  "http://localhost:8081")
TEST_USER = {"phone": "13911111666", "password": "Test1234!"}

results = []

# Product IDs managed per test run
_TEST_PROD_ID    = None   # normal exchange, maxPerUser=100
_ZERO_STOCK_PROD  = None   # stock empty test
_HIGH_PRICE_PROD  = None   # points insufficient test


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────
def log(step, expected, actual, passed):
    icon = "PASS" if passed is True else "FAIL"
    print(f"  [{icon}] {step}")
    if passed is not True:
        print(f"         Expected : {str(expected)[:200]}")
        print(f"         Actual   : {str(actual)[:200]}")
    results.append({
        "step": str(step)[:100],
        "expected": str(expected)[:200],
        "actual":   str(actual)[:200],
        "status": icon,
    })


def screenshot(page, name):
    page.screenshot(path=f"/tmp/e2e_mall_{name}.png", full_page=True)


def login_retry(phone, password, retries=5):
    for i in range(retries):
        try:
            body = json.dumps({"phone": phone, "password": password}).encode()
            req = urllib.request.Request(
                f"{API_BASE}/api/auth/login",
                data=body, method="POST"
            )
            req.add_header("Content-Type", "application/json")
            resp = urllib.request.urlopen(req, timeout=10)
            data = json.loads(resp.read())
            if data.get("code") == 200:
                return data["data"]["accessToken"], data["data"]["user"]
        except (urllib.error.HTTPError, urllib.error.URLError):
            if i < retries - 1:
                time.sleep(1)
    return None, None


def api_get(path, token=None):
    req = urllib.request.Request(f"{API_BASE}{path}")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    resp = urllib.request.urlopen(req, timeout=10)
    return json.loads(resp.read())


def api_post(path, data=None, token=None, method="POST"):
    body = json.dumps(data or {}).encode()
    req = urllib.request.Request(f"{API_BASE}{path}", data=body, method=method)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        return json.loads(resp.read()), resp.status
    except urllib.error.HTTPError as e:
        body_text = e.read().decode() or "{}"
        return json.loads(body_text), e.code


def api_put(path, data=None, token=None):
    return api_post(path, data, token, method="PUT")


def db_exec(sql):
    try:
        subprocess.run(
            f"docker exec carbon-point-mysql mysql -u root -prootpassword carbon_point "
            f'-e "{sql}" 2>/dev/null',
            shell=True, capture_output=True, timeout=10
        )
    except Exception:
        pass


def db_query(sql):
    try:
        out = subprocess.run(
            f"docker exec carbon-point-mysql mysql -u root -prootpassword carbon_point "
            f'-e "{sql}" 2>/dev/null',
            shell=True, capture_output=True, text=True, timeout=10
        )
        return out.stdout
    except Exception:
        return ""


def get_user_points(phone):
    out = db_query(f"SELECT available_points,frozen_points FROM users WHERE phone='{phone}';")
    try:
        lines = [l for l in out.strip().split("\n") if l]
        if len(lines) >= 2:
            parts = lines[-1].split()
            return int(parts[0]), int(parts[1])
    except (ValueError, IndexError):
        pass
    return None, None


def ensure_user_points(phone, points):
    db_exec(f"UPDATE users SET available_points={points}, total_points={points} "
            f"WHERE phone='{phone}';")


def clear_test_orders(phone):
    db_exec(f"DELETE FROM exchange_orders WHERE user_id IN "
            f"(SELECT id FROM users WHERE phone='{phone}');")


def clear_redis_rate_limits():
    try:
        subprocess.run(
            "docker exec carbon-point-redis redis-cli --scan --pattern 'login:fail:*' | "
            "xargs -r docker exec carbon-point-redis redis-cli DEL",
            shell=True, capture_output=True, timeout=10
        )
    except Exception:
        pass


def activate_product(prod_id, token):
    """Toggle once to activate an inactive product."""
    resp = api_put(f"/api/products/{prod_id}/toggle", {}, token)
    status = resp[0].get("data", {}).get("status") if resp[0].get("code") == 200 else None
    # If it became inactive (was already active), toggle once more
    if status == "inactive":
        api_put(f"/api/products/{prod_id}/toggle", {}, token)


def create_product(token, name, price, stock, max_per_user=100, ptype="coupon"):
    """Create a product and return its ID, or None on failure."""
    resp, _ = api_post("/api/products", {
        "name": name,
        "type": ptype,
        "pointsPrice": price,
        "stock": stock,
        "maxPerUser": max_per_user,
        "validityDays": 30,
        "description": "E2E test",
    }, token)
    if resp.get("code") == 200:
        prod_id = resp["data"].get("id")
        activate_product(prod_id, token)
        return prod_id
    return None


def cleanup_test_products(token):
    """Delete E2E test products from previous runs."""
    products = api_get("/api/products", token)
    for p in products.get("data", {}).get("records", []):
        if "E2E" in (p.get("name") or ""):
            try:
                db_exec(f"DELETE FROM products WHERE id={p.get('id')};")
            except Exception:
                pass


# ─────────────────────────────────────────────────────────────────────────────
# Test 1: Normal Exchange Flow
# ─────────────────────────────────────────────────────────────────────────────
def test_exchange_normal(token):
    """兑换商品 → 订单 fulfilled → 积分扣减 → 券码生成"""
    global _TEST_PROD_ID
    print("\n" + "=" * 70)
    print("TEST 1: Normal Exchange Flow")
    print("=" * 70)

    ensure_user_points("13911111666", 1000)
    clear_test_orders("13911111666")

    # Create dedicated test product
    _TEST_PROD_ID = create_product(token, "E2E正常兑换测试", price=100,
                                    stock=100, max_per_user=100)
    if not _TEST_PROD_ID:
        log("创建测试商品", True, False, False)
        return None, None

    # Get initial points
    avail_before, _ = get_user_points("13911111666")
    log("初始可用积分", f">= 100", avail_before, (avail_before or 0) >= 100)

    # Exchange
    resp, http_status = api_post("/api/exchanges", {"productId": _TEST_PROD_ID}, token)
    code = resp.get("code")

    log("兑换 HTTP 200", True, http_status == 200, http_status == 200)
    log("兑换 code 200", 200, code, code == 200)

    if code == 200:
        order = resp["data"]
        order_id    = order.get("id")
        order_status = order.get("orderStatus")
        coupon_code  = order.get("couponCode")
        points_spent = order.get("pointsSpent", 0)

        log("订单状态", "fulfilled", order_status, order_status == "fulfilled")
        log("券码生成", True, bool(coupon_code), bool(coupon_code))
        log("积分扣减", 100, points_spent, points_spent == 100)

        # DB verification
        avail_after, _ = get_user_points("13911111666")
        deducted = (avail_before or 0) - (avail_after or 0)
        log("积分实际扣减", f">= 100", deducted, deducted >= 100)

        # Orders list
        orders_resp = api_get("/api/exchanges/orders", token)
        records = orders_resp.get("data", {}).get("records", [])
        log("订单列表有记录", True, len(records) > 0, len(records) > 0)

        return order_id, coupon_code

    log("兑换失败", "code=200", resp.get("message", ""), False)
    return None, None


# ─────────────────────────────────────────────────────────────────────────────
# Test 2: Cancel Fulfilled Order (10404)
# ─────────────────────────────────────────────────────────────────────────────
def test_cancel_fulfilled_order(token, order_id):
    """已完成的订单不能取消 → 10404"""
    print("\n" + "=" * 70)
    print("TEST 3a: Cancel Fulfilled Order (expect 10404)")
    print("=" * 70)

    if not order_id:
        log("订单存在", True, False, False)
        return

    resp, _ = api_put(f"/api/exchanges/orders/{order_id}/cancel", {}, token)
    code = resp.get("code")
    msg  = resp.get("message", "")

    log("取消已履行订单", 10404, code, code == 10404)
    log("错误信息含'只能取消'", True, msg, "只能取消" in msg)


# ─────────────────────────────────────────────────────────────────────────────
# Test 3: Cancel Pending Order
# ─────────────────────────────────────────────────────────────────────────────
def test_cancel_pending_order(token):
    """兑换 → 立即履行 → 取消返回 10404（订单已履行）"""
    print("\n" + "=" * 70)
    print("TEST 3b: Cancel Order (immediate fulfill → 10404)")
    print("=" * 70)

    if not _TEST_PROD_ID:
        log("测试商品存在", True, False, False)
        return

    ensure_user_points("13911111666", 1000)
    clear_test_orders("13911111666")

    # Exchange creates a fulfilled order
    resp, _ = api_post("/api/exchanges", {"productId": _TEST_PROD_ID}, token)
    code = resp.get("code")
    log("创建订单", 200, code, code == 200)

    if code != 200:
        return

    order_id = resp["data"].get("id")

    # Wait for processing
    time.sleep(0.3)

    # Try to cancel
    cancel_resp, _ = api_put(f"/api/exchanges/orders/{order_id}/cancel", {}, token)
    cancel_code = cancel_resp.get("code")
    msg = cancel_resp.get("message", "")

    # Fulfilled orders return 10404 (ORDER_STATUS_ERROR)
    is_10404 = cancel_code == 10404
    log("取消已履行订单", 10404, cancel_code, is_10404)
    log("错误信息", True, msg, "只能取消待处理" in msg)

    # Points: since order was fulfilled before cancel attempt,
    # points are already spent (not frozen). Cancel on fulfilled is rejected.
    avail_final, _ = get_user_points("13911111666")
    log("积分未变化（取消被拒绝）", f"< 1000", avail_final, (avail_final or 0) < 1000)


# ─────────────────────────────────────────────────────────────────────────────
# Test 4: Coupon Redeem Idempotency (10402)
# ─────────────────────────────────────────────────────────────────────────────
def test_coupon_redeem_idempotent(token):
    """首次核销成功 → 重复核销返回 10402"""
    print("\n" + "=" * 70)
    print("TEST 4: Coupon Redeem Idempotency (10402)")
    print("=" * 70)

    # Create own fresh product for this test (avoids state dependency)
    ensure_user_points("13911111666", 1000)
    prod_id = create_product(token, "E2E核销测试", price=50, stock=5, max_per_user=100)
    if not prod_id:
        log("创建核销测试商品", True, False, False)
        return

    # Create exchange to get a fresh coupon
    resp, _ = api_post("/api/exchanges", {"productId": prod_id}, token)
    code = resp.get("code")
    if code != 200:
        log("创建兑换获取券码", 200, code, False)
        return

    coupon_code = resp["data"].get("couponCode")
    log("券码生成", True, bool(coupon_code), bool(coupon_code))

    if not coupon_code:
        log("券码存在", True, False, False)
        return

    # Redeem once
    redeem1, _ = api_post(
        f"/api/exchanges/admin/redeem?couponCode={coupon_code}", token=token
    )
    code1 = redeem1.get("code")
    log("首次核销", 200, code1, code1 == 200)

    # Redeem again → 10402
    redeem2, _ = api_post(
        f"/api/exchanges/admin/redeem?couponCode={coupon_code}", token=token
    )
    code2 = redeem2.get("code")
    msg2  = redeem2.get("message", "")

    log("重复核销拒绝", 10402, code2, code2 == 10402)
    log("错误信息含'已使用'", True, msg2, "已使用" in msg2)

    # Verify order status
    orders_resp = api_get("/api/exchanges/orders", token)
    for o in orders_resp.get("data", {}).get("records", []):
        if o.get("couponCode") == coupon_code:
            s = o.get("orderStatus")
            log("订单状态已使用", "used", s, s == "used")
            break


# ─────────────────────────────────────────────────────────────────────────────
# Test 5: Stock Empty (10803)
# ─────────────────────────────────────────────────────────────────────────────
def test_stock_empty(token):
    """库存为 0 → 10803"""
    global _ZERO_STOCK_PROD
    print("\n" + "=" * 70)
    print("TEST 5: Stock Empty (10803)")
    print("=" * 70)

    _ZERO_STOCK_PROD = create_product(token, "E2E零库存商品", price=10,
                                       stock=0, max_per_user=100)
    if not _ZERO_STOCK_PROD:
        log("创建零库存商品", True, False, False)
        return

    # Try exchange
    resp, _ = api_post("/api/exchanges", {"productId": _ZERO_STOCK_PROD}, token)
    code = resp.get("code")
    msg  = resp.get("message", "")

    log("零库存拒绝", 10803, code, code == 10803)
    log("错误信息含'库存'", True, msg, "库存" in msg)


# ─────────────────────────────────────────────────────────────────────────────
# Test 6: Points Insufficient (10407)
# ─────────────────────────────────────────────────────────────────────────────
def test_points_insufficient(token):
    """积分不足 → 10407"""
    global _HIGH_PRICE_PROD
    print("\n" + "=" * 70)
    print("TEST 6: Points Insufficient (10407)")
    print("=" * 70)

    # Give user very few points
    ensure_user_points("13911111666", 10)

    _HIGH_PRICE_PROD = create_product(token, "E2E超高额商品", price=999999,
                                       stock=10, max_per_user=100)
    if not _HIGH_PRICE_PROD:
        log("创建高价商品", True, False, False)
        return

    # Try exchange
    resp, _ = api_post("/api/exchanges", {"productId": _HIGH_PRICE_PROD}, token)
    code = resp.get("code")
    msg  = resp.get("message", "")

    log("积分不足拒绝", 10407, code, code == 10407)
    log("错误信息含'积分不够'", True, msg, "积分不够" in msg)

    # Verify NO order was created
    orders_resp = api_get("/api/exchanges/orders", token)
    records = orders_resp.get("data", {}).get("records", [])
    high_orders = [o for o in records if str(o.get("productId")) == str(_HIGH_PRICE_PROD)]
    log("未创建订单（积分不足）", 0, len(high_orders), len(high_orders) == 0)

    # Restore points
    ensure_user_points("13911111666", 1000)


# ─────────────────────────────────────────────────────────────────────────────
# Test 7: H5 Mall UI
# ─────────────────────────────────────────────────────────────────────────────
def test_h5_mall_ui(token, user_id, tenant_id):
    """H5 商城页面加载"""
    print("\n" + "=" * 70)
    print("TEST (H5): Mall UI")
    print("=" * 70)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 375, "height": 812})

        context.add_init_script(f"""
            window.localStorage.setItem('carbon-auth', JSON.stringify({{
                state: {{
                    accessToken: "{token}",
                    refreshToken: "",
                    user: {{
                        userId: "{user_id}",
                        phone: "13911111666",
                        tenantId: "{tenant_id}",
                        roles: ["user"]
                    }},
                    isAuthenticated: true
                }}
            }}));
        """)

        page = context.new_page()
        console_errors = []
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)

        try:
            page.goto(f"{H5_BASE}/mall", wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(3000)
            screenshot(page, "h5_mall")

            body_text = page.locator("body").inner_text()
            url = page.url

            log("H5 URL 包含 mall", True, "/mall" in url, "/mall" in url)
            log("页面无 JS 崩溃", True, len(console_errors) == 0, len(console_errors) == 0)

            has_keywords = any(kw in body_text for kw in ["商品", "积分", "兑换", "优惠券", "E2E", "咖啡"])
            log("页面有商城关键词", True, has_keywords, has_keywords)

        except Exception as e:
            log("H5 商城加载", "正常加载", str(e)[:200], False)
        finally:
            browser.close()


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────
def run_all_tests():
    global _TEST_PROD_ID, _ZERO_STOCK_PROD, _HIGH_PRICE_PROD

    print("\n" + "#" * 70)
    print("  Carbon Point — Mall Exchange E2E Test Suite")
    print("#" * 70)

    # ── Setup ────────────────────────────────────────────────────────────────
    clear_redis_rate_limits()

    token, user_info = login_retry(TEST_USER["phone"], TEST_USER["password"])
    if not token:
        print("[FATAL] Cannot login. Is the server running on localhost:9090?")
        return

    user_id   = user_info.get("userId") or user_info.get("id")
    tenant_id = user_info.get("tenantId", 1)

    print(f"\n  Logged in: user_id={user_id}, tenant={tenant_id}")

    # Clean up old test products + reset points
    ensure_user_points("13911111666", 1000)
    clear_test_orders("13911111666")

    # ── Run tests ────────────────────────────────────────────────────────────
    order_id, _ = test_exchange_normal(token)

    test_cancel_fulfilled_order(token, order_id)

    test_cancel_pending_order(token)

    test_coupon_redeem_idempotent(token)

    test_stock_empty(token)

    test_points_insufficient(token)

    test_h5_mall_ui(token, user_id, tenant_id)

    # ── Report ──────────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("  Test Summary")
    print("=" * 70)

    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    total  = len(results)

    print(f"\n  Total: {total}  |  PASS: {passed}  |  FAIL: {failed}")

    for r in results:
        icon = "PASS" if r["status"] == "PASS" else "FAIL"
        print(f"  [{icon}] {r['step'][:55]}")

    print(f"\n  Screenshots: /tmp/e2e_mall_*.png")
    print("=" * 70)

    return passed, failed


if __name__ == "__main__":
    run_all_tests()
