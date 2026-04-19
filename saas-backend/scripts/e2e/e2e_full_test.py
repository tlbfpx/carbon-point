from playwright.sync_api import sync_playwright
import time

console_errors = []
console_messages = []
api_responses = []

def handle_console(msg):
    if msg.type == 'error':
        console_errors.append(f"[ERROR] {msg.text}")
    else:
        console_messages.append(f"[{msg.type.upper()}] {msg.text}")

def handle_response(response):
    # Only log API calls, not static resources
    url = response.url
    if '/api/' in url or '/auth/' in url:
        api_responses.append(f"{response.status} {url}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    # Capture console logs and API responses
    page.on('console', handle_console)
    page.on('response', handle_response)
    
    print("=" * 60)
    print("Enterprise Products and Orders - Full Test")
    print("=" * 60)
    
    # 1. Login first
    print("\n[1] Logging in...")
    page.goto('http://localhost:3002/#/login')
    page.wait_for_load_state('networkidle')
    time.sleep(2)
    
    # Fill login form
    page.locator('input[placeholder="请输入手机号"]').fill('13800138001')
    page.locator('input[placeholder="请输入密码"]').fill('admin123')
    page.locator('button[type="submit"]').click()
    
    # Wait for potential redirect
    time.sleep(5)
    
    print(f"   URL after login: {page.url}")
    page.screenshot(path='/tmp/after_login.png', full_page=True)
    print("   Screenshot: /tmp/after_login.png")
    
    # Try direct navigation to enterprise pages
    print("\n[2] Testing direct navigation to enterprise pages...")
    
    # Navigate to Products page
    print("\n[3] Navigating to Products page...")
    page.goto('http://localhost:3002/#/enterprise/products')
    page.wait_for_load_state('networkidle')
    time.sleep(3)
    
    print(f"   URL: {page.url}")
    page.screenshot(path='/tmp/products_page.png', full_page=True)
    print("   Screenshot: /tmp/products_page.png")
    
    # Get page structure
    print("\n[4] Analyzing Products page...")
    buttons = page.locator('button').all()
    print(f"   Buttons ({len(buttons)}):")
    for btn in buttons:
        try:
            text = btn.text_content() or ''
            if text.strip():
                print(f"   - {text.strip()[:60]}")
        except:
            pass
    
    # Check for product table/list
    tables = page.locator('table, .ant-table, [class*="table"]').all()
    print(f"   Tables found: {len(tables)}")
    
    # Check for add button
    add_btns = page.locator('button:has-text("添加"), button:has-text("新增"), button:has-text("新建"), button:has-text("添加商品")').all()
    print(f"   Add product buttons: {len(add_btns)}")
    for btn in add_btns:
        try:
            print(f"   - Add button: {btn.text_content()[:50]}")
        except:
            pass
    
    # Check for any visible text
    body_text = page.locator('body').text_content() or ''
    print(f"\n   Page text content (first 500 chars):\n   {body_text[:500]}")
    
    # Navigate to Orders page
    print("\n[5] Navigating to Orders page...")
    page.goto('http://localhost:3002/#/enterprise/orders')
    page.wait_for_load_state('networkidle')
    time.sleep(3)
    
    print(f"   URL: {page.url}")
    page.screenshot(path='/tmp/orders_page.png', full_page=True)
    print("   Screenshot: /tmp/orders_page.png")
    
    # Analyze Orders page
    print("\n[6] Analyzing Orders page...")
    buttons = page.locator('button').all()
    print(f"   Buttons ({len(buttons)}):")
    for btn in buttons:
        try:
            text = btn.text_content() or ''
            if text.strip():
                print(f"   - {text.strip()[:60]}")
        except:
            pass
    
    # Check for status filters
    filter_elements = page.locator('[class*="filter"], [class*="status"], .ant-segmented, .ant-radio-group, button:has-text("待"), button:has-text("已"), button:has-text("完成"), button:has-text("取消")').all()
    print(f"\n   Status filters found: {len(filter_elements)}")
    for f in filter_elements[:10]:
        try:
            text = f.text_content() or ''
            print(f"   - {text[:60]}")
        except:
            pass
    
    # Check for order table
    tables = page.locator('table, .ant-table, [class*="table"]').all()
    print(f"\n   Tables found: {len(tables)}")
    
    # API responses
    print("\n[7] API Calls:")
    if api_responses:
        for resp in api_responses:
            print(f"   {resp}")
    else:
        print("   No API calls detected")
    
    # Console errors
    print("\n[8] Console Errors:")
    if console_errors:
        for err in console_errors:
            print(f"   {err}")
    else:
        print("   No console errors!")
    
    print("\n" + "=" * 60)
    browser.close()
    print("Test complete!")