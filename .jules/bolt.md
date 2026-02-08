## 2026-02-08 - Schedule Rendering Optimization
**Learning:** Found O(n log n) `Date` object creation in sort comparator on the Schedule page. Hoisting timestamp calculation to an O(n) pass significantly reduces object allocation. Also, large lists of images (team logos) were eagerly loaded, impacting initial paint.
**Action:** Always check sort comparators for object creation (especially dates/regex) and ensure images in long lists use `loading="lazy"`.
