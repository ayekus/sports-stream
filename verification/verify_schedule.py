
import time
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Get current time for mock data
    now = int(time.time() * 1000)

    # Mock Streamed API response for hockey matches
    def handle_hockey_matches(route):
        print(f"Intercepted request to: {route.request.url}")
        route.fulfill(
            status=200,
            content_type="application/json",
            body=f'''[
            {{
                "title": "Toronto Maple Leafs @ Montreal Canadiens",
                "date": {now + 3600000},
                "category": "hockey",
                "teams": {{
                    "home": {{"name": "Montreal Canadiens", "badge": "mtl", "abbrev": "MTL"}},
                    "away": {{"name": "Toronto Maple Leafs", "badge": "tor", "abbrev": "TOR"}}
                }},
                "sources": [],
                "id": "game1",
                "status": "upcoming"
            }},
            {{
                "title": "Boston Bruins @ Chicago Blackhawks",
                "date": {now + 7200000},
                "category": "hockey",
                "teams": {{
                    "home": {{"name": "Chicago Blackhawks", "badge": "chi", "abbrev": "CHI"}},
                    "away": {{"name": "Boston Bruins", "badge": "bos", "abbrev": "BOS"}}
                }},
                "sources": [],
                "id": "game2",
                "status": "upcoming"
            }}
        ]'''
        )

    # Mock all API calls to streamed.pk
    page.route("**/matches/hockey", handle_hockey_matches)
    page.route("**/matches/all", handle_hockey_matches) # Just in case

    # Mock NHL Score API response (enrichment)
    page.route("**/api/nhl/score/*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"games": []}'
    ))

    # Mock NHL Standings API response (if needed)
    page.route("**/api/nhl/standings/*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"standings": []}'
    ))

    print("Navigating to home page...")
    # Serve app from dist folder
    page.goto("http://localhost:8080/")

    # Wait for schedule list to be populated
    try:
        page.wait_for_selector(".game-card", timeout=5000)
        print("Game cards found!")
    except Exception as e:
        print(f"Timeout waiting for game cards: {e}")
        # Take screenshot anyway for debug
        page.screenshot(path="/home/jules/verification/debug_timeout.png")

    # Take screenshot
    screenshot_path = "/home/jules/verification/schedule_verification.png"
    page.screenshot(path=screenshot_path)
    print(f"Screenshot saved to {screenshot_path}")

    # Check for loading="lazy"
    images = page.query_selector_all("img.team-logo-inline")
    print(f"Found {len(images)} team logo images.")

    lazy_count = 0
    for img in images:
        loading_attr = img.get_attribute("loading")
        src_attr = img.get_attribute("src")
        print(f"Image src: {src_attr}, loading: {loading_attr}")
        if loading_attr == "lazy":
            lazy_count += 1

    if len(images) > 0 and lazy_count == len(images):
        print("SUCCESS: All team logo images have loading='lazy'.")
    else:
        print(f"FAILURE: Only {lazy_count}/{len(images)} images have loading='lazy'.")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
