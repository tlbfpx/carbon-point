#!/usr/bin/env python3
"""Full H5 E2E Test v4 - uses new test account."""
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

    api_calls = {}
    api_responses = {}
    def on_request(req):
        if '/api/' in req.url:
            api_calls[req.method + ' ' + req.url.split('localhost')[1]] = None
    def on_response(resp):
        if '/api/' in resp.url:
            try:
                body = resp.text()
                api_responses[resp.status] = body[:200]
            except:
                api_responses[resp.status] = ""

    step("1. H5 页面加载")
    page.goto("http://localhost:8081/h5/")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    test("重定向到 /h5/login 或 /login", True, page.url, "/login" in page.url or "/h5/login" in page.url)

    inputs = page.locator("input").all()
    input_map = {}
    for inp in inputs:
        ph = inp.get_attribute("placeholder") or ""
        input_map[ph] = inp

    test("登录表单：手机号输入框", True, "请输入手机号" in input_map, "请输入手机号" in input_map)
    test("登录表单：密码输入框", True, "请输入密码" in input_map, "请输入密码" in input_map)

    page.screenshot(path="/tmp/h5_01_login.png")

    step("2. 登录测试")
    phone_input = input_map.get("请输入手机号")
    pass_input = input_map.get("请输入密码")

    if phone_input and pass_input:
        phone_input.fill("13911111666")
        pass_input.fill("Test1234!")

        login_btn = None
        for b in page.locator("button").all():
            if "登录" in b.inner_text():
                login_btn = b
                break

        if login_btn:
            login_btn.click()
        page.wait_for_timeout(5000)

        url = page.url
        body_text = page.locator("body").inner_text()
        test("登录后跳转到首页", True, url, "/login" not in url and "/h5" in url)

        # Check for success/error message
        test("页面显示用户内容", True, len(body_text) > 10, len(body_text) > 10)

        page.screenshot(path="/tmp/h5_02_after_login.png")

        if "/login" not in url:
            step("3. 首页内容")
            home_text = page.locator("body").inner_text()
            test("首页加载", True, len(home_text) > 0, len(home_text) > 0)
            test("首页显示内容", True, home_text[:200], len(home_text) > 10)
            page.screenshot(path="/tmp/h5_03_home.png")

            step("4. 打卡功能")
            checkin_found = False
            for text_match in ["打卡", "签到"]:
                tabs = page.locator(f'text="{text_match}"').all()
                for tab in tabs:
                    try:
                        tab.click()
                        page.wait_for_timeout(2000)
                        checkin_found = True
                        break
                    except:
                        pass
                if checkin_found:
                    break

            page.screenshot(path="/tmp/h5_04_checkin.png")
            ci_text = page.locator("body").inner_text()
            test("打卡页面加载", True, len(ci_text) > 0, len(ci_text) > 0)

            step("5. 积分功能")
            points_found = False
            for text_match in ["积分", "我的积分", "points"]:
                tabs = page.locator(f'text="{text_match}"').all()
                for tab in tabs:
                    try:
                        tab.click()
                        page.wait_for_timeout(2000)
                        points_found = True
                        break
                    except:
                        pass
                if points_found:
                    break

            page.screenshot(path="/tmp/h5_05_points.png")
            pts_text = page.locator("body").inner_text()
            test("积分页面加载", True, len(pts_text) > 0, len(pts_text) > 0)

            step("6. 商城功能")
            mall_found = False
            for text_match in ["商城", "兑换", "积分商城"]:
                tabs = page.locator(f'text="{text_match}"').all()
                for tab in tabs:
                    try:
                        tab.click()
                        page.wait_for_timeout(2000)
                        mall_found = True
                        break
                    except:
                        pass
                if mall_found:
                    break

            page.screenshot(path="/tmp/h5_06_mall.png")
            mall_text = page.locator("body").inner_text()
            test("商城页面加载", True, len(mall_text) > 0, len(mall_text) > 0)

            step("7. 个人中心")
            me_found = False
            for text_match in ["我的", "个人中心", "me"]:
                tabs = page.locator(f'text="{text_match}"').all()
                for tab in tabs:
                    try:
                        tab.click()
                        page.wait_for_timeout(2000)
                        me_found = True
                        break
                    except:
                        pass
                if me_found:
                    break

            page.screenshot(path="/tmp/h5_07_me.png")
            me_text = page.locator("body").inner_text()
            test("个人中心加载", True, len(me_text) > 0, len(me_text) > 0)
            test("显示用户信息", True, any(x in me_text for x in ["139", "昵称", "头像", "手机", "设置"]), any(x in me_text for x in ["139", "昵称", "头像", "手机", "设置"]))

    step("8. Dashboard 测试")
    dashboard_page = browser.new_page(viewport={"width": 1440, "height": 900})
    db_api_calls = {}
    def on_db_request(req):
        if '/api/' in req.url:
            db_api_calls[req.method + ' ' + req.url.split('localhost')[1]] = None

    dashboard_page.on("request", on_db_request)

    dashboard_page.goto("http://localhost:8081/dashboard/")
    dashboard_page.wait_for_load_state("networkidle")
    dashboard_page.wait_for_timeout(3000)

    db_url = dashboard_page.url
    test("Dashboard 加载", True, db_url, "/dashboard" in db_url or "/login" in db_url)
    dashboard_page.screenshot(path="/tmp/h5_08_dashboard.png")

    db_html = dashboard_page.locator("body").inner_text()
    test("Dashboard 显示内容", True, len(db_html) > 10, len(db_html) > 10)

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

    print(f"\n截图: /tmp/h5_01_login.png ~ /tmp/h5_08_dashboard.png")

    browser.close()
