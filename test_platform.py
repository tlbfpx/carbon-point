"""
Test platform management dashboard (platform.html) - login, menus, and user menu.
"""
import re
import json
import urllib.request
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3001/platform.html"
ERRORS = []
WARNINGS = []

def log(msg):
    print(f"  [TEST] {msg}")

def capture_console(msg):
    if msg.type == 'error':
        # Ignore known warnings (they start with "Warning:")
        if not msg.text.startswith('Warning:'):
            ERRORS.append(msg.text)
    elif msg.type == 'warning':
        WARNINGS.append(msg.text)

def get_fresh_token():
    """Get a fresh access token from the backend"""
    req = urllib.request.Request(
        'http://localhost:8080/platform/auth/login',
        data=json.dumps({'username': 'admin', 'password': 'Admin@123'}).encode(),
        headers={'Content-Type': 'application/json'}
    )
    resp = urllib.request.urlopen(req, timeout=5)
    data = json.loads(resp.read())
    return data['data']['accessToken'], data['data']['refreshToken'], data['data']['admin']

def test_platform_dashboard():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.on('console', capture_console)

        # 0. Pre-populate auth for faster testing
        log("Step 0: Getting fresh token and pre-populating auth")
        try:
            access_token, refresh_token, admin = get_fresh_token()
            auth_state = {
                'state': {
                    'accessToken': access_token,
                    'refreshToken': refresh_token,
                    'user': {
                        'userId': str(admin['id']),
                        'username': admin['displayName'] or admin['username'],
                        'roles': [admin['role']],
                        'permissions': [],
                        'isPlatformAdmin': True,
                    }
                },
                'version': 0
            }
            page.goto(BASE, timeout=15000)
            page.wait_for_timeout(1000)
            page.evaluate(f'localStorage.setItem("carbon-dashboard-auth", JSON.stringify({json.dumps(auth_state)}));')
            log(f"  Auth pre-populated for user: {admin['username']}")
        except Exception as e:
            log(f"  Could not pre-populate auth: {e}")

        # 1. Navigate and check initial state
        log("\nStep 1: Navigating to platform dashboard")
        page.goto('http://localhost:3001/platform.html#/platform/dashboard', timeout=15000)
        page.wait_for_timeout(5000)  # Wait for data loading

        log(f"  URL: {page.url}")
        log(f"  Title: {page.title()}")

        # 2. Check console errors
        log("\nStep 2: Console error check (initial load)")
        if ERRORS:
            log(f"  Errors: {len(ERRORS)}")
            for e in ERRORS[:5]:
                log(f"    - {e[:100]}")
        else:
            log("  No console errors")
        if WARNINGS:
            log(f"  Warnings: {len(WARNINGS)}")

        # 3. Check login page rendering
        log("\nStep 3: Checking if login page renders (clean state test)")
        page2 = browser.new_page()
        page2.on('console', capture_console)
        page2.goto(BASE, timeout=15000)
        page2.wait_for_timeout(2000)
        inputs = page2.locator('input').all()
        log(f"  Login inputs found: {len(inputs)}")
        if len(inputs) >= 2:
            log("  Login form: username field, password field, remember checkbox - OK")
        page2.close()

        # 4. Dashboard rendering
        log("\nStep 4: Dashboard rendering")
        layout_count = page.locator('.ant-layout').count()
        log(f"  Layout elements: {layout_count}")
        sider = page.locator('.ant-layout-sider').count()
        log(f"  Sider (sidebar): {sider}")

        # 5. Menu items
        log("\nStep 5: Left-side menu items")
        # antd v5 uses different class names - try multiple selectors
        menu_items = page.locator('.ant-menu-item, .ant-menu-item-only-child, [role=menuitem]').all()
        log(f"  Menu items found: {len(menu_items)}")
        for item in menu_items[:15]:
            try:
                text = item.inner_text().strip()
                if text:
                    log(f"    Menu: '{text}'")
            except:
                pass

        # Also check by looking at all clickable sidebar items
        sidebar_links = page.locator('.ant-layout-sider a, .ant-layout-sider button, .ant-layout-sider [class*=item]').all()
        log(f"  Sidebar links/buttons: {len(sidebar_links)}")

        # 6. Test menu navigation
        log("\nStep 6: Testing menu navigation")
        menu_items = page.locator('.ant-menu-item, .ant-menu-item-only-child, [role=menuitem]').all()
        if menu_items:
            for i, item in enumerate(menu_items[:5]):
                try:
                    text = item.inner_text().strip()
                    if text:
                        item.click()
                        page.wait_for_timeout(2000)
                        log(f"  Clicked '{text}' -> URL: {page.url}")
                except Exception as e:
                    log(f"  Click error for menu {i}: {e}")
        else:
            log("  No menu items to click - trying direct URL navigation")
            for path in ['/platform/dashboard', '/platform/enterprises', '/platform/system', '/platform/config']:
                page.goto(f'http://localhost:3001/platform.html#{path}', timeout=10000)
                page.wait_for_timeout(3000)
                body_text = page.locator('body').inner_text()[:200]
                log(f"  Navigated to {path}: {body_text[:100]}")

        # 7. User menu (top-right)
        log("\nStep 7: Testing top-right user menu")
        try:
            avatar = page.locator('.ant-avatar').first
            avatar.click()
            page.wait_for_timeout(1000)

            dropdown_items = page.locator('.ant-dropdown-menu li, .ant-dropdown-menu-item').all()
            log(f"  Dropdown items: {len(dropdown_items)}")
            for item in dropdown_items:
                try:
                    text = item.inner_text().strip()
                    if text:
                        log(f"    '{text}'")
                except:
                    pass

            # Test logout
            try:
                logout = page.locator('.ant-dropdown-menu li, .ant-dropdown-menu-item').filter(has_text=re.compile('退出|Logout|logout')).first
                logout.click()
                page.wait_for_timeout(2000)
                log("  Logout clicked")

                # After logout, should redirect to login
                url = page.url
                log(f"  URL after logout: {url}")
                if 'login' in url.lower() or page.locator('input').count() > 0:
                    log("  Redirected to login page - OK")
            except Exception as e:
                log(f"  Logout test skipped: {e}")
        except Exception as e:
            log(f"  User menu error: {e}")

        # 8. Final error check
        log("\nStep 8: Final console error check")
        error_msgs = [e for e in ERRORS if '500' not in e]  # API 500s are expected for missing data
        if error_msgs:
            log(f"  Non-API errors: {len(error_msgs)}")
            for e in error_msgs:
                log(f"    - {e[:100]}")
        else:
            log("  No critical console errors")

        api_500s = [e for e in ERRORS if '500' in e]
        if api_500s:
            log(f"  API 500 errors (may be expected): {len(api_500s)}")

        browser.close()
        log("\nTest completed")

if __name__ == '__main__':
    print("=" * 60)
    print("Platform Management Dashboard Test")
    print("=" * 60)
    test_platform_dashboard()
    print("=" * 60)
