import json
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:4197/index.html"


def main():
    console_errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1000})

        def mock_ollama(route):
            print("mock request:", route.request.url)
            if route.request.url.endswith("/api/tags"):
                route.fulfill(status=200, content_type="application/json", body='{"models":[{"name":"llama3.1:latest"},{"name":"mistral:latest"}]}')
                return
            if route.request.url.endswith("/api/chat"):
                body = route.request.post_data or ""
                if "Extract timetable classes" in body:
                    payload = '{"classes":[{"subject":"Advanced Calculus","teacher":"Dr. Chen","room":"C02","day":"TUE","start":"10:00","end":"11:15","confidence":91}],"confidence":91}'
                elif "Extract one homework task" in body:
                    payload = '{"title":"History essay introduction","subject":"World History","due":"tomorrow","estimatedMinutes":45,"priority":"high","notes":"Write the introduction.","confidence":88}'
                elif "Summarize this note" in body:
                    payload = '{"summary":"Factories and steam power reshaped where people lived and worked.","keyPoints":["Steam power changed factories.","Industrialisation changed settlement patterns."],"flashcards":[{"question":"What did steam power change?","answer":"Factories and working life."}]}'
                else:
                    payload = '{"message":{"content":"Local Ollama reply: I would start with the History introduction in your next open window."}}'
                if "message" not in payload:
                    payload = json.dumps({"message": {"content": payload}})
                route.fulfill(status=200, content_type="application/json", body=payload)
                return
            route.continue_()

        page.route("http://localhost:11434/**", mock_ollama)
        page.on("console", lambda message: console_errors.append(f"{message.type}: {message.text}") if message.type == "error" else None)
        page.on("requestfailed", lambda request: print("request failed:", request.url, request.failure))
        page.goto(BASE)
        page.wait_for_load_state("networkidle")

        assert page.locator("#homeView").is_visible()
        assert page.locator(".ai-action-row").count() == 1

        page.locator('[data-view="assistant"]').first.click()
        page.locator("#chatInput").fill("What should I study?")
        page.locator("#chatForm").evaluate("form => form.requestSubmit()")
        page.wait_for_selector("text=Local Ollama reply", timeout=5000)
        assert page.locator(".ai-generated-label").count() >= 2

        page.locator('[data-view="profile"]').first.click()
        assert page.locator("#aiSettingsCard").is_visible()
        assert page.locator("#ollamaModel option").count() >= 2
        page.locator("#saveAiSettings").click()
        page.wait_for_timeout(250)
        assert page.evaluate("localStorage.getItem('timely_ai_config_v1')")

        page.locator('[data-view="academics"]').first.click()
        page.locator("#scanHomework").click()
        page.locator("#homeworkAiText").fill("World History essay introduction due tomorrow. Spend about 45 minutes.")
        page.locator("#extractHomeworkText").click()
        page.wait_for_selector("#homeworkAiReview:not([hidden])")
        print("homework title:", repr(page.locator("#homeworkTitle").input_value()))
        print("homework review:", page.locator("#homeworkAiReview").inner_text())
        assert page.locator("#homeworkTitle").input_value() == "History essay introduction"
        page.locator("#saveHomeworkExtract").click()
        assert page.locator("#homeworkAiModal").is_hidden()

        page.locator('[data-view="schedule"]').first.click()
        page.locator("#importSchedule").click()
        page.locator("#aiTimetableText").fill("TUE 10:00–11:15 Advanced Calculus · C02 · Dr. Chen")
        page.locator("#extractTimetableText").click()
        page.wait_for_selector("#importReviewPanel:not([hidden])")
        assert page.locator(".review-confidence").first.inner_text() == "91% sure"
        page.locator("#backToUpload").click()
        page.locator("#importModal [data-close-modal]").click()

        page.locator('[data-view="notes"]').first.click()
        page.locator('[data-note-action="ai-summary"]').first.click()
        page.locator("#summarizeNoteButton").click()
        page.get_by_text("Key points", exact=True).wait_for()
        print("original note panel:", repr(page.locator("#noteAiOriginal").inner_text()))
        assert "original note" in page.locator("#noteAiOriginal").inner_text().lower()

        page.reload()
        page.wait_for_load_state("networkidle")
        assert page.evaluate("localStorage.getItem('timely_ai_config_v1')")

        offline = browser.new_page()
        offline.route("http://localhost:11434/**", lambda route: route.fulfill(status=503, content_type="application/json", body='{}'))
        offline.goto(BASE)
        offline.wait_for_load_state("networkidle")
        offline.locator('[data-view="profile"]').first.click()
        assert "Local AI unavailable" in offline.locator("#aiSettingsCard").inner_text()
        offline.locator('[data-view="assistant"]').first.click()
        offline.locator("#chatInput").fill("What am I forgetting?")
        offline.locator("#chatForm").evaluate("form => form.requestSubmit()")
        offline.wait_for_selector("text=Local fallback", timeout=5000)
        offline.close()

        malformed = browser.new_page()
        def malformed_ollama(route):
            if route.request.url.endswith("/api/tags"):
                route.fulfill(status=200, content_type="application/json", body='{"models":[{"name":"llama3.1"}]}')
            elif route.request.url.endswith("/api/chat"):
                route.fulfill(status=200, content_type="application/json", body='{"message":{"content":"not valid JSON"}}')
            else:
                route.continue_()
        malformed.route("http://localhost:11434/**", malformed_ollama)
        malformed.goto(BASE)
        malformed.wait_for_load_state("networkidle")
        malformed.locator('[data-view="academics"]').first.click()
        malformed.locator("#scanHomework").click()
        malformed.locator("#homeworkAiText").fill("World History essay introduction due tomorrow")
        malformed.locator("#extractHomeworkText").click()
        malformed.wait_for_selector("#homeworkAiReview:not([hidden])")
        assert malformed.locator("#homeworkTitle").input_value().startswith("World History essay introduction")
        malformed.close()

        page.set_viewport_size({"width": 390, "height": 844})
        page.locator('[data-view="home"]').last.click()
        page.wait_for_timeout(100)
        assert page.locator(".mobile-nav").is_visible()
        assert page.locator(".page-content").is_visible()
        assert not console_errors, console_errors
        print("static Timely AI checks passed")
        browser.close()


if __name__ == "__main__":
    main()
