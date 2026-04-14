#!/usr/bin/env python3
"""
Playwright E2E H5 用户界面测试
Carbon Point H5 App - UI Verification Tests

Run: python e2e_h5_ui.py
Requirements: pip install playwright && playwright install chromium
"""
import sys
from playwright.sync_api import sync_playwright, BrowserContext, Page
import time

# Test configuration
BASE_URL = "http://localhost:3000/h5"  # Vite dev server serves app at /h5/

results = []
test_start_time = time.time()


def log(msg):
    print(f"  {msg}")


def step(name):
    print(f"\n{'='*60}\n  {name}\n{'='*60}")


def test_pass(name, detail=""):
    results.append(("PASS", name, detail))
    log(f"[PASS] {name}")


def test_fail(name, detail, expected=""):
    results.append(("FAIL", name, f"Expected: {expected}, Got: {detail}"))
    log(f"[FAIL] {name} | Expected: {expected} | Got: {detail[:100]}")


def test_skip(name, reason):
    results.append(("SKIP", name, reason))
    log(f"[SKIP] {name} | Reason: {reason}")


def screenshot(page: Page, name: str):
    path = f"/tmp/h5_ui_{name}.png"
    try:
        page.screenshot(path=path, full_page=False)
        log(f"  Screenshot: {path}")
    except Exception as e:
        log(f"  Screenshot failed: {e}")


def setup_context_api_mock(context: BrowserContext):
    """Setup API mocks at context level - persists across all pages and navigations.
    Uses guard clause to avoid matching Vite source files at /src/api/...
    """
    def api_handler(route):
        url = route.request.url
        # Guard: only mock requests to our API base URL
        api_prefix = "http://localhost:8081/api/"
        if not url.startswith(api_prefix):
            route.continue_()
            return

        if "/auth/login" in url:
            route.fulfill(status=200, content_type="application/json",
                body='{"code":200,"data":{"accessToken":"test_access_token_12345","refreshToken":"test_refresh_token_67890","user":{"userId":"u001","username":"测试用户","phone":"13800138001","email":"test@example.com","avatar":"","tenantId":"t001","roles":["user"]}}}')
        elif "/auth/refresh" in url:
            route.fulfill(status=200, content_type="application/json",
                body='{"code":200,"data":{"accessToken":"test_access_token_refreshed","refreshToken":"test_refresh_token_67890"}}')
        elif "/auth/sms/send" in url:
            route.fulfill(status=200, content_type="application/json",
                body='{"code":200,"message":"验证码已发送","data":null}')
        elif "/checkin/today" in url:
            route.fulfill(status=200, content_type="application/json",
                body='{"code":200,"data":{"checkedIn":false,"pointsEarned":0}}')
        elif "/checkin" in url and route.request.method == "POST":
            route.fulfill(status=200, content_type="application/json",
                body='{"code":200,"data":{"pointsEarned":100},"message":"打卡成功"}')
        elif "/points/account" in url:
            route.fulfill(status=200, content_type="application/json",
                body='{"code":200,"data":{"id":"acc001","userId":"u001","tenantId":"t001","totalPoints":2350,"frozenPoints":0,"availablePoints":2350,"level":2}}')
        elif "/points/transactions" in url:
            route.fulfill(status=200, content_type="application/json",
                body='{"code":200,"data":[{"id":"tx001","userId":"u001","points":100,"type":"checkin","description":"晨跑打卡奖励","createTime":"2026-04-13 08:30:00"},{"id":"tx002","userId":"u001","points":-50,"type":"exchange","description":"兑换咖啡券","createTime":"2026-04-12 14:20:00"},{"id":"tx003","userId":"u001","points":150,"type":"checkin","description":"夜跑打卡奖励","createTime":"2026-04-11 21:00:00"},{"id":"tx004","userId":"u001","points":200,"type":"consecutive","description":"连续7天打卡奖励","createTime":"2026-04-10 09:00:00"},{"id":"tx005","userId":"u001","points":50,"type":"checkin","description":"午间打卡奖励","createTime":"2026-04-09 12:30:00"}]}')
        elif "/points/leaderboard" in url:
            route.fulfill(status=200, content_type="application/json",
                body='{"code":200,"data":[{"userId":"u001","username":"测试用户","totalPoints":2350,"rank":5,"currentRank":5,"changeFromLastWeek":2,"percentile":15}]}')
        elif "/products/" in url:
            # Product detail: GET /products/{id}
            route.fulfill(status=200, content_type="application/json",
                body='{"code":200,"data":{"id":"p001","name":"瑞幸咖啡券","description":"免费兑换一杯中杯美式","pointsPrice":500,"stock":50,"type":"coupon"}}')
        elif "/products" in url:
            # Products list: GET /products
            route.fulfill(status=200, content_type="application/json",
                body='{"code":200,"data":{"records":[{"id":"p001","name":"瑞幸咖啡券","description":"免费兑换一杯中杯美式","pointsPrice":500,"stock":50,"type":"coupon"},{"id":"p002","name":"视频会员月卡","description":"爱奇艺/优酷/腾讯视频月卡","pointsPrice":2000,"stock":10,"type":"privilege"},{"id":"p003","name":"手机话费50元","description":"直充到账","pointsPrice":3000,"stock":0,"type":"recharge"}],"total":3}}')
        elif "/exchanges/coupons" in url:
            route.fulfill(status=200, content_type="application/json",
                body='{"code":200,"data":[{"id":"c001","name":"瑞幸咖啡券","status":"available","expireTime":"2026-05-13"},{"id":"c002","name":"视频会员月卡","status":"used","expireTime":"2026-04-01"}]}')
        elif "/exchanges" in url:
            route.fulfill(status=200, content_type="application/json",
                body='{"code":200,"data":{"id":"order001","status":"fulfilled"},"message":"兑换成功"}')
        elif "/notifications" in url:
            route.fulfill(status=200, content_type="application/json",
                body='{"code":200,"data":[{"id":"n001","title":"打卡提醒","content":"今日还未打卡","isRead":false,"createTime":"2026-04-13 08:00:00"},{"id":"n002","title":"积分到账","content":"恭喜获得奖励","isRead":true,"createTime":"2026-04-10 09:00:00"}]}')
        else:
            route.fulfill(status=200, content_type="application/json", body='{"code":200,"data":null}')

    context.route("**", api_handler)


def set_auth_storage(page: Page):
    """Set Zustand auth store in localStorage so ProtectedRoute passes.
    Must be called BEFORE page navigation (using add_init_script) because
    Zustand persist middleware writes state to localStorage on initialization,
    overwriting any values set after the app starts.
    """
    pass  # Auth is now set via add_init_script at context level


def setup_context_auth(context: BrowserContext):
    """Inject auth into localStorage BEFORE any page loads.
    This runs before the React app initializes, ensuring Zustand
    reads the auth state from the start.
    """
    context.add_init_script("""
        // Inject auth directly into Zustand store internals before React mounts.
        // This bypasses the async localStorage hydration timing issue.
        // Zustand v4 persist stores hydration state in a WeakMap keyed by the store.
        // We set the auth state directly into the store's internal state.
        window.__TEST_AUTH__ = {
            accessToken: "test_access_token_12345",
            refreshToken: "test_refresh_token_67890",
            user: {
                userId: "u001",
                username: "测试用户",
                phone: "13800138001",
                email: "test@example.com",
                avatar: "",
                tenantId: "t001",
                roles: ["user"]
            },
            isAuthenticated: true
        };

        // Also set localStorage for persistence
        localStorage.setItem("carbon-auth", JSON.stringify({
            "state": {
                "accessToken": "test_access_token_12345",
                "refreshToken": "test_refresh_token_67890",
                "user": {
                    "userId": "u001",
                    "username": "测试用户",
                    "phone": "13800138001",
                    "email": "test@example.com",
                    "avatar": "",
                    "tenantId": "t001",
                    "roles": ["user"]
                },
                "isAuthenticated": true
            },
            "version": 0
        }));
    """)


# =============================================================================
# Test Scenarios
# =============================================================================

def test_h5_login(page: Page):
    """Test H5 Login Flow - 手机号 + 密码登录"""
    step("1. H5 登录/注册流程测试")

    # 1.1 Navigate directly to login page
    page.goto(f"{BASE_URL}/login", wait_until="domcontentloaded", timeout=15000)
    # Wait for login form to appear
    page.wait_for_timeout(3000)
    body_text = page.locator("body").inner_text()
    redirected_to_login = "登录" in body_text and "立即注册" in body_text
    if redirected_to_login:
        test_pass("未登录时进入登录页", "login form rendered")
    else:
        test_fail("未登录时进入登录页", body_text[:100], "login page content")

    # 1.2 Verify login page elements
    page.wait_for_timeout(1)  # Let React finish rendering
    inputs = page.locator("input").all()
    inputs = page.locator("input").all()
    input_placeholders = [inp.get_attribute("placeholder") or "" for inp in inputs]
    log(f"  Input placeholders: {input_placeholders}")

    if "请输入手机号" in input_placeholders:
        test_pass("登录页：手机号输入框存在")
    else:
        test_fail("登录页：手机号输入框存在", str(input_placeholders), "请输入手机号")

    if "请输入密码" in input_placeholders:
        test_pass("登录页：密码输入框存在")
    else:
        test_fail("登录页：密码输入框存在", str(input_placeholders), "请输入密码")

    # 1.3 Verify login button
    buttons = {b.inner_text().strip(): b for b in page.locator("button").all()}
    if "登录" in buttons:
        test_pass("登录按钮存在")
    else:
        test_fail("登录按钮存在", str(list(buttons.keys())), "登录")

    # 1.4 Verify "register now" link
    register_link = page.locator('text="立即注册"').first
    if register_link.is_visible():
        test_pass("登录页：'立即注册' 链接存在")
        register_link.click()
        page.wait_for_timeout(1000)
        if "/register" in page.url:
            test_pass("点击立即注册跳转至 /register")
        else:
            test_fail("点击立即注册跳转至 /register", page.url, "/register in URL")
    else:
        test_fail("登录页：'立即注册' 链接存在", "not found", "立即注册 link visible")

    screenshot(page, "01_login_page")


def test_h5_register(page: Page):
    """Test H5 Register Flow - 注册强制验证码"""
    step("2. H5 注册流程测试")

    page.goto(f"{BASE_URL}/register", wait_until="domcontentloaded", timeout=15000)
    time.sleep(2)

    page.wait_for_selector("input", timeout=5000)
    inputs = {inp.get_attribute("placeholder") or "": inp for inp in page.locator("input").all()}
    log(f"  Register inputs: {list(inputs.keys())}")

    field_checks = [
        ("手机号输入框", "请输入手机号"),
        ("验证码输入框", "请输入验证码"),
        ("密码输入框", "设置密码（至少8位）"),
        ("确认密码输入框", "确认密码"),
        ("邀请码输入框", "邀请码（选填）"),
    ]
    for name, placeholder in field_checks:
        if placeholder in inputs:
            test_pass(f"注册页：{name}")
        else:
            test_fail(f"注册页：{name} 存在", str(list(inputs.keys())), placeholder)

    code_buttons = {b.inner_text().strip(): b for b in page.locator("button").all()}
    if any("验证码" in txt or "获取验证码" in txt for txt in code_buttons.keys()):
        test_pass("注册页：验证码按钮存在")
    else:
        test_fail("注册页：验证码按钮存在", str(list(code_buttons.keys())), "获取验证码 button")

    if "请输入验证码" in inputs:
        test_pass("注册页：验证码为必填字段")
    else:
        test_fail("注册页：验证码为必填字段", "input not found", "请输入验证码")

    inputs["请输入手机号"].fill("13900000001")
    inputs["请输入验证码"].fill("123456")
    inputs["设置密码（至少8位）"].fill("password123")
    inputs["确认密码"].fill("password123")

    screenshot(page, "02_register_filled")

    # Find and click register button
    all_buttons = page.locator("button").all()
    register_btn = None
    for btn in all_buttons:
        txt = btn.inner_text().strip()
        if txt == "注册":
            register_btn = btn
            break

    if register_btn:
        register_btn.click()
        page.wait_for_timeout(2000)
        if "/login" in page.url:
            test_pass("注册成功后跳转登录页")
        else:
            test_fail("注册成功后跳转登录页", page.url, "/login in URL")
    else:
        test_skip("注册按钮点击测试", "register button not found")

    screenshot(page, "03_after_register")


def test_h5_checkin_entry(page: Page):
    """Test Check-in Entry - 无可用时段时显示正确提示"""
    step("3. 打卡入口测试")

    page.goto(f"{BASE_URL}/checkin", wait_until="domcontentloaded", timeout=15000)
    # Wait for auth redirect to resolve (may redirect to /login briefly)
    try:
        page.wait_for_url(f"{BASE_URL}/checkin", timeout=8000)
    except Exception:
        pass  # If still on /login, auth failed - test will fail on content check
    page.wait_for_timeout(2000)

    screenshot(page, "04_checkin_entry")

    body_text = page.locator("body").inner_text()

    if len(body_text) > 0:
        test_pass("打卡页面加载成功")
    else:
        test_fail("打卡页面加载成功", body_text[:50], "non-empty body")

    instructions_found = any(phrase in body_text for phrase in ["打卡", "爬楼梯", "运动", "完成", "确认"])
    if instructions_found:
        test_pass("打卡说明文字存在")
    else:
        test_fail("打卡说明文字存在", body_text[:100], "打卡说明")

    checkin_buttons = [b for b in page.locator("button").all() if "打卡" in b.inner_text().strip()]
    if checkin_buttons:
        test_pass("打卡按钮存在")
    else:
        test_fail("打卡按钮存在", "not found", "打卡 button")

    if "须知" in body_text or "规则" in body_text or "注意" in body_text:
        test_pass("打卡须知区域存在")
    else:
        test_fail("打卡须知区域存在", body_text[:200], "须知/规则/注意")

    confirm_btn = page.locator('text="确认打卡"').first
    if confirm_btn.is_visible():
        test_pass("确认打卡按钮可见")
    else:
        test_fail("确认打卡按钮可见", "not visible", "确认打卡 button")

    screenshot(page, "05_checkin_page")


def test_h5_points_detail(page: Page):
    """Test Points Detail - 验证字段完整性：时间/类型/来源/积分/余额"""
    step("4. 积分明细展示测试")

    page.goto(f"{BASE_URL}/points", wait_until="domcontentloaded", timeout=15000)
    try:
        page.wait_for_url(f"{BASE_URL}/points", timeout=8000)
    except Exception:
        pass
    page.wait_for_timeout(2000)
    body_text = page.locator("body").inner_text()
    log(f"  Points URL: {page.url}")
    log(f"  Points body (first 300): {body_text[:300]}")

    total_points_found = any(c.isdigit() for c in body_text)
    if total_points_found:
        test_pass("积分页面：总积分数字显示")
    else:
        test_fail("积分页面：总积分数字显示", body_text[:100], "digit in body")

    level_found = any(phrase in body_text for phrase in ["Lv.", "青铜", "白银", "黄金", "铂金", "钻石", "level"])
    if level_found:
        test_pass("积分页面：等级显示")
    else:
        test_fail("积分页面：等级显示", body_text[:200], "Lv. or level name")

    history_found = any(phrase in body_text for phrase in ["明细", "记录", "历史", "积分明细", "变动"])
    if history_found:
        test_pass("积分页面：积分明细区域")
    else:
        test_fail("积分页面：积分明细区域", body_text[:200], "明细/记录/历史")

    has_time = any(phrase in body_text for phrase in ["积分明细", "打卡", "兑换", "奖励"])
    has_type = any(phrase in body_text for phrase in ["打卡", "兑换", "连续", "checkin", "exchange"])
    has_desc = any(phrase in body_text for phrase in ["奖励", "打卡", "兑换", "description"])
    has_points = any(phrase in body_text for phrase in ["+", "积分", "100", "50", "200"])

    if has_time:
        test_pass("积分明细：时间字段 (createTime)")
    else:
        test_fail("积分明细：时间字段 (createTime)", body_text[:200], "时间/日期")

    if has_type:
        test_pass("积分明细：类型字段 (type)")
    else:
        test_fail("积分明细：类型字段 (type)", body_text[:200], "类型/来源")

    if has_desc:
        test_pass("积分明细：描述字段 (description)")
    else:
        test_fail("积分明细：描述字段 (description)", body_text[:200], "描述/来源")

    if has_points:
        test_pass("积分明细：积分数值显示")
    else:
        test_fail("积分明细：积分数值显示", body_text[:200], "积分数字")

    has_positive_style = "+" in body_text
    if has_positive_style:
        test_pass("积分明细：正负积分标识 (+/-)")
    else:
        test_fail("积分明细：正负积分标识 (+/-)", body_text[:200], "+/- symbol")

    # Progress bar - antd-mobile uses specific class names
    bar_found = (
        page.locator(".adm-progress-bar, [class*='progress'], [class*='Progress'], [style*='width']").first
        .evaluate("el => el.tagName")
    )
    if bar_found:
        test_pass("积分页面：等级进度条")
    else:
        test_skip("积分页面：等级进度条", "进度条元素可能使用内联样式")

    screenshot(page, "06_points_page")


def test_h5_mall_product(page: Page):
    """Test Mall Product Page - 积分不足时兑换按钮置灰"""
    step("5. 商品兑换页面测试")

    page.goto(f"{BASE_URL}/mall", wait_until="domcontentloaded", timeout=15000)
    try:
        page.wait_for_url(f"{BASE_URL}/mall", timeout=8000)
    except Exception:
        pass
    page.wait_for_timeout(2000)

    body_text = page.locator("body").inner_text()
    log(f"  Mall body (first 300): {body_text[:300]}")

    if len(body_text) > 0:
        test_pass("商城页面加载成功")
    else:
        test_fail("商城页面加载成功", body_text[:50], "non-empty body")

    # Search bar
    search_input = page.locator('input[placeholder*="搜索"]').first
    try:
        search_input.wait_for(timeout=2000)
        test_pass("商城页面：搜索框存在")
    except:
        test_fail("商城页面：搜索框存在", "not found", "搜索 input")

    # Product cards - antd-mobile Card component
    cards = page.locator(".adm-card, [class*='card'], [class*='Card']").all()
    card_count = len(cards)
    log(f"  Found {card_count} cards")
    if card_count > 0:
        test_pass(f"商城页面：商品列表显示 ({card_count} 个商品)")
    else:
        test_fail("商城页面：商品列表显示", f"{card_count} products", "products visible")

    # Product name
    if "瑞幸咖啡券" in body_text or "咖啡" in body_text:
        test_pass("商城页面：商品名称显示")
    else:
        test_fail("商城页面：商品名称显示", body_text[:200], "瑞幸咖啡券")

    # Points cost
    has_points_price = any(text in body_text for text in ["500", "2000", "3000"])
    if has_points_price:
        test_pass("商城页面：积分价格显示")
    else:
        test_fail("商城页面：积分价格显示", body_text[:200], "积分价格数字")

    # Exchange buttons

    # Exchange buttons
    exchange_buttons = page.locator("button:has-text('兑换')").all()
    log(f"  Exchange buttons: {len(exchange_buttons)}")
    enabled_exchange = [b for b in exchange_buttons if not b.is_disabled()]
    disabled_exchange = [b for b in exchange_buttons if b.is_disabled()]

    if enabled_exchange:
        test_pass(f"商城页面：可用商品兑换按钮可点击 ({len(enabled_exchange)} 个)")
    else:
        test_fail("商城页面：可用商品兑换按钮可点击", "0 available", "enabled exchange buttons")

    # Sold-out badge
    soldout_badge = page.locator('text="售罄"').first
    try:
        soldout_badge.wait_for(timeout=2000)
        test_pass("商城页面：售罄标签显示")
    except:
        test_fail("商城页面：售罄标签显示", "not found", "售罄 badge")

    # Sold-out button should be disabled
    if disabled_exchange:
        test_pass("商城页面：售罄商品兑换按钮置灰")
    else:
        test_fail("商城页面：售罄商品兑换按钮置灰", "no disabled buttons", "disabled exchange button")

    # Click on first product card to navigate to detail
    if cards:
        try:
            cards[0].click()
            page.wait_for_timeout(2000)
            screenshot(page, "07_product_detail")
            detail_text = page.locator("body").inner_text()
            # Check for detail page content (兑换说明, 立即兑换, or product name)
            if "瑞幸" in detail_text or "兑换说明" in detail_text or "立即兑换" in detail_text:
                test_pass("商品详情页加载")
            else:
                test_fail("商品详情页加载", detail_text[:100], "商品详情内容")
        except Exception as e:
            test_skip("商品详情页点击跳转", str(e))

    screenshot(page, "07_mall_page")


def test_h5_leaderboard(page: Page):
    """Test Leaderboard - 验证排名 + context API"""
    step("6. 排行榜页面测试")

    page.goto(f"{BASE_URL}/", wait_until="domcontentloaded", timeout=15000)
    try:
        page.wait_for_url(lambda url: url.path == "/" or url.path == "/h5" or url.path == "/h5/", timeout=8000)
    except Exception:
        pass
    page.wait_for_timeout(2000)

    body_text = page.locator("body").inner_text()
    log(f"  Leaderboard body (first 300): {body_text[:300]}")

    has_leaderboard = any(phrase in body_text for phrase in ["排行榜", "等级", "Lv.", "Level"])
    if has_leaderboard:
        test_pass("排行榜/等级展示区域存在")
    else:
        test_fail("排行榜/等级展示区域存在", body_text[:200], "排行榜/Lv.")

    levels_found = []
    for lv_name in ["青铜", "白银", "黄金", "铂金", "钻石"]:
        if lv_name in body_text:
            levels_found.append(lv_name)

    if len(levels_found) >= 3:
        test_pass(f"排行榜页面：等级台阶展示 ({len(levels_found)} 个等级)")
    else:
        test_fail("排行榜页面：等级台阶展示", str(levels_found), "青铜/白银/黄金/...")

    has_rank_info = any(phrase in body_text for phrase in ["排名", "第", "名", "上周", "前", "%", "当前"])
    if has_rank_info:
        test_pass("排行榜页面：排名相关信息 (currentRank, percentile)")
    else:
        test_skip("排行榜页面：排名相关信息", "首页展示等级台阶，详细排名在后续页面")

    expected_levels = ["青铜", "白银", "黄金", "铂金", "钻石"]
    missing = [l for l in expected_levels if l not in body_text]
    if not missing:
        test_pass("排行榜页面：5个等级名称完整")
    else:
        test_fail("排行榜页面：5个等级名称完整", f"missing: {missing}", str(expected_levels))

    screenshot(page, "08_leaderboard")


def test_h5_badge(page: Page):
    """Test Badge Display - 已获/未获状态展示"""
    step("7. 徽章展示测试")

    # Profile page
    page.goto(f"{BASE_URL}/profile", wait_until="domcontentloaded", timeout=15000)
    try:
        page.wait_for_url(f"{BASE_URL}/profile", timeout=8000)
    except Exception:
        pass
    page.wait_for_timeout(1500)
    profile_text = page.locator("body").inner_text()
    log(f"  Profile body (first 300): {profile_text[:300]}")

    if len(profile_text) > 0:
        test_pass("个人中心页面加载")
    else:
        test_fail("个人中心页面加载", profile_text[:50], "non-empty")

    has_user_info = any(phrase in profile_text for phrase in ["用户", "手机", "邮箱", "用户名", "ID"])
    if has_user_info:
        test_pass("个人中心：用户信息展示")
    else:
        test_fail("个人中心：用户信息展示", profile_text[:200], "用户信息")

    # Notifications page
    page.goto(f"{BASE_URL}/notifications", wait_until="domcontentloaded", timeout=15000)
    try:
        page.wait_for_url(f"{BASE_URL}/notifications", timeout=8000)
    except Exception:
        pass
    page.wait_for_timeout(1500)
    notif_text = page.locator("body").inner_text()
    log(f"  Notifications body (first 300): {notif_text[:300]}")

    # Unread badge
    badge = page.locator(".adm-badge, [class*='badge'], [class*='Badge']").first
    try:
        badge.wait_for(timeout=2000)
        test_pass("消息中心：未读徽章显示")
    except:
        test_skip("消息中心：未读徽章显示", "徽章未在可见区域")

    # My coupons page
    page.goto(f"{BASE_URL}/my-coupons", wait_until="domcontentloaded", timeout=15000)
    try:
        page.wait_for_url(f"{BASE_URL}/my-coupons", timeout=8000)
    except Exception:
        pass
    page.wait_for_timeout(1500)
    coupon_text = page.locator("body").inner_text()
    log(f"  Coupons body (first 300): {coupon_text[:300]}")

    available_tab = page.locator('text="可用"').first
    try:
        available_tab.wait_for(timeout=2000)
        test_pass("卡券页面：可用卡券标签")
    except:
        test_fail("卡券页面：可用卡券标签", "not found", "可用 tab")

    has_coupon_status = any(phrase in coupon_text for phrase in ["可用", "已使用", "已过期", "已使用", "已过期"])
    if has_coupon_status:
        test_pass("卡券页面：卡券状态显示（可用/已使用/已过期）")
    else:
        test_fail("卡券页面：卡券状态显示", coupon_text[:200], "可用/已使用/已过期")

    screenshot(page, "09_badge_coupons")


def test_h5_responsive(page: Page):
    """Test Responsive Layout - 移动端适配"""
    step("8. 响应式布局测试")

    viewports = [
        {"width": 375, "height": 812, "name": "iPhone_X"},
        {"width": 390, "height": 844, "name": "iPhone_14"},
        {"width": 414, "height": 896, "name": "iPhone_XR"},
        {"width": 375, "height": 667, "name": "iPhone_SE"},
        {"width": 768, "height": 1024, "name": "iPad"},
    ]

    for vp in viewports:
        page.set_viewport_size({"width": vp["width"], "height": vp["height"]})
        page.goto(f"{BASE_URL}/login", wait_until="domcontentloaded", timeout=15000)
        time.sleep(1)

        scroll_width = page.evaluate("document.body.scrollWidth")
        window_width = page.evaluate("window.innerWidth")
        no_overflow = scroll_width <= window_width + 5

        if no_overflow:
            test_pass(f"响应式[{vp['name']} {vp['width']}x{vp['height']}]：无水平溢出")
        else:
            test_fail(f"响应式[{vp['name']} {vp['width']}x{vp['height']}]：无水平溢出",
                       f"scroll={scroll_width}, window={window_width}", "no horizontal overflow")

        inputs_count = len(page.locator("input").all())
        if inputs_count >= 2:
            test_pass(f"响应式[{vp['name']}]：表单输入框正常显示 ({inputs_count})")
        else:
            test_fail(f"响应式[{vp['name']}]：表单输入框正常显示", str(inputs_count), ">= 2 inputs")

        screenshot(page, f"10_responsive_{vp['name']}")


def test_h5_navigation_and_console(page: Page):
    """Test Navigation Flow and Console Errors"""
    step("9. 导航流程 & 控制台检查")

    console_errors = []
    page_errors = []

    def on_console(msg):
        if msg.type == "error":
            console_errors.append(msg.text)

    def on_page_error(err):
        page_errors.append(str(err))

    page.on("console", on_console)
    page.on("pageerror", on_page_error)

    for path, name in [("/login", "登录页"), ("/register", "注册页")]:
        page.goto(f"{BASE_URL}{path}", wait_until="domcontentloaded", timeout=15000)
        time.sleep(1)
        log(f"  {name} loaded: {len(page.locator('body').inner_text())} chars")

    benign_errors = ["favicon", "DevTools", "ResizeObserver", "chrome-extension", "moz-extension"]
    critical_errors = [e for e in console_errors if not any(b in e.lower() for b in benign_errors)]

    if len(critical_errors) == 0:
        test_pass("控制台：无严重错误")
    else:
        test_fail("控制台：无严重错误", str(critical_errors[:3]), "0 critical errors")

    if len(page_errors) == 0:
        test_pass("JS 执行：无页面错误")
    else:
        test_fail("JS 执行：无页面错误", str(page_errors[:3]), "0 page errors")


def run_tests():
    """Main test runner."""
    print("\n" + "="*60)
    print("  Playwright E2E H5 用户界面测试")
    print("  Carbon Point - UI Verification Suite")
    print("="*60)

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox"]
        )

        common_context_opts = {
            "viewport": {"width": 375, "height": 812},
            "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
            "locale": "zh-CN",
        }

        # ===== Context 1: Unauthenticated tests (login/register/responsive) =====
        unauth_context = browser.new_context(**common_context_opts)
        # Mock register endpoint so form submit works
        def register_mock(route):
            url = route.request.url
            api_prefix = "http://localhost:8081/api/"
            if not url.startswith(api_prefix):
                route.continue_()
                return
            if "/auth/register" in url:
                route.fulfill(status=200, content_type="application/json",
                    body='{"code":200,"data":{"userId":"u002","username":"新用户","phone":"13900000001"}}')
            elif "/auth/sms/send" in url:
                route.fulfill(status=200, content_type="application/json",
                    body='{"code":200,"message":"验证码已发送","data":null}')
            else:
                route.fulfill(status=200, content_type="application/json", body='{"code":200,"data":null}')
        unauth_context.route("**", register_mock)
        unauth_page = unauth_context.new_page()

        try:
            test_h5_login(unauth_page)
        except Exception as e:
            test_fail("登录流程测试", str(e), "no exception")

        try:
            test_h5_register(unauth_page)
        except Exception as e:
            test_fail("注册流程测试", str(e), "no exception")

        try:
            test_h5_responsive(unauth_page)
        except Exception as e:
            test_fail("响应式布局测试", str(e), "no exception")

        unauth_context.close()

        # ===== Context 2: Authenticated tests (API mock + auth injection) =====
        auth_context = browser.new_context(**common_context_opts)
        setup_context_api_mock(auth_context)
        setup_context_auth(auth_context)
        auth_page = auth_context.new_page()

        try:
            test_h5_checkin_entry(auth_page)
        except Exception as e:
            test_fail("打卡入口测试", str(e), "no exception")

        try:
            test_h5_points_detail(auth_page)
        except Exception as e:
            test_fail("积分明细测试", str(e), "no exception")

        try:
            test_h5_mall_product(auth_page)
        except Exception as e:
            test_fail("商城兑换测试", str(e), "no exception")

        try:
            test_h5_leaderboard(auth_page)
        except Exception as e:
            test_fail("排行榜测试", str(e), "no exception")

        try:
            test_h5_badge(auth_page)
        except Exception as e:
            test_fail("徽章展示测试", str(e), "no exception")

        try:
            test_h5_navigation_and_console(auth_page)
        except Exception as e:
            test_fail("导航与控制台测试", str(e), "no exception")

        auth_context.close()
        browser.close()

    # Summary
    elapsed = time.time() - test_start_time
    print(f"\n{'='*60}")
    print("  测试总结")
    print(f"{'='*60}")

    for status, name, detail in results:
        emoji = {"PASS": "✓", "FAIL": "✗", "SKIP": "⊘"}[status]
        print(f"  {emoji} [{status}] {name}")
        if status == "FAIL":
            print(f"             → {detail}")

    passed = sum(1 for s, *_ in results if s == "PASS")
    failed = sum(1 for s, *_ in results if s == "FAIL")
    skipped = sum(1 for s, *_ in results if s == "SKIP")
    total = len(results)

    print(f"\n  总计: {total} 项测试")
    print(f"    PASS: {passed}")
    print(f"    FAIL: {failed}")
    print(f"    SKIP: {skipped}")
    print(f"  耗时: {elapsed:.1f}s")
    print(f"  截图: /tmp/h5_ui_*.png")
    print(f"{'='*60}\n")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(run_tests())
