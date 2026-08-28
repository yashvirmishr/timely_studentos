import os
import subprocess
import time
from pathlib import Path
from urllib.request import urlopen

import pytest
from playwright.sync_api import Page, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PORT = int(os.environ.get("TIMELY_TEST_PORT", "3011"))
BASE = os.environ.get("TIMELY_BASE_URL", f"http://127.0.0.1:{PORT}")


def wait_for_server(url: str, timeout: float = 45) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with urlopen(url, timeout=3) as response:
                if response.status < 500:
                    return
        except Exception:
            pass
        time.sleep(0.25)
    raise RuntimeError(f"Timed out waiting for {url}")


@pytest.fixture(scope="session")
def app_server():
    if os.environ.get("TIMELY_BASE_URL"):
        wait_for_server(BASE)
        yield None
        return
    command = ["npm.cmd", "run", "dev", "--", "-p", str(PORT)] if os.name == "nt" else ["npm", "run", "dev", "--", "-p", str(PORT)]
    server = subprocess.Popen(command, cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    try:
        wait_for_server(BASE)
        yield server
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait()


@pytest.fixture
def page(app_server):
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        page.set_default_timeout(15000)
        yield page
        browser.close()


def test_dashboard_and_desktop_navigation_contract(page: Page):
    page.goto(BASE, wait_until="networkidle")
    assert page.locator("h1").filter(has_text="Good ").is_visible()
    assert page.locator(".timeline").is_visible()
    assert page.locator(".focus-card").is_visible()

    for label in ["Schedule", "Academics", "Study chat", "Notes", "Files", "Analytics", "Settings"]:
        page.locator(".sidebar .nav-item").filter(has_text=label).first.click(force=True)
        page.wait_for_timeout(300)
        assert page.locator(".sidebar .nav-item.active").count() >= 1


def test_task_and_timer_controls(page: Page):
    page.goto(BASE, wait_until="networkidle")
    task = page.locator(".task-row").first
    task.locator(".fake-checkbox").click()
    assert task.locator("input.task-checkbox").is_checked()

    timer = page.locator(".focus-card")
    before = timer.locator(".pomodoro-time").inner_text()
    timer.locator(".dark-button").click()
    timer.locator(".dark-button").click()
    assert timer.locator(".pomodoro-time").inner_text() == before


def test_mobile_navigation_menu_contract(page: Page):
    page.goto(BASE, wait_until="networkidle")
    page.set_viewport_size({"width": 390, "height": 844})
    page.reload(wait_until="networkidle")
    assert page.locator(".mobile-nav").is_visible()
    assert page.locator(".mobile-nav").evaluate("el => el.children.length") == 5
    assert page.locator(".mobile-nav").evaluate("el => el.querySelectorAll('button').length") == 10
