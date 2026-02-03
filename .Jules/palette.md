# Palette's Journal

## Critical UX/Accessibility Learnings

## 2025-02-22 - Game Card Accessibility
**Learning:** Interactive cards were implemented as `div` elements with click listeners, making them inaccessible to keyboard users and screen readers (no focus, no role).
**Action:** Convert clickable cards to semantic `<a>` tags with `href` attributes, ensuring to reset default link styles (color, text-decoration) to maintain visual design.
