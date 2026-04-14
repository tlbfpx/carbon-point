#!/usr/bin/env python3
"""Reconnaissance script to discover H5 app structure."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 375, "height": 812})  # iPhone X viewport

    # Capture console messages
    console_logs = []
    page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

    print("=== Navigating to H5 ===")
    page.goto("http://localhost:8081/h5/")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    print(f"\nTitle: {page.title()}")
    print(f"URL: {page.url}")

    # Screenshot
    page.screenshot(path="/tmp/h5_home.png", full_page=True)
    print("\nScreenshot saved to /tmp/h5_home.png")

    # Get all buttons
    buttons = page.locator("button").all()
    print(f"\n=== Buttons ({len(buttons)}) ===")
    for b in buttons:
        try:
            txt = b.inner_text()
            cls = b.get_attribute("class") or ""
            disabled = b.get_attribute("disabled")
            print(f"  [{txt.strip()[:30]}] class={cls[:50]} disabled={disabled}")
        except:
            print(f"  <button (error reading)>")

    # Get all links
    links = page.locator("a").all()
    print(f"\n=== Links ({len(links)}) ===")
    for l in links[:20]:
        try:
            txt = l.inner_text()
            href = l.get_attribute("href") or ""
            print(f"  [{txt.strip()[:30]}] href={href[:60]}")
        except:
            pass

    # Get visible text content
    body_text = page.locator("body").inner_text()
    print(f"\n=== Visible Text (first 500 chars) ===")
    print(body_text[:500])

    # Check for forms / inputs
    inputs = page.locator("input").all()
    print(f"\n=== Inputs ({len(inputs)}) ===")
    for inp in inputs:
        try:
            ph = inp.get_attribute("placeholder") or ""
            type_attr = inp.get_attribute("type") or "text"
            name = inp.get_attribute("name") or ""
            print(f"  type={type_attr} name={name} placeholder={ph}")
        except:
            pass

    # Check for iframes
    iframes = page.locator("iframe").all()
    print(f"\n=== iFrames ({len(iframes)}) ===")
    for f in iframes:
        print(f"  src={f.get_attribute('src')}")

    print(f"\n=== Console Logs (first 20) ===")
    for log in console_logs[:20]:
        print(f"  {log}")

    browser.close()
