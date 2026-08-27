from playwright.sync_api import sync_playwright

import os

BASE = os.environ.get("TIMELY_BASE_URL", "http://127.0.0.1:3002/")
errors = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    page.on("console", lambda message: errors.append(f"console:{message.type}:{message.text}") if message.type == "error" else None)
    page.on("pageerror", lambda error: errors.append(f"pageerror:{error}"))
    page.goto(BASE, wait_until="networkidle", timeout=30000)
    assert "Good morning" in page.locator("h1").first.inner_text()
    assert page.locator(".timeline").is_visible()
    page.screenshot(path=".freebuff/verify-desktop.png", full_page=True)

    page.set_viewport_size({"width": 390, "height": 844})
    page.goto(BASE, wait_until="networkidle", timeout=30000)
    assert page.locator(".mobile-nav").is_visible()
    page.locator(".mobile-more > button").click()
    for label in ["Study chat", "Notes", "Files", "Analytics", "Profile"]:
        assert page.locator(".mobile-more-menu button").filter(has_text=label).is_visible()
    page.screenshot(path=".freebuff/verify-mobile.png", full_page=True)

    assert not errors, errors
    print("verified dashboard and mobile navigation without browser errors")
    browser.close()
