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
**Learning:** `src/services/nhlHighlightsApi.js` was missing critical imports (`cache`, `getScoresByDate`), which would cause runtime errors. Additionally, it lacked request coalescing, meaning concurrent requests for the same game highlight (e.g., from multiple UI components or rapid user actions) would trigger redundant processing and cache write conflicts.
**Action:** Always verify that API service files import their dependencies. Systematically apply the `pendingRequests` map pattern to all data processing functions, even if they call other coalesced APIs, to prevent redundant processing and cache write conflicts.

## 2026-03-06 - [Missing Caching in Salary Cap API]
**Learning:** `getSenatorsSalaryCap` in `salaryCapApi.js` was fetching fresh data on every call, bypassing the local cache entirely. This caused redundant network requests to the proxy server when the component was remounted or accessed multiple times.
**Action:** Implemented `pendingRequests` Map for request coalescing and utilized `cache` utility with 24-hour TTL. Added logic to handle `forceRefresh` correctly by bypassing cache but still updating it.

## 2026-06-15 - [O(N*M) Complexity in Match Enrichment]
**Learning:** `getHockeyMatches` in `src/services/streamedApi.js` was using a nested `find` loop (O(N*M)) to match streamed matches with NHL live scores. While M is small, this pattern scales poorly and is algorithmically inefficient.
**Action:** Replaced the nested search with an O(N) approach by creating a lookup Map keyed by team abbreviations (`${homeAbbrev}-${awayAbbrev}`) before processing matches. This eliminates the inner loop and provides constant-time lookups.

## 2026-06-18 - [Content-Aware Cache TTL]
**Learning:** `getScoresByDate` in `nhlScoreApi.js` was using a fixed 2-minute TTL for all requests, regardless of whether the game was live, scheduled for next year, or finished 10 years ago. This caused unnecessary re-fetching of static historical data.
**Action:** Implemented dynamic TTL logic based on game state and date. Completed/Past games are now cached for 24 hours, future schedules for 1 hour, while live games retain the 2-minute refresh rate. This significantly reduces network traffic for non-live content.

## 2026-03-08 - [Redundant Calculations in Component Render]
**Learning:** `src/pages/Standings.js` executed identical playoff and wildcard evaluations twice via `calculatePlayoffTeams` and `calculateWildcardTeams` on every render view (Division, Conference, League). Because these functions both iterated through the entire `standings` list to compute the same top-3 division leaders and wildcard candidates, it led to unnecessary CPU cycles.
**Action:** Consolidate redundant filtering and array iterations into a single, module-level memoized function (`getPlayoffStatus`). This technique caches the result based on the `standings` object reference, reducing O(N) recalculations to O(1) lookups when switching tabs.

## 2026-03-09 - [Reduce API Requests in Schedule Fetching]
**Learning:** `getSensSchedule` was fetching upcoming games sequentially week-by-week using a `while` loop (up to 12 API calls). This caused significant network latency, especially during off-seasons or long breaks. Additionally, when switching to month-by-month fetching, doing `date.setMonth(date.getMonth() + n)` without first setting `date.setDate(1)` can cause end-of-month rollover bugs (e.g., adding 1 month to Jan 31st yields March 2nd/3rd).
**Action:** Replaced week-by-week fetching with month-by-month chunks (max 3 months ahead) to reduce the maximum number of API calls from 12 to 4. Always use `date.setDate(1)` before adding months to a `Date` object to prevent calendar rollover bugs.

## 2026-06-21 - [Date Formatting in Loops]
**Learning:** Instantiating `Intl.DateTimeFormat` or calling `.toLocaleDateString()` and `.toLocaleTimeString()` is computationally expensive. When done inside loops (e.g., iterating through a large dataset of games) or frequently called utility functions, it causes significant CPU usage and memory allocation pressure.
**Action:** Always instantiate `Intl.DateTimeFormat` once outside of loops or at the module level for utility functions, and reuse its `.format()` method. This drastically reduces the overhead of formatting dates and times.

## 2026-03-10 - [Inefficient Date Formatting in Loops]
**Learning:** Using `Date.prototype.toLocaleDateString()` inside a loop (like in `renderGameCards` in `Schedule.js`) forces the JavaScript engine to re-instantiate locale formatting rules on every iteration. This creates unnecessary CPU overhead and memory allocation, especially for large lists of games.
**Action:** Always instantiate `Intl.DateTimeFormat` once outside the loop and use its `.format(date)` method inside the loop. This caches the formatting rules and significantly improves rendering performance for large datasets.

## 2026-03-09 - [Redundant String Parsing in Arrays]
**Learning:** `src/pages/SensSalaryCap.js` was repeatedly executing expensive Regex replacements `replace(/[$,]/g, '')` and `parseFloat` on string properties inside array `.sort()` and `.filter()` methods during render cycles. Since `.sort()` operates in O(N log N) time, the strings were parsed far more times than there were elements in the array, degrading performance on every user interaction (sorting, filtering, or tab switching).
**Action:** Always pre-compute and normalize complex string data into numeric values during the initial API data fetch (e.g., in `src/services/salaryCapApi.js`). By attaching these cached numbers to the models, frontend operations can run in O(1) comparison time, significantly accelerating UI responsiveness.

## 2026-06-25 - [Inefficient Number and Date Formatting]
**Learning:** Using `.toLocaleString()` directly on numbers or `.toLocaleString()` / `.toLocaleDateString()` on dates inside frequently rendered components or utility functions forces the JavaScript engine to re-instantiate locale formatting rules on every call. This causes unnecessary CPU overhead and memory allocation pressure.
**Action:** Always instantiate `Intl.NumberFormat` or `Intl.DateTimeFormat` once at the module level (using `undefined` locale to match system defaults) and reuse its `.format()` method. This caches the formatting rules and significantly improves rendering performance.
