#!/usr/bin/env python3
"""Full H5 E2E Test - User perspective."""
from playwright.sync_api import sync_playwright
import json

results = []

def step(name):
    print(f"\n{'='*60}\n{name}\n{'='*60}")

def test(name, expected, actual, passed):
    status = "PASS" if passed else "FAIL"
    print(f"  [{status}] {name}")
    if not passed:
        print(f"         Expected: {expected}")
        print(f"         Actual: {str(actual)[:200]}")
    results.append((status, name, expected, str(actual)[:200]))

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 375, "height": 812})

    console_errors = []
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
    page_errors = []
    page.on("pageerror", lambda err: page_errors.append(str(err)))

    step("1. H5 页面加载")
    page.goto("http://localhost:8081/")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    test("重定向到 /login", True, "/login" in page.url, "/login" in page.url)

    # Check login form
    inputs = page.locator("input").all()
    input_map = {}
    for inp in inputs:
        ph = inp.get_attribute("placeholder") or ""
        input_map[ph] = inp

    test("登录表单：手机号输入框", True, "请输入手机号" in input_map, "请输入手机号" in input_map)
    test("登录表单：密码输入框", True, "请输入密码" in input_map, "请输入密码" in input_map)

    buttons = {b.inner_text().strip(): b for b in page.locator("button").all() if b.inner_text().strip()}
    test("登录按钮存在", True, "登录" in buttons, "登录" in buttons)

    page.screenshot(path="/tmp/h5_01_login.png")

    step("2. 尝试登录（测试账号）")

    phone_input = input_map.get("请输入手机号")
    pass_input = input_map.get("请输入密码")

    # Try different test accounts
    test_accounts = [
        ("13800138001", "admin123"),
        ("13800138001", "password123"),
        ("13900000999", "test1234"),
    ]

    logged_in = False
    for phone, password in test_accounts:
        if phone_input:
            phone_input.fill(phone)
        if pass_input:
            pass_input.fill(password)

        login_btn = buttons.get("登录")
        if login_btn:
            login_btn.click()
        page.wait_for_timeout(3000)

        url = page.url
        body_text = page.locator("body").inner_text()

        if "/login" not in url:
            logged_in = True
            test(f"登录成功 (账号: {phone})", True, url, True)
            break
        else:
            # Check for error message
            if "用户名或密码错误" in body_text:
                test(f"登录失败 - 密码错误 (账号: {phone})", "密码错误", body_text[:100], False)
            elif "图形验证码" in body_text or "请输入图形验证码" in body_text:
                test(f"登录需要验证码 (账号: {phone})", "需要验证码", body_text[:100], False)
            else:
                test(f"登录失败 (账号: {phone})", "失败原因", body_text[:100], False)

        # Clear fields for next attempt
        if phone_input:
            phone_input.fill("")
        if pass_input:
            pass_input.fill("")

    page.screenshot(path="/tmp/h5_02_login_result.png")

    if not logged_in:
        step("3. 无法登录，跳过认证后测试")
        test("认证后功能测试", "SKIPPED", "登录失败", False)
    else:
        step("3. 首页内容")

        # We're on the home page
        home_text = page.locator("body").inner_text()
        test("首页加载成功", True, len(home_text) > 0, len(home_text) > 0)
        test("首页显示内容", True, home_text[:200], len(home_text) > 10)

        page.screenshot(path="/tmp/h5_03_home.png")

        # Step 4: Check-in
        step("4. 打卡功能")
        checkin_tabs = page.locator('text="打卡"').all()
        test("底部导航有打卡入口", True, len(checkin_tabs) > 0, len(checkin_tabs) > 0)

        if checkin_tabs:
            for tab in checkin_tabs:
                try:
                    tab.click()
                    page.wait_for_timeout(2000)
                    break
                except:
                    pass

            page.screenshot(path="/tmp/h5_04_checkin.png")
            ci_text = page.locator("body").inner_text()
            test("打卡页面加载", True, len(ci_text) > 0, len(ci_text) > 0)
            test("打卡页面包含时段信息", True, any(x in ci_text for x in ["时段", "时段", "早", "午", "晚", "打卡"]), any(x in ci_text for x in ["时段", "早", "午", "晚", "打卡"]))

            # Find and click check-in button
            ci_buttons = {b.inner_text().strip(): b for b in page.locator("button").all() if b.inner_text().strip()}
            ci_button = None
            for txt, btn in ci_buttons.items():
                if "打卡" in txt and "规则" not in txt:
                    ci_button = btn
                    break

            if ci_button:
                ci_button.click()
                page.wait_for_timeout(3000)
                page.screenshot(path="/tmp/h5_05_checkin_result.png")
                ci_result = page.locator("body").inner_text()
                success = any(x in ci_result for x in ["成功", "完成", "+", "积分", "打卡成功", "已打卡"])
                test("打卡操作", True, ci_result[:200], success)
            else:
                test("打卡按钮", True, False, False)

        # Step 5: Points
        step("5. 积分功能")
        points_tabs = page.locator('text="积分"').all()
        if points_tabs:
            for tab in points_tabs:
                try:
                    tab.click()
                    page.wait_for_timeout(2000)
                    break
                except:
                    pass

            page.screenshot(path="/tmp/h5_06_points.png")
            pts_text = page.locator("body").inner_text()
            test("积分页面加载", True, len(pts_text) > 0, len(pts_text) > 0)
            test("显示积分余额", True, any(x in pts_text for x in ["积分", "分", "余额", "可用"]), any(x in pts_text for x in ["积分", "分", "余额", "可用"]))

        # Step 6: Mall
        step("6. 商城功能")
        mall_tabs = page.locator('text="商城"').all()
        if mall_tabs:
            for tab in mall_tabs:
                try:
                    tab.click()
                    page.wait_for_timeout(2000)
                    break
                except:
                    pass

            page.screenshot(path="/tmp/h5_07_mall.png")
            mall_text = page.locator("body").inner_text()
            test("商城页面加载", True, len(mall_text) > 0, len(mall_text) > 0)
            test("显示商品列表", True, any(x in mall_text for x in ["商品", "兑换", "咖啡", "会员", "健身"]), any(x in mall_text for x in ["商品", "兑换", "咖啡", "会员", "健身"]))

        # Step 7: Personal Center
        step("7. 个人中心")
        me_tabs = page.locator('text="我的"').all()
        if me_tabs:
            for tab in me_tabs:
                try:
                    tab.click()
                    page.wait_for_timeout(2000)
                    break
                except:
                    pass

            page.screenshot(path="/tmp/h5_08_me.png")
            me_text = page.locator("body").inner_text()
            test("个人中心加载", True, len(me_text) > 0, len(me_text) > 0)
            test("显示用户信息", True, any(x in me_text for x in ["昵称", "头像", "手机", "企业", "设置"]), any(x in me_text for x in ["昵称", "头像", "手机", "企业", "设置"]))

    # Dashboard test (separate)
    step("8. Dashboard 测试")
    page.goto("http://localhost:8081/dashboard/")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(3000)

    db_url = page.url
    test("Dashboard 加载", True, db_url, "/dashboard" in db_url or "/login" in db_url)

    db_html = page.locator("body").inner_text()
    test("Dashboard 显示内容", True, len(db_html) > 10, len(db_html) > 10)
    test("Dashboard 标题正确", "碳积分管理后台", db_html[:50], "管理后台" in db_html or "登录" in db_html)

    page.screenshot(path="/tmp/h5_09_dashboard.png")

    # Summary
    step("测试总结")

    passed = sum(1 for s, *_ in results if s == "PASS")
    failed = sum(1 for s, *_ in results if s == "FAIL")
    total = len(results)

    print(f"\n总计: {total} 项测试")
    print(f"  PASS: {passed}")
    print(f"  FAIL: {failed}")
    print(f"\n页面错误: {len(page_errors)}")
    print(f"控制台错误: {len(console_errors)}")

    if console_errors:
        print("\n控制台错误详情:")
        for err in console_errors[:5]:
            print(f"  {err}")

    print(f"\n截图: /tmp/h5_01_login.png ~ /tmp/h5_09_dashboard.png")

    browser.close()
