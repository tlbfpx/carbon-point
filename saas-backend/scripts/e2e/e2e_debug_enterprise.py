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
    api_responses.append(f"{response.status} {response.url}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    # Capture console logs and API responses
    page.on('console', handle_console)
    page.on('response', handle_response)
    
    print("=" * 60)
    print("Testing Enterprise Products and Orders Pages - DEBUG")
    print("=" * 60)
    
    # 1. Navigate to login page
    print("\n[1] Navigating to login page...")
    page.goto('http://localhost:3002')
    page.wait_for_load_state('networkidle')
    time.sleep(2)
    
    # Take screenshot of login page
    page.screenshot(path='/tmp/login_page.png', full_page=True)
    print("   Screenshot saved: /tmp/login_page.png")
    
    # Get all inputs on the page
    print("\n[2] Analyzing page inputs...")
    inputs = page.locator('input').all()
    print(f"   Found {len(inputs)} inputs:")
    for i, inp in enumerate(inputs):
        try:
            placeholder = inp.get_attribute('placeholder') or ''
            inp_type = inp.get_attribute('type') or ''
            name = inp.get_attribute('name') or ''
            print(f"   [{i}] type={inp_type}, name={name}, placeholder={placeholder}")
        except:
            print(f"   [{i}] Could not get attributes")
    
    # Get all buttons on the page
    print("\n[3] Analyzing page buttons...")
    buttons = page.locator('button').all()
    print(f"   Found {len(buttons)} buttons:")
    for i, btn in enumerate(buttons):
        try:
            text = btn.text_content() or ''
            btn_type = btn.get_attribute('type') or ''
            print(f"   [{i}] text={text[:50]}, type={btn_type}")
        except:
            print(f"   [{i}] Could not get attributes")
    
    # Get all links on the page
    print("\n[4] Analyzing page links...")
    links = page.locator('a').all()
    print(f"   Found {len(links)} links:")
    for i, link in enumerate(links):
        try:
            href = link.get_attribute('href') or ''
            text = link.text_content() or ''
            print(f"   [{i}] text={text[:50]}, href={href}")
        except:
            print(f"   [{i}] Could not get attributes")
    
    # Get page content to understand structure
    print("\n[5] Page HTML structure (first 3000 chars):")
    html = page.content()
    print(html[:3000])
    
    # 2. Try to login
    print("\n[6] Attempting login...")
    
    try:
        # Fill in the form fields
        all_inputs = page.locator('input').all()
        for inp in all_inputs:
            try:
                inp_type = inp.get_attribute('type') or ''
                placeholder = (inp.get_attribute('placeholder') or '').lower()
                if 'tel' in placeholder or '手机' in placeholder or 'phone' in placeholder:
                    inp.fill('13800138001')
                    print(f"   Filled phone field")
                elif 'password' in inp_type or '密码' in placeholder or 'password' in placeholder:
                    inp.fill('admin123')
                    print(f"   Filled password field")
            except Exception as e:
                print(f"   Error filling input: {e}")
        
        time.sleep(1)
        
        # Click the first submit button
        submit_btns = page.locator('button[type="submit"]').all()
        if submit_btns:
            submit_btns[0].click()
            print("   Clicked submit button")
        else:
            # Try any button with "login" or "登录" text
            login_btns = page.locator('button').all()
            for btn in login_btns:
                text = (btn.text_content() or '').lower()
                if '登录' in text or 'login' in text or 'sign' in text:
                    btn.click()
                    print(f"   Clicked login button: {text}")
                    break
        
        page.wait_for_load_state('networkidle')
        time.sleep(3)
        
        page.screenshot(path='/tmp/after_login.png', full_page=True)
        print("   After login screenshot: /tmp/after_login.png")
        
        # Get current URL
        print(f"\n   Current URL: {page.url}")
        
    except Exception as e:
        print(f"   Login error: {e}")
        page.screenshot(path='/tmp/login_error.png', full_page=True)
    
    # Report API responses
    print("\n[7] API Responses:")
    for resp in api_responses:
        print(f"   {resp}")
    
    # Report console errors
    print("\n[8] Console Errors:")
    if console_errors:
        for err in console_errors:
            print(f"   {err}")
    else:
        print("   No console errors!")
    
    print("\n" + "=" * 60)
    browser.close()