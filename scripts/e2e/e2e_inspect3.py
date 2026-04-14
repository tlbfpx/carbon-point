"""Check network requests and fix 404 issues"""
from playwright.sync_api import sync_playwright


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})

    failed_requests = []
    def log_request(request):
        if request.response() and request.response().status >= 400:
            failed_requests.append({
                "url": request.url,
                "status": request.response().status
            })

    page.on("request", log_request)

    # Try the main dashboard
    page.goto("http://localhost:8081/dashboard/")
    page.wait_for_timeout(5000)

    print("=== FAILED REQUESTS ===")
    for r in failed_requests[:20]:
        print(f"  {r['status']} {r['url']}")

    print(f"\n=== Page title: {page.title()} ===")
    print(f"Root innerHTML length: {len(page.locator('#root').inner_html())}")

    # Try with trace enabled
    failed_requests.clear()
    page.goto("http://localhost:8081/dashboard/")
    page.wait_for_timeout(3000)

    # Check if index.html is serving correctly
    import requests
    resp = requests.get("http://localhost:8081/dashboard/")
    print(f"\nIndex response status: {resp.status_code}")
    print(f"Index content length: {len(resp.text)}")
    print(f"Index contains root: {'id=\"root\"' in resp.text}")
    # Check for asset URLs
    import re
    assets = re.findall(r'src="([^"]+)"', resp.text)
    print(f"Assets in index: {assets}")

    # Check if assets are accessible
    for asset in assets:
        if asset.startswith("/"):
            resp2 = requests.get(f"http://localhost:8081/dashboard{asset}")
            print(f"  GET {asset}: {resp2.status_code}, size={len(resp2.text)}")

    browser.close()
