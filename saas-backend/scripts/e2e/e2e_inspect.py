"""Inspect the platform admin login page to find correct selectors"""
from playwright.sync_api import sync_playwright


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})

    # Capture all console messages
    page.on("console", lambda msg: print(f"[{msg.type}] {msg.text}") if msg.type in ["error", "warning"] else None)

    # Go to login page
    page.goto("http://localhost:8081/dashboard/platform/auth/login")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(3000)

    # Take screenshot
    page.screenshot(path="/tmp/e2e_login_page.png", full_page=True)
    print("Login page screenshot saved")

    # Get all inputs
    inputs = page.locator("input").all()
    print(f"\n=== INPUTS ({len(inputs)}) ===")
    for i, inp in enumerate(inputs):
        try:
            attrs = inp.evaluate("""el => ({
                type: el.type,
                placeholder: el.placeholder,
                name: el.name,
                id: el.id,
                className: el.className
            })""")
            print(f"  [{i}] {attrs}")
        except Exception as e:
            print(f"  [{i}] Error: {e}")

    # Get all buttons
    buttons = page.locator("button").all()
    print(f"\n=== BUTTONS ({len(buttons)}) ===")
    for i, btn in enumerate(buttons):
        try:
            attrs = btn.evaluate("""el => ({
                text: el.innerText,
                type: el.type,
                className: el.className
            })""")
            print(f"  [{i}] {attrs}")
        except Exception as e:
            print(f"  [{i}] Error: {e}")

    # Get all images
    images = page.locator("img").all()
    print(f"\n=== IMAGES ({len(images)}) ===")
    for i, img in enumerate(images):
        try:
            src = img.get_attribute("src")
            alt = img.get_attribute("alt")
            print(f"  [{i}] src={src}, alt={alt}")
        except Exception as e:
            print(f"  [{i}] Error: {e}")

    # Get page text content
    text = page.locator("body").inner_text()
    print(f"\n=== PAGE TEXT (first 500 chars) ===")
    print(text[:500])

    browser.close()
