import json
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("TIMELY_BASE_URL", "http://127.0.0.1:3004")
OUT = Path(".freebuff")


def main():
    console_messages = []
    failed_requests = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        page = context.new_page()
        page.on("console", lambda message: console_messages.append({"type": message.type, "text": message.text}) if message.type in ("error", "warning") else None)
        page.on("requestfailed", lambda request: failed_requests.append({"url": request.url, "failure": request.failure}))

        page.goto(BASE)
        page.wait_for_load_state("networkidle")
        page.screenshot(path=str(OUT / "webapp-desktop.png"), full_page=True)
        buttons = page.locator("button").all_text_contents()
        print("initial_url:", page.url)
        print("initial_heading:", page.locator("h1").first.text_content())
        print("button_count:", len(buttons))
        print("button_sample:", json.dumps(buttons[:12]))
        print("desktop_scroll_width:", page.evaluate("document.documentElement.scrollWidth"))
        print("desktop_client_width:", page.evaluate("document.documentElement.clientWidth"))

        page.locator(".task-row").first.locator(".fake-checkbox").click()
        assert page.locator(".task-row").first.locator("input.task-checkbox").is_checked()
        print("task_toggle: passed")

        page.get_by_role("button", name="Quick add").click()
        page.locator("[role=dialog]").wait_for(state="visible")
        print("quick_add_dialog: passed")
        page.get_by_role("button", name="Close dialog").click()

        for label, selector in [
            ("Schedule", ".week-grid"),
            ("Academics", ".subject-grid"),
            ("Study chat", ".chat-window"),
            ("Notes", ".notes-grid"),
            ("Files", ".file-table"),
            ("Analytics", ".analytics-grid"),
            ("Settings", ".profile-settings-grid"),
        ]:
            page.locator(".sidebar button.nav-item").filter(has_text=label).click()
            page.locator(selector).wait_for(state="visible")
            print(f"navigation_{label.lower().replace(' ', '_')}: passed")

        page.locator(".sidebar button.nav-item").filter(has_text="Schedule").click()
        page.locator(".week-grid").wait_for(state="visible")
        original_week = page.locator(".week-switcher strong").text_content()
        page.get_by_role("button", name="Next week").click()
        next_week = page.locator(".week-switcher strong").text_content()
        assert original_week != next_week
        page.get_by_role("button", name="Day").click()
        page.locator(".agenda-view").wait_for(state="visible")
        page.get_by_role("button", name="Agenda").click()
        page.locator(".agenda-view").wait_for(state="visible")
        print("schedule_tabs_and_week_navigation: passed")

        page.set_viewport_size({"width": 390, "height": 844})
        page.wait_for_timeout(150)
        page.screenshot(path=str(OUT / "webapp-mobile.png"), full_page=True)
        print("mobile_nav_visible:", page.locator(".mobile-nav").is_visible())
        print("mobile_scroll_width:", page.evaluate("document.documentElement.scrollWidth"))
        print("mobile_client_width:", page.evaluate("document.documentElement.clientWidth"))
        assert page.locator(".mobile-nav").is_visible()
        assert page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1")

        print("console_messages:", json.dumps(console_messages))
        print("failed_requests:", json.dumps(failed_requests))
        assert not [message for message in console_messages if message["type"] == "error"]
        assert not failed_requests
        context.close()
        browser.close()


if __name__ == "__main__":
    main()
