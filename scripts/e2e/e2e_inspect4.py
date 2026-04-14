"""Check what resources are still 404ing"""
from playwright.sync_api import sync_playwright


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})

    failed_requests = []
    def log_request(request):
        resp = request.response()
        if resp and resp.status >= 400:
            failed_requests.append({
                "url": request.url,
                "status": resp.status
            })

    page.on("request", log_request)

    page.goto("http://localhost:8081/dashboard/platform/auth/login")
    page.wait_for_timeout(5000)

    print("=== FAILED REQUESTS ===")
    for r in failed_requests:
        print(f"  {r['status']} {r['url']}")

    print(f"\n=== Root children: {page.locator('#root').evaluate('el => el.children.length')} ===")

    # Try to get the rendered content
    try:
        content = page.locator('#root').inner_html()
        print(f"Root content length: {len(content)}")
        if content:
            print(f"Root content (first 300): {content[:300]}")
    except:
        print("Could not get root content")

    # Check page text
    text = page.locator("body").inner_text()
    print(f"\nPage text (first 300): {text[:300]}")

    # Take screenshot
    page.screenshot(path="/tmp/e2e_login_debug.png", full_page=True)
    print("\nScreenshot saved to /tmp/e2e_login_debug.png")

    browser.close()
