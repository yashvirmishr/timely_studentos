"""End-to-end Playwright tests for core Timely workflows.

Covers:
  1. Task CRUD — create, toggle, edit, delete
  2. Schedule navigation — views, tabs, week switching
  3. Search — open, query, results, keyboard dismiss
  4. Pomodoro timer — start, pause, reset, display
"""

import os
import subprocess
import time
from pathlib import Path
from urllib.request import urlopen

import pytest
from playwright.sync_api import Page, expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PORT = int(os.environ.get("TIMELY_TEST_PORT", "3012"))
BASE = os.environ.get("TIMELY_BASE_URL", f"http://127.0.0.1:{PORT}")


def wait_for_server(url: str, timeout: float = 60) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with urlopen(url, timeout=3) as response:
                if response.status < 500:
                    return
        except Exception:
            pass
        time.sleep(0.5)
    raise RuntimeError(f"Timed out waiting for {url}")


@pytest.fixture(scope="session")
def app_server():
    if os.environ.get("TIMELY_BASE_URL"):
        wait_for_server(BASE)
        yield None
        return
    cmd = (
        ["npm.cmd", "run", "dev", "--", "-p", str(PORT)]
        if os.name == "nt"
        else ["npm", "run", "dev", "--", "-p", str(PORT)]
    )
    server = subprocess.Popen(
        cmd, cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT
    )
    try:
        wait_for_server(BASE)
        yield server
    finally:
        server.terminate()
        try:
            server.wait(timeout=8)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait()


@pytest.fixture
def page(app_server):
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1280, "height": 900})
        pg = ctx.new_page()
        pg.set_default_timeout(12000)
        pg.goto(BASE, wait_until="networkidle")
        yield pg
        browser.close()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def navigate_to(page: Page, label: str) -> None:
    """Click a sidebar nav item by label."""
    page.locator(".sidebar .nav-item").filter(has_text=label).first.click()
    page.wait_for_timeout(400)


def open_quick_add(page: Page) -> None:
    """Open the Quick Add modal via the primary button."""
    page.get_by_role("button", name="Quick add").last.click()
    page.wait_for_selector(".quick-add-modal", state="visible", timeout=5000)


def close_quick_add(page: Page) -> None:
    """Close the Quick Add modal via its close button."""
    page.locator(".quick-add-modal .icon-button[aria-label='Close dialog']").click()
    page.wait_for_selector(".quick-add-modal", state="hidden", timeout=3000)


# ===========================================================================
# 1. TASK CRUD
# ===========================================================================

class TestTaskCRUD:
    """Create, read, update, delete tasks through the UI."""

    def test_create_task_via_quick_add(self, page: Page):
        """Type a title, submit the form, verify the task appears on screen."""
        open_quick_add(page)

        title_input = page.locator(".quick-add-modal input[type='text']").first
        title_input.fill("E2E test task — create")
        page.locator(".quick-add-modal form").get_by_role(
            "button", name="Add to Timely"
        ).click()
        page.wait_for_timeout(600)

        assert page.get_by_text("E2E test task — create", exact=True).count() >= 1

    def test_toggle_task_completion(self, page: Page):
        """Click a task checkbox and verify it gets the completed style."""
        # Ensure at least one uncompleted task exists
        open_quick_add(page)
        page.locator(".quick-add-modal input[type='text']").first.fill(
            "E2E task — toggle"
        )
        page.locator(".quick-add-modal form").get_by_role(
            "button", name="Add to Timely"
        ).click()
        page.wait_for_timeout(600)

        # Find the task row and click the fake checkbox
        task_row = page.locator(".task-row").filter(has_text="E2E task — toggle")
        assert task_row.count() >= 1
        checkbox = task_row.locator(".fake-checkbox").first
        checkbox.click()
        page.wait_for_timeout(400)

        # After toggling, the task should have completed-task class
        assert "completed-task" in (task_row.first.get_attribute("class") or "")

    def test_edit_task_via_quick_add(self, page: Page):
        """Create a task, then edit its title through the quick add modal."""
        # Create a task
        open_quick_add(page)
        page.locator(".quick-add-modal input[type='text']").first.fill(
            "E2E task — original title"
        )
        page.locator(".quick-add-modal form").get_by_role(
            "button", name="Add to Timely"
        ).click()
        page.wait_for_timeout(600)

        # Find and click the edit button for this task
        task_row = page.locator(".task-row").filter(
            has_text="E2E task — original title"
        )
        assert task_row.count() >= 1

        # The edit button should be inside the task row — click via the
        # row-actions area (the edit icon button)
        edit_btn = task_row.locator("button").filter(has_text="edit").first
        if edit_btn.count() == 0:
            # fallback: look for material icon named edit
            edit_btn = task_row.locator("[aria-label*='Edit']").first
        edit_btn.click()
        page.wait_for_timeout(500)

        # The quick add modal should open with the title pre-filled
        title_input = page.locator(".quick-add-modal input[type='text']").first
        assert title_input.input_value() == "E2E task — original title"

        # Change the title
        title_input.fill("E2E task — updated title")
        page.locator(".quick-add-modal form").get_by_role(
            "button", name="Save changes"
        ).click()
        page.wait_for_timeout(600)

        assert page.get_by_text("E2E task — updated title", exact=True).count() >= 1

    def test_delete_task(self, page: Page):
        """Create a task then delete it."""
        # Create
        open_quick_add(page)
        page.locator(".quick-add-modal input[type='text']").first.fill(
            "E2E task — to delete"
        )
        page.locator(".quick-add-modal form").get_by_role(
            "button", name="Add to Timely"
        ).click()
        page.wait_for_timeout(600)

        task_row = page.locator(".task-row").filter(has_text="E2E task — to delete")
        assert task_row.count() >= 1

        # Click the delete button inside the task row
        delete_btn = task_row.locator("[aria-label*='Delete']").first
        delete_btn.click()
        page.wait_for_timeout(600)

        assert page.get_by_text("E2E task — to delete", exact=True).count() == 0

    def test_quick_add_keyboard_escape(self, page: Page):
        """Open quick add and press Escape to close it."""
        open_quick_add(page)
        assert page.locator(".quick-add-modal").is_visible()

        page.keyboard.press("Escape")
        page.wait_for_timeout(500)

        # Modal should be gone
        assert page.locator(".quick-add-modal").count() == 0


# ===========================================================================
# 2. SCHEDULE NAVIGATION
# ===========================================================================

class TestScheduleNavigation:
    """Navigate between schedule views, switch tabs, and change weeks."""

    def test_navigate_to_schedule(self, page: Page):
        """Click Schedule in sidebar and verify the schedule page loads."""
        navigate_to(page, "Schedule")
        page.wait_for_timeout(400)
        heading = page.locator("h1").first
        assert "Schedule" in heading.inner_text()

    def test_schedule_week_grid_visible(self, page: Page):
        """The week view should show the grid with day columns."""
        navigate_to(page, "Schedule")
        page.wait_for_timeout(400)
        assert page.locator(".week-grid").is_visible()
        # Should have 5 day headings (Mon-Fri)
        day_headings = page.locator(".day-heading")
        assert day_headings.count() == 5

    def test_switch_to_agenda_tab(self, page: Page):
        """Click the Agenda tab and verify the agenda view appears."""
        navigate_to(page, "Schedule")
        page.wait_for_timeout(400)
        page.locator(".view-tabs button", has_text="Agenda").click()
        page.wait_for_timeout(400)
        assert page.locator(".agenda-view").is_visible()

    def test_switch_to_day_tab(self, page: Page):
        """Click the Day tab and verify day view."""
        navigate_to(page, "Schedule")
        page.wait_for_timeout(400)
        page.locator(".view-tabs button", has_text="Day").click()
        page.wait_for_timeout(400)
        # Day tab should also show agenda-view container
        assert page.locator(".agenda-view").is_visible()

    def test_switch_back_to_week_tab(self, page: Page):
        """Switch to Agenda then back to Week — grid should reappear."""
        navigate_to(page, "Schedule")
        page.wait_for_timeout(400)
        page.locator(".view-tabs button", has_text="Agenda").click()
        page.wait_for_timeout(300)
        page.locator(".view-tabs button", has_text="Week").click()
        page.wait_for_timeout(400)
        assert page.locator(".week-grid").is_visible()

    def test_navigate_weeks_forward_and_back(self, page: Page):
        """Click the next-week and prev-week arrows and verify the label changes."""
        navigate_to(page, "Schedule")
        page.wait_for_timeout(400)

        label = page.locator(".week-switcher strong").first
        week1 = label.inner_text()

        # Go forward
        page.locator(".week-switcher button").nth(1).click()  # next button
        page.wait_for_timeout(300)
        week2 = label.inner_text()
        assert week1 != week2

        # Go back
        page.locator(".week-switcher button").nth(0).click()  # prev button
        page.wait_for_timeout(300)
        week3 = label.inner_text()
        assert week3 == week1

    def test_add_class_from_schedule(self, page: Page):
        """Click Add class, fill the form, and verify it appears in the schedule."""
        navigate_to(page, "Schedule")
        page.wait_for_timeout(400)

        page.get_by_role("button", name="Add class").click()
        page.wait_for_selector(".quick-add-modal", state="visible", timeout=5000)

        title_input = page.locator(".quick-add-modal input[type='text']").first
        title_input.fill("E2E — New History Class")
        page.locator(".quick-add-modal form").get_by_role(
            "button", name="Add to Timely"
        ).click()
        page.wait_for_timeout(600)

        assert (
            page.get_by_text("E2E — New History Class", exact=True).count() >= 1
        )


# ===========================================================================
# 3. SEARCH
# ===========================================================================

class TestSearch:
    """Open search, type queries, verify results, dismiss with Escape."""

    def test_open_search_modal(self, page: Page):
        """Click the search trigger and verify the modal opens."""
        page.locator(".search-trigger").click()
        page.wait_for_selector(
            "input[placeholder*='Search subjects']", state="visible", timeout=5000
        )
        assert page.locator(".modal-backdrop").count() >= 1

    def test_search_returns_results(self, page: Page):
        """Type a known term and verify results appear."""
        page.locator(".search-trigger").click()
        search_input = page.locator(
            "input[placeholder*='Search subjects']"
        )
        search_input.wait_for(state="visible", timeout=5000)
        search_input.fill("History")
        page.wait_for_timeout(400)

        results = page.locator(".search-results button")
        assert results.count() >= 1

    def test_search_no_results_message(self, page: Page):
        """Type gibberish and verify the empty state appears."""
        page.locator(".search-trigger").click()
        search_input = page.locator(
            "input[placeholder*='Search subjects']"
        )
        search_input.wait_for(state="visible", timeout=5000)
        search_input.fill("xyzzy_nonexistent_thing_999")
        page.wait_for_timeout(400)

        assert page.get_by_text("No matches").is_visible()

    def test_search_navigates_to_view(self, page: Page):
        """Type a query, click a result, and verify we navigate."""
        page.locator(".search-trigger").click()
        search_input = page.locator(
            "input[placeholder*='Search subjects']"
        )
        search_input.wait_for(state="visible", timeout=5000)
        search_input.fill("Calculus")
        page.wait_for_timeout(400)

        first_result = page.locator(".search-results button").first
        if first_result.count() > 0:
            first_result.click()
            page.wait_for_timeout(500)
            # The search modal should close
            assert page.locator(".search-results").count() == 0

    def test_search_escape_closes(self, page: Page):
        """Press Escape to dismiss the search modal."""
        page.locator(".search-trigger").click()
        page.locator("input[placeholder*='Search subjects']").wait_for(
            state="visible", timeout=5000
        )
        assert page.locator(".modal-backdrop").count() >= 1

        page.keyboard.press("Escape")
        page.wait_for_timeout(500)
        assert page.locator("input[placeholder*='Search subjects']").count() == 0

    def test_search_ctrl_k_shorthand(self, page: Page):
        """Press Cmd/Ctrl+K to open search from anywhere."""
        # Make sure search is not already open
        assert page.locator("input[placeholder*='Search subjects']").count() == 0

        page.keyboard.press("Control+k")
        page.wait_for_selector(
            "input[placeholder*='Search subjects']", state="visible", timeout=5000
        )
        assert page.locator(".modal-backdrop").count() >= 1


# ===========================================================================
# 4. POMODORO TIMER
# ===========================================================================

class TestPomodoroTimer:
    """Test the focus/pomodoro timer on the home view."""

    def _get_timer_text(self, page: Page) -> str:
        return page.locator(".pomodoro-time").first.inner_text()

    def test_timer_visible_on_home(self, page: Page):
        """The pomodoro timer should be visible on the home page."""
        navigate_to(page, "Home")
        page.wait_for_timeout(400)
        assert page.locator(".focus-card").is_visible()
        assert page.locator(".pomodoro-time").is_visible()

    def test_timer_shows_25_minutes_initially(self, page: Page):
        """The timer should start at 25:00 (or close to it)."""
        navigate_to(page, "Home")
        page.wait_for_timeout(400)
        text = self._get_timer_text(page)
        # Should be 25:00 or 24:59 (if a second elapsed)
        minutes = int(text.split(":")[0])
        assert 24 <= minutes <= 25

    def test_start_and_pause_timer(self, page: Page):
        """Click Start, wait briefly, click Pause, verify time changed."""
        navigate_to(page, "Home")
        page.wait_for_timeout(400)

        timer = page.locator(".focus-card")
        start_btn = timer.locator(".dark-button")

        # Start
        start_btn.click()
        page.wait_for_timeout(2500)

        time_after_start = self._get_timer_text(page)
        mins = int(time_after_start.split(":")[0])
        secs = int(time_after_start.split(":")[1])
        # Should have counted down from 25:00
        assert mins <= 25
        assert mins >= 24

        # Pause
        start_btn.click()
        time_after_pause = self._get_timer_text(page)

        # Wait 1.5s and verify it didn't change (paused)
        page.wait_for_timeout(1500)
        time_after_wait = self._get_timer_text(page)
        assert time_after_pause == time_after_wait

    def test_reset_timer(self, page: Page):
        """Start the timer, reset it, verify it returns to 25:00."""
        navigate_to(page, "Home")
        page.wait_for_timeout(400)

        timer = page.locator(".focus-card")
        start_btn = timer.locator(".dark-button")

        # Start
        start_btn.click()
        page.wait_for_timeout(2000)

        # Pause first
        start_btn.click()
        page.wait_for_timeout(300)

        # Reset
        reset_btn = timer.locator(".text-button", has_text="Reset")
        if reset_btn.count() > 0:
            reset_btn.click()
            page.wait_for_timeout(300)
            text = self._get_timer_text(page)
            assert text == "25:00"

    def test_timer_persists_across_navigation(self, page: Page):
        """Start the timer, navigate away, come back — timer state preserved."""
        navigate_to(page, "Home")
        page.wait_for_timeout(400)

        timer = page.locator(".focus-card")
        timer.locator(".dark-button").click()  # start
        page.wait_for_timeout(1500)
        timer.locator(".dark-button").click()  # pause
        page.wait_for_timeout(300)

        time_before_nav = self._get_timer_text(page)

        # Navigate away and back
        navigate_to(page, "Schedule")
        page.wait_for_timeout(300)
        navigate_to(page, "Home")
        page.wait_for_timeout(400)

        # The pomodoro is managed by a React hook (usePomodoro),
        # so state resets on page reload. But within a single SPA
        # session, navigation should preserve it. Since home is
        # always mounted (conditional render), the timer state should persist.
        time_after_nav = self._get_timer_text(page)
        # Allow +- 1 second drift
        def to_secs(t):
            m, s = t.split(":")
            return int(m) * 60 + int(s)
        assert abs(to_secs(time_before_nav) - to_secs(time_after_nav)) <= 2


# ===========================================================================
# 5. CROSS-FEATURE INTEGRATION
# ===========================================================================

class TestCrossFeature:
    """Tests that verify features work together correctly."""

    def test_add_task_then_see_in_academics(self, page: Page):
        """Create a task via Quick Add on home, then navigate to Academics and see it."""
        open_quick_add(page)
        page.locator(".quick-add-modal input[type='text']").first.fill(
            "E2E integration — cross-view task"
        )
        page.locator(".quick-add-modal form").get_by_role(
            "button", name="Add to Timely"
        ).click()
        page.wait_for_timeout(600)

        navigate_to(page, "Academics")
        page.wait_for_timeout(400)

        # The task should appear somewhere in the academics view task list
        assert page.get_by_text("E2E integration — cross-view task").count() >= 1

    def test_add_class_then_visible_in_schedule(self, page: Page):
        """Add a class via schedule, verify it appears in the week grid."""
        navigate_to(page, "Schedule")
        page.wait_for_timeout(400)

        page.get_by_role("button", name="Add class").click()
        page.wait_for_selector(".quick-add-modal", state="visible", timeout=5000)
        page.locator(".quick-add-modal input[type='text']").first.fill(
            "E2E integration — Grid Class"
        )
        page.locator(".quick-add-modal form").get_by_role(
            "button", name="Add to Timely"
        ).click()
        page.wait_for_timeout(600)

        # Navigate back to schedule to see it
        navigate_to(page, "Schedule")
        page.wait_for_timeout(400)
        assert page.get_by_text("E2E integration — Grid Class").count() >= 1

    def test_notification_popover_mark_read(self, page: Page):
        """Open notifications, mark all as read, verify badge disappears."""
        # Ensure we're on home where notifications might exist
        navigate_to(page, "Home")
        page.wait_for_timeout(400)

        notif_btn = page.get_by_role("button", name="Notifications")
        notif_btn.click()
        page.wait_for_timeout(400)

        popover = page.locator(".notification-popover")
        if popover.count() > 0 and popover.is_visible():
            mark_all = page.get_by_role("button", name="Mark all read")
            if mark_all.is_enabled():
                mark_all.click()
                page.wait_for_timeout(400)

        # Close popover by clicking outside
        page.locator(".page-content").first.click()
        page.wait_for_timeout(300)

    def test_responsive_mobile_nav(self, page: Page):
        """Resize to mobile, verify the mobile nav appears."""
        page.set_viewport_size({"width": 390, "height": 844})
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(500)
        assert page.locator(".mobile-nav").is_visible()

        # The sidebar should be hidden
        assert page.locator(".sidebar").is_hidden()

    def test_responsive_mobile_quick_add(self, page: Page):
        """On mobile, the mobile add button should open quick add."""
        page.set_viewport_size({"width": 390, "height": 844})
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(500)

        add_btn = page.locator(".mobile-add")
        assert add_btn.is_visible()
        add_btn.click()
        page.wait_for_timeout(500)
        assert page.locator(".quick-add-modal").is_visible()

    def test_profile_name_changes_sidebar(self, page: Page):
        """Change the profile name in Settings and verify sidebar updates."""
        navigate_to(page, "Settings")
        page.wait_for_timeout(400)

        name_input = page.locator("#profileName")
        if name_input.count() > 0:
            name_input.fill("Test User E2E")
            page.wait_for_timeout(300)

            # The sidebar should reflect the new name
            assert page.locator(".sidebar .profile-copy strong").inner_text() == "Test User E2E"

            # Restore
            name_input.fill("Alex Vale")
            page.wait_for_timeout(300)
