"""Inspect full dashboard layout, navigation and pages"""
from playwright.sync_api import sync_playwright
import time


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})

    def log_console(msg):
        if msg.type in ["error", "warning"]:
            print(f"[{msg.type}] {msg.text}")

    page.on("console", log_console)

    # Try platform admin login first
    page.goto("http://localhost:8081/dashboard/platform/auth/login")
    page.wait_for_timeout(3000)
    print(f"Platform login URL: {page.url}")

    # Try the dashboard root
    page.goto("http://localhost:8081/dashboard/")
    page.wait_for_timeout(3000)
    print(f"Dashboard root URL: {page.url}")

    # Login with enterprise admin credentials
    page.goto("http://localhost:8081/login")
    page.wait_for_timeout(2000)

    page.fill("#login_phone", "13800138000")
    page.fill("#login_password", "admin123")
    page.click('button[type="submit"]')
    page.wait_for_timeout(3000)

    print(f"After login URL: {page.url}")

    # Take screenshot of dashboard
    page.screenshot(path="/tmp/e2e_dashboard_logged_in.png", full_page=True)
    print("Dashboard screenshot saved")

    # Check menu items
    menu_items = page.locator("[class*='menu'] li, .ant-menu li, [class*='sidebar'] li, [class*='nav'] li").all()
    print(f"\n=== MENU ITEMS ({len(menu_items)}) ===")
    for i, item in enumerate(menu_items[:20]):
        try:
            text = item.inner_text()
            if text.strip():
                print(f"  [{i}] {text.strip()[:80]}")
        except:
            pass

    # Get ALL visible text
    text = page.locator("body").inner_text()
    print(f"\n=== FULL PAGE TEXT (first 2000 chars) ===")
    print(text[:2000])

    # Check if there are sidebar/menu elements
    sidebar_selectors = [
        ".ant-layout-sider",
        "[class*='sider']",
        "[class*='sidebar']",
        "[class*='menu']",
        ".ant-menu",
        "[class*='layout']"
    ]
    for sel in sidebar_selectors:
        count = page.locator(sel).count()
        print(f"  {sel}: {count}")

    browser.close()
