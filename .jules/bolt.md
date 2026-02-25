## 2024-05-23 - [Duplicate API Requests in Match Page]
**Learning:** The `Match.js` page triggers concurrent `fetchFeedCounts` (for all sources) and `loadStream(0)` (for the first source) on initialization. Because the custom `cache` utility (synchronous `localStorage`) doesn't handle in-flight request coalescing, this causes race conditions leading to duplicate network requests for the same resource.
**Action:** Implement request deduplication (Promise sharing) in API service layers (`streamedApi.js`) using a module-level `Map` to track pending requests by cache key. This pattern is essential for any data fetching function called from multiple UI components simultaneously.

## 2024-05-23 - [Incomplete Request Coalescing]
**Learning:** While `pendingRequests` map existed in `streamedApi.js`, it was only used for `getStreamUrls`. Other high-traffic functions like `getHockeyMatches` and `getSports` were vulnerable to race conditions causing duplicate fetches.
**Action:** systematically apply the request coalescing pattern (checking `pendingRequests`, storing promise, cleaning up in `finally`) to all public data fetching functions. Ensure cache keys include all parameters that affect the response structure (e.g., `enrichWithNHL` flag).

## 2026-02-12 - [Missing Caching and Coalescing in NHL Scores]
**Learning:** `src/services/nhlScoreApi.js` was fetching fresh data on every call to `getLiveScores` and `getScoresByDate`, ignoring the `CACHE_TTL` constant and lacking request coalescing. This caused duplicate network requests when multiple components (or the same component) requested score data simultaneously.
**Action:** Implemented `pendingRequests` Map for request coalescing and properly utilized `cache.set` and `cache.get` with the existing `CACHE_TTL` (2 minutes). Always verify that data fetching functions actually use the cache they import.

## 2026-02-13 - [Sequential API Calls in Streamed API]
**Learning:** `getHockeyMatches` was fetching matches first, awaiting the response, and then fetching NHL scores for enrichment. This created a waterfall effect, doubling the latency.
**Action:** Initiate independent API calls in parallel using detached promises (with `.catch()` to prevent unhandled rejections) before awaiting them. This reduced the total execution time by approximately 50% in verified tests.

## 2026-02-14 - [Repeated Object Creation in Loops]
**Learning:** `HighlightsSection.js` was creating large constant objects (`teamColors` and `badges`) inside helper functions (`getTeamColor`, `getStrengthBadge`) that were called for every highlight card. This caused unnecessary memory allocation and garbage collection pressure, especially when rendering lists.
**Action:** Move constant data structures outside of function scopes to module-level constants to ensure they are created once and reused. This simple refactor yielded an ~8x performance improvement in micro-benchmarks for the lookup function.

## 2026-02-21 - [Missing Request Coalescing in Standings API]
**Learning:** `getNHLStandings` in `nhlApi.js` was susceptible to race conditions where multiple concurrent calls would trigger duplicate network requests, bypassing the cache check which only happens after the first request completes.
**Action:** Implemented the standard `pendingRequests` Map pattern in `nhlApi.js` to coalesce concurrent requests into a single promise, reducing network traffic and load on the external API. Verified with a reproduction script showing a reduction from 2 fetches to 1.

## 2026-02-23 - [Inter-dependent Service Calls Cause API Cascades]
**Learning:** In `sensApi.js`, `getSensSeasonRecord` internally calls `getSensStandings`. Without request coalescing, a page load that requests both (like the Season Tracker) triggers a race condition where `getSensStandings` is fetched twice: once directly, and once via the record function.
**Action:** Always implement request coalescing (using `pendingRequests`) on "base" data fetching functions that are reused by other service methods. This prevents cascading duplicate requests when higher-level functions are called in parallel with their dependencies.

## 2026-03-05 - [Missing Request Coalescing in SportsDB API]
**Learning:** `sportsDbApi.js` was missing the `pendingRequests` pattern, leading to duplicate network requests when `getAllNHLTeams` was called concurrently. This is a common pattern failure in the codebase where caching is implemented but in-flight request coalescing is forgotten.
**Action:** Implemented `pendingRequests` map in `sportsDbApi.js` to share the promise of an ongoing fetch request. This ensures that concurrent calls wait for the first request to complete rather than triggering multiple redundant network calls. Verified with a reproduction script showing 50% reduction in fetches during concurrent access.

## 2026-05-23 - [Unintended Argument Leakage in Map]
**Learning:** Using `array.map(func)` directly (e.g., `matches.map(processMatch)`) passes `(element, index, array)` to the function. If the function accepts optional arguments that conflict with `index` (like `nhlGame` object), it can cause severe logic errors and performance degradation by executing code paths meant for other purposes.
**Action:** Always wrap `map` callbacks in an arrow function (e.g., `matches.map(m => processMatch(m))`) when the callback function accepts optional arguments, unless you explicitly intend to use the index. This prevents unexpected arguments from triggering unintended behavior.

## 2026-06-12 - [Missing Imports and Coalescing in Highlights API]
**Learning:** `src/services/nhlHighlightsApi.js` was missing critical imports (`cache`, `getScoresByDate`), which would cause runtime errors. Additionally, it lacked request coalescing, meaning concurrent requests for the same game highlight (e.g., from multiple UI components or rapid user actions) would trigger redundant processing and race conditions on the cache write.
**Action:** Always verify that API service files import their dependencies. Systematically apply the `pendingRequests` map pattern to all data processing functions, even if they call other coalesced APIs, to prevent redundant processing and cache write conflicts.
