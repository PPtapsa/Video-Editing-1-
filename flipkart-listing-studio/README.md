# Flipkart Listing Studio

Single-page tool for building, scoring, storing and copying Flipkart Seller Hub listings
(Faucet, Drain Strainer, Shower Head, plus custom categories) for Tapsa and Hybath.

- `src/` — source modules (logic, defaults, UI helpers, store, tabs, category builder) and `page.html` template
- `build.mjs` — inlines everything into `dist/flipkart-listing-studio.html` (the published artifact page)
- `test/logic.test.js` — unit tests for the pure logic (title formulas, ending-in-99 MRP rounding,
  volumetric weight, Smart Title Case, n-gram density, case-preserving token replacement, 80-char Type cap,
  keyword bank, paste-back parser)
- `test/smoke.mjs`, `test/smoke2.mjs` — Playwright smoke tests against `test/harness.html`
- `test/roundtrip.mjs` — Excel export → re-import round trip (faucet master + 2 variants), workbook format checks, hand-edited sheet preview

```
node build.mjs
node test/logic.test.js
node test/smoke.mjs <screenshot-dir>
```
