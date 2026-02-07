## 2024-05-23 - [Match Page Chunk Size]
**Learning:** The `Match` page bundle is significantly larger (>600kB) than other pages, likely due to heavy dependencies like `hls.js` or `plyr`.
**Action:** Investigate dynamic imports for `hls.js` and `plyr` inside `VideoPlayer.js` or ensure they are only loaded when needed. Consider code splitting these libraries into separate chunks.
