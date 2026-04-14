from playwright.sync_api import sync_playwright
import time

console_errors = []
console_messages = []

def handle_console(msg):
    if msg.type == 'error':
        console_errors.append(f"[ERROR] {msg.text}")
    else:
        console_messages.append(f"[{msg.type.upper()}] {msg.text}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    # Capture console logs
    page.on('console', handle_console)
    
    print("=" * 60)
    print("Testing Enterprise Products and Orders Pages")
    print("=" * 60)
    
    # 1. Navigate to login page
    print("\n[1] Navigating to login page...")
    page.goto('http://localhost:3002')
    page.wait_for_load_state('networkidle')
    time.sleep(2)
    
    # Take screenshot of login page
    page.screenshot(path='/tmp/login_page.png', full_page=True)
    print("   Screenshot saved: /tmp/login_page.png")
    
    # 2. Login
    print("\n[2] Logging in with phone: 13800138001, password: admin123")
    
    # Try to find login fields - might be different selectors depending on the app
    try:
        # Common patterns for login forms
        phone_input = page.locator('input[type="tel"], input[placeholder*="手机"], input[placeholder*="phone"], input[name="phone"]').first
        password_input = page.locator('input[type="password"], input[placeholder*="密码"], input[placeholder*="password"]').first
        
        phone_input.fill('13800138001')
        password_input.fill('admin123')
        
        # Find and click login button
        login_btn = page.locator('button:has-text("登录"), button:has-text("登录"), button[type="submit"]').first
        login_btn.click()
        
        page.wait_for_load_state('networkidle')
        time.sleep(3)
        
        page.screenshot(path='/tmp/after_login.png', full_page=True)
        print("   Logged in, screenshot saved: /tmp/after_login.png")
        
    except Exception as e:
        print(f"   Login attempt error: {e}")
        page.screenshot(path='/tmp/login_error.png', full_page=True)
        print("   Screenshot saved: /tmp/login_error.png")
    
    # 3. Navigate to 商品管理 (Product Management)
    print("\n[3] Navigating to 商品管理 page...")
    
    try:
        # Try various selectors for product management link
        product_link = page.locator('text=商品管理, a:has-text("商品管理"), [href*="product"], [href*="goods"], [href*="mall"]').first
        product_link.click()
        page.wait_for_load_state('networkidle')
        time.sleep(2)
        
        page.screenshot(path='/tmp/product_management.png', full_page=True)
        print("   Product management screenshot: /tmp/product_management.png")
        
        # Check for product list
        print("\n[4] Checking product list...")
        product_items = page.locator('tr, .product-item, [class*="product"], [class*="goods"]').all()
        print(f"   Found {len(product_items)} product-related elements")
        
        # Check for add product button
        print("\n[5] Checking add product button...")
        add_btn = page.locator('button:has-text("添加"), button:has-text("新增"), button:has-text("新建"), [class*="add"], [class*="create"]').first
        if add_btn.is_visible():
            print("   Add product button: VISIBLE")
            add_btn.screenshot(path='/tmp/add_product_btn.png')
            print("   Add button screenshot: /tmp/add_product_btn.png")
        else:
            print("   Add product button: NOT VISIBLE")
            
    except Exception as e:
        print(f"   Product management navigation error: {e}")
        page.screenshot(path='/tmp/product_mgmt_error.png', full_page=True)
    
    # 4. Navigate to 订单管理 (Order Management)
    print("\n[6] Navigating to 订单管理 page...")
    
    try:
        order_link = page.locator('text=订单管理, a:has-text("订单管理"), [href*="order"]').first
        order_link.click()
        page.wait_for_load_state('networkidle')
        time.sleep(2)
        
        page.screenshot(path='/tmp/order_management.png', full_page=True)
        print("   Order management screenshot: /tmp/order_management.png")
        
        # Check for order list
        print("\n[7] Checking order list...")
        order_items = page.locator('tr, .order-item, [class*="order"]').all()
        print(f"   Found {len(order_items)} order-related elements")
        
        # Check for status filters
        print("\n[8] Checking status filters...")
        filter_elements = page.locator('[class*="filter"], [class*="status"], button:has-text("待"), button:has-text("已"), button:has-text("完成"), button:has-text("取消")').all()
        print(f"   Found {len(filter_elements)} filter-related elements")
        for f in filter_elements[:10]:  # Show first 10
            try:
                print(f"   - Filter: {f.text_content()[:50] if f.text_content() else 'no text'}")
            except:
                pass
        
    except Exception as e:
        print(f"   Order management navigation error: {e}")
        page.screenshot(path='/tmp/order_mgmt_error.png', full_page=True)
    
    # 5. Check all buttons and links
    print("\n[9] Checking all buttons and links on current page...")
    buttons = page.locator('button').all()
    links = page.locator('a[href]').all()
    print(f"   Total buttons: {len(buttons)}")
    print(f"   Total links: {len(links)}")
    
    # 6. Report console errors
    print("\n[10] Console Errors Report:")
    if console_errors:
        for err in console_errors:
            print(f"   {err}")
    else:
        print("   No console errors detected!")
    
    # Print any console messages (warnings/info)
    if console_messages:
        print("\n[11] Other Console Messages (first 10):")
        for msg in console_messages[:10]:
            print(f"   {msg}")
    
    # Final screenshot
    page.screenshot(path='/tmp/final_page.png', full_page=True)
    print("\n[12] Final screenshot: /tmp/final_page.png")
    
    print("\n" + "=" * 60)
    print("Testing Complete")
    print("=" * 60)
    
    browser.close()