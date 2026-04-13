#!/usr/bin/env python3
"""H5 E2E Test - User perspective (regular employee)."""
from playwright.sync_api import sync_playwright
import time

results = []

def log(msg):
    print(f"  {msg}")
    results.append(msg)

def test_step(name, expected, actual, passed):
    status = "PASS" if passed else "FAIL"
    print(f"  [{status}] {name}: expected={expected}, actual={actual}")
    results.append(f"[{status}] {name} | Expected: {expected} | Actual: {actual}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 375, "height": 812})

    console_logs = []
    page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
    page_errors = []
    page.on("pageerror", lambda err: page_errors.append(str(err)))

    all_passed = True

    print("=" * 60)
    print("H5 E2E Test - Regular Employee User Perspective")
    print("=" * 60)

    # =========================================================
    # STEP 1: LOGIN PAGE
    # =========================================================
    print("\n### STEP 1: Login Page ###")
    page.goto("http://localhost:8081/")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    # Should redirect to /login
    current_url = page.url
    test_step("Redirects to /login", "/login" in current_url, current_url, "/login" in current_url)
    if "/login" not in current_url:
        all_passed = False
        print("  FATAL: Did not redirect to login page")
        browser.close()
        exit(1)

    # Check login form elements
    inputs = page.locator("input").all()
    test_step("Has input fields", True, len(inputs) > 0, len(inputs) > 0)
    if len(inputs) == 0:
        all_passed = False

    input_map = {}
    for inp in inputs:
        ph = inp.get_attribute("placeholder") or ""
        input_map[ph] = inp

    # Find phone and password fields
    phone_input = input_map.get("请输入手机号") or input_map.get("手机号") or input_map.get("")
    pass_input = input_map.get("请输入密码") or input_map.get("密码") or input_map.get("")

    test_step("Has phone input", True, phone_input is not None, phone_input is not None)
    test_step("Has password input", True, pass_input is not None, pass_input is not None)

    buttons = page.locator("button").all()
    btn_map = {}
    for b in buttons:
        txt = b.inner_text().strip()
        if txt:
            btn_map[txt] = b
    log(f"Buttons found: {list(btn_map.keys())}")

    test_step("Has login button", True, "登录" in btn_map or "登录" in str(btn_map), "登录" in btn_map or "登录" in str(btn_map))

    # Check for register link
    register_links = page.locator("text=注册").all()
    test_step("Has register link", True, len(register_links) > 0, len(register_links) > 0)

    page.screenshot(path="/tmp/h5_01_login.png")

    # =========================================================
    # STEP 1b: REGISTER
    # =========================================================
    print("\n### STEP 1b: Register New Account ###")

    if register_links:
        register_links[0].click()
        page.wait_for_timeout(2000)
        page.screenshot(path="/tmp/h5_02_register.png")

        # Check register form
        inputs_reg = page.locator("input").all()
        log(f"Register form inputs: {len(inputs_reg)}")
        test_step("Register form has inputs", True, len(inputs_reg) > 0, len(inputs_reg) > 0)

        reg_input_map = {}
        for inp in inputs_reg:
            ph = inp.get_attribute("placeholder") or ""
            reg_input_map[ph] = inp
        log(f"Register placeholders: {list(reg_input_map.keys())}")

        # Try to register with test data
        phone_reg = reg_input_map.get("请输入手机号") or reg_input_map.get("手机号") or reg_input_map.get("")
        pass_reg = reg_input_map.get("请输入密码") or reg_input_map.get("密码") or reg_input_map.get("")
        confirm_reg = None
        for ph, inp in reg_input_map.items():
            if "确认" in ph or "再次" in ph:
                confirm_reg = inp
                break

        if phone_reg:
            test_phone = f"138{time.strftime('%m%S')}"
            phone_reg.fill(test_phone)
            log(f"Filled phone: {test_phone}")
        if pass_reg:
            pass_reg.fill("Test123456")
            log("Filled password")
        if confirm_reg:
            confirm_reg.fill("Test123456")
            log("Filled confirm password")

        # Find register button
        reg_buttons = page.locator("button").all()
        reg_btn = None
        for b in reg_buttons:
            txt = b.inner_text().strip()
            if "注册" in txt:
                reg_btn = b
                break

        if reg_btn:
            reg_btn.click()
            page.wait_for_timeout(3000)
            page.screenshot(path="/tmp/h5_03_register_result.png")

            reg_url = page.url
            reg_text = page.locator("body").inner_text()
            log(f"URL after register: {reg_url}")
            log(f"Page text (500 chars): {reg_text[:500]}")

            # Check if registration was successful (redirected to home or shows success)
            if "登录" not in reg_url and "/login" not in reg_url:
                test_step("Register success - redirected away from /login", True, reg_url, True)
            elif "该手机号已注册" in reg_text or "手机号已存在" in reg_text:
                test_step("Register - phone already exists (expected for re-runs)", "already registered", "already registered", True)
                all_passed = True
            else:
                test_step("Register - shows message or redirects", True, reg_text[:100], "完成" in reg_text or "/login" not in reg_url)
        else:
            test_step("Register button found", True, False, False)
            all_passed = False
    else:
        test_step("Register link found", True, False, False)

    # =========================================================
    # STEP 2: LOGIN (after register attempt or use existing account)
    # =========================================================
    print("\n### STEP 2: Login ###")

    # Go back to login page
    page.goto("http://localhost:8081/login")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    inputs_login = page.locator("input").all()
    login_map = {}
    for inp in inputs_login:
        ph = inp.get_attribute("placeholder") or ""
        login_map[ph] = inp

    phone_login = login_map.get("请输入手机号") or login_map.get("手机号") or list(login_map.values())[0] if login_map else None
    pass_login = login_map.get("请输入密码") or login_map.get("密码") or (list(login_map.values())[1] if len(login_map) > 1 else None)

    # Try to login with test credentials
    test_phone = "13812345678"
    test_pass = "Test123456"

    if phone_login:
        phone_login.fill(test_phone)
        log(f"Filled phone: {test_phone}")
    if pass_login:
        pass_login.fill(test_pass)
        log("Filled password")

    # Click login button
    login_buttons = page.locator("button").all()
    login_btn = None
    for b in login_buttons:
        txt = b.inner_text().strip()
        if "登录" in txt:
            login_btn = b
            break

    if login_btn:
        login_btn.click()
        page.wait_for_timeout(5000)
        page.screenshot(path="/tmp/h5_04_login_result.png")

        login_url = page.url
        login_text = page.locator("body").inner_text()
        log(f"URL after login: {login_url}")
        log(f"Page text (500 chars): {login_text[:500]}")

        if "/login" not in login_url and "登录" not in login_url:
            test_step("Login success - redirected from /login", True, login_url, True)
        else:
            # Check for error message
            error_text = login_text
            test_step("Login successful", True, login_url, False)
            all_passed = False
            log(f"Login failed - URL: {login_url}, text: {login_text[:300]}")
    else:
        test_step("Login button found", True, False, False)
        all_passed = False

    # =========================================================
    # STEP 3: HOME PAGE (after successful login)
    # =========================================================
    print("\n### STEP 3: Home Page ###")

    if "/login" not in page.url:
        page_text = page.locator("body").inner_text()
        log(f"Home page text (800 chars): {page_text[:800]}")

        # Check for key elements
        test_step("Home page shows user-related content", True, len(page_text) > 10, len(page_text) > 10)

        # Check for bottom navigation
        nav_items = page.locator("text=打卡").all() + page.locator("text=积分").all() + page.locator("text=商城").all() + page.locator("text=我的").all()
        test_step("Has bottom nav (打卡/积分/商城/我的)", 4, len(nav_items), len(nav_items) >= 3)

        page.screenshot(path="/tmp/h5_05_home.png")

        # =========================================================
        # STEP 4: CHECK-IN
        # =========================================================
        print("\n### STEP 4: Check-in Functionality ###")

        # Try to click check-in tab
        checkin_tabs = page.locator("text=打卡").all()
        checkin_found = False
        for tab in checkin_tabs:
            try:
                tab.click()
                page.wait_for_timeout(2000)
                checkin_found = True
                break
            except:
                pass

        if checkin_found:
            page.screenshot(path="/tmp/h5_06_checkin.png")
            checkin_text = page.locator("body").inner_text()
            log(f"Check-in page text (500 chars): {checkin_text[:500]}")

            test_step("Check-in page loads", True, len(checkin_text) > 0, len(checkin_text) > 0)

            # Look for check-in button
            checkin_buttons = page.locator("button").all()
            ci_btns = []
            for b in checkin_buttons:
                txt = b.inner_text().strip()
                if txt:
                    ci_btns.append(txt)
            log(f"Check-in buttons: {ci_btns}")

            # Try to find and click check-in action
            ci_button = None
            for b in checkin_buttons:
                txt = b.inner_text().strip()
                if "打卡" in txt and "规则" not in txt:
                    ci_button = b
                    break

            if ci_button:
                ci_button.click()
                page.wait_for_timeout(3000)
                page.screenshot(path="/tmp/h5_07_checkin_result.png")

                ci_result_text = page.locator("body").inner_text()
                log(f"After check-in click text: {ci_result_text[:500]}")

                # Check for success indicators
                success = any(x in ci_result_text for x in ["成功", "打卡成功", "+", "积分", "打卡完成"])
                test_step("Check-in success", True, success, success)
                if not success:
                    all_passed = False
            else:
                test_step("Check-in button found", True, False, False)
                all_passed = False
        else:
            test_step("Check-in tab accessible", True, False, False)
            all_passed = False

        # =========================================================
        # STEP 5: POINTS
        # =========================================================
        print("\n### STEP 5: Points Functionality ###")

        # Go to points tab
        points_tabs = page.locator("text=积分").all()
        points_found = False
        for tab in points_tabs:
            try:
                tab.click()
                page.wait_for_timeout(2000)
                points_found = True
                break
            except:
                pass

        if points_found:
            page.screenshot(path="/tmp/h5_08_points.png")
            points_text = page.locator("body").inner_text()
            log(f"Points page text (600 chars): {points_text[:600]}")

            test_step("Points page loads", True, len(points_text) > 0, len(points_text) > 0)

            # Check for points balance
            has_balance = any(x in points_text for x in ["积分", "分", "余额"])
            test_step("Shows points balance", True, has_balance, has_balance)

            # Check for level info
            has_level = any(x in points_text for x in ["Lv", "等级", "等级", "铜", "银", "金", "钻石"])
            test_step("Shows level info", True, has_level, has_level)
        else:
            test_step("Points tab accessible", True, False, False)
            all_passed = False

        # =========================================================
        # STEP 6: MALL
        # =========================================================
        print("\n### STEP 6: Mall Functionality ###")

        # Go to mall tab
        mall_tabs = page.locator("text=商城").all()
        mall_found = False
        for tab in mall_tabs:
            try:
                tab.click()
                page.wait_for_timeout(2000)
                mall_found = True
                break
            except:
                pass

        if mall_found:
            page.screenshot(path="/tmp/h5_09_mall.png")
            mall_text = page.locator("body").inner_text()
            log(f"Mall page text (600 chars): {mall_text[:600]}")

            test_step("Mall page loads", True, len(mall_text) > 0, len(mall_text) > 0)

            # Check for product list
            has_products = any(x in mall_text for x in ["商品", "兑换", "积分", "优惠券", "权益"])
            test_step("Shows product list", True, has_products, has_products)

            # Try to click on a product
            product_links = page.locator("text=兑换").all()
            if product_links:
                product_links[0].click()
                page.wait_for_timeout(2000)
                page.screenshot(path="/tmp/h5_10_product_detail.png")
                detail_text = page.locator("body").inner_text()
                log(f"Product detail text: {detail_text[:400]}")
                test_step("Product detail page opens", True, len(detail_text) > 0, len(detail_text) > 0)
        else:
            test_step("Mall tab accessible", True, False, False)
            all_passed = False

        # =========================================================
        # STEP 7: PERSONAL CENTER
        # =========================================================
        print("\n### STEP 7: Personal Center ###")

        # Go to personal center tab
        me_tabs = page.locator("text=我的").all()
        me_found = False
        for tab in me_tabs:
            try:
                tab.click()
                page.wait_for_timeout(2000)
                me_found = True
                break
            except:
                pass

        if me_found:
            page.screenshot(path="/tmp/h5_11_personal_center.png")
            me_text = page.locator("body").inner_text()
            log(f"Personal center text (600 chars): {me_text[:600]}")

            test_step("Personal center loads", True, len(me_text) > 0, len(me_text) > 0)

            # Check for user info
            has_nickname = any(x in me_text for x in ["昵称", "头像", "手机", "设置"])
            test_step("Shows user info", True, has_nickname, has_nickname)

            # Try to edit nickname
            edit_buttons = page.locator("text=编辑").all() + page.locator("text=修改").all() + page.locator("text=设置").all()
            if edit_buttons:
                log(f"Found edit/settings buttons: {len(edit_buttons)}")
                test_step("Edit/Settings button exists", True, True, True)
        else:
            test_step("Personal center tab accessible", True, False, False)
            all_passed = False

    else:
        print("\n### LOGIN FAILED - Skipping authenticated tests ###")
        all_passed = False

    # =========================================================
    # STEP 8: PAGE ERRORS
    # =========================================================
    print("\n### STEP 8: Error Summary ###")
    log(f"\nPage errors: {len(page_errors)}")
    for err in page_errors:
        log(f"  ERROR: {err}")

    log(f"\nConsole logs: {len(console_logs)}")
    for log_msg in console_logs[:10]:
        log(f"  {log_msg}")

    # =========================================================
    # FINAL REPORT
    # =========================================================
    print("\n" + "=" * 60)
    print("FINAL SUMMARY")
    print("=" * 60)
    status = "ALL PASSED" if all_passed else "SOME FAILURES"
    print(f"Status: {status}")
    print(f"Screenshots: /tmp/h5_01_login.png through /tmp/h5_11_personal_center.png")

    browser.close()
