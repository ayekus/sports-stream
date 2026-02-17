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

## 2026-02-17 - [O(N) LocalStorage Access in Cache Write]
**Learning:** `src/utils/cache.js` was performing a full `localStorage` scan (iterating all keys to calculate size) before every `set` operation. This O(N) complexity caused significant latency (linear growth) as the cache filled up, blocking the main thread synchronously.
**Action:** Removed proactive size check. Implemented optimistic writes with reactive cleanup on `QuotaExceededError`. This improved write performance from ~8.5ms/op (at 5000 items) to <0.01ms/op. Always prefer handling errors over expensive pre-checks when working with synchronous browser APIs like `localStorage`.
