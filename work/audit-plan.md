# Audit and Implementation Notes

## Current Stack

- Frontend: vanilla HTML, CSS, and JavaScript.
- Backend: Node.js built-in `http` server in `server.js`; no Express or package manifest.
- Package manager: none configured yet.
- Styling: single `styles.css` file with custom design tokens, glass UI classes, responsive CSS, and animation classes.
- State: in-memory JS state plus `localStorage` for settings, cache, watchlist, compare, and theme.
- Charts: Chart.js loaded from CDN.
- Data: embedded `data.js` country and asset metadata, plus frontend provider fetches for Stooq, Yahoo chart, CoinGecko, and optional advanced providers.
- Routing: current app uses one long page with scroll navigation, not true route-like views.

## Gaps To Close

- Add `package.json`, `.env.example`, API contract, and explicit run commands.
- Expand `server.js` beyond static/proxy into normalized API routes.
- Add backend public provider adapters and memory cache.
- Add frontend `apiClient` methods and make data fetching backend-first with local fallback.
- Restructure the existing page into route-like views: Home, Explore, Watchlist, Compare, Data Sources, and Settings.
- Preserve drawers for Asset Details and AI Insight while ensuring navigation transitions are animated.
- Keep honest unavailable states for official-only listings; no fake prices or chart data.

## Implementation Plan

1. Add developer setup files and API documentation.
2. Expand backend routes using embedded metadata from `data.js`.
3. Create normalized response helpers and provider adapters in `server.js`.
4. Add backend-first frontend API client methods.
5. Convert scroll-based navigation to page view routing with animated transitions.
6. Update CSS so each view has a distinct composition while sharing design tokens.
7. Verify syntax, API routes, public provider checks, and local server health.
