## 2024-05-23 - [Duplicate API Requests in Match Page]
**Learning:** The `Match.js` page triggers concurrent `fetchFeedCounts` (for all sources) and `loadStream(0)` (for the first source) on initialization. Because the custom `cache` utility (synchronous `localStorage`) doesn't handle in-flight request coalescing, this causes race conditions leading to duplicate network requests for the same stream resource.
**Action:** Implement request deduplication (Promise sharing) in API service layers (`streamedApi.js`) using a module-level `Map` to track pending requests by cache key. This pattern is essential for any data fetching function called from multiple UI components simultaneously.

## 2024-05-23 - [Incomplete Request Coalescing]
**Learning:** While `pendingRequests` map existed in `streamedApi.js`, it was only used for `getStreamUrls`. Other high-traffic functions like `getHockeyMatches` and `getSports` were vulnerable to race conditions causing duplicate fetches.
**Action:** systematically apply the request coalescing pattern (checking `pendingRequests`, storing promise, cleaning up in `finally`) to all public data fetching functions. Ensure cache keys include all parameters that affect the response structure (e.g., `enrichWithNHL` flag).

## 2026-02-12 - [Missing Caching and Coalescing in NHL Scores]
**Learning:** `src/services/nhlScoreApi.js` was fetching fresh data on every call to `getLiveScores` and `getScoresByDate`, ignoring the `CACHE_TTL` constant and lacking request coalescing. This caused duplicate network requests when multiple components (or the same component) requested score data simultaneously.
**Action:** Implemented `pendingRequests` Map for request coalescing and properly utilized `cache.set` and `cache.get` with the existing `CACHE_TTL` (2 minutes). Always verify that data fetching functions actually use the cache they import.
