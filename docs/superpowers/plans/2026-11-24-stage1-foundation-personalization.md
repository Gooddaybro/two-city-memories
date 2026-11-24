# 双城约会纪念册 · 第一阶段（稳地基与个人化）实施计划

> **For agentic workers:** Execute task-by-task with strict TDD for data/storage modules and full end-to-end verification before completion. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the monolithic `index.html` into a zero-build ES Modules web app personalized for 许金阳（小狗 · 北京）⇄ 渐姝君（小猪 · 连云港）, with Schema v2 + legacy migration, StorageAdapter abstraction, "关于我们" couple profile & milestones, `images/` guide, mobile-first bottom nav, and full PWA support.

**Architecture:** Native browser ES Modules (`assets/css/main.css`, `data/defaults.js`, `js/schema.js`, `js/store.js`, `js/modules/*.js`, `js/app.js`) deployed directly from GitHub Pages `main / (root)` using relative paths (`./`). Pure-function `schema.js` and injectable `MemoryStore` in `store.js` are verified with `node --test`.

**Tech Stack:** HTML5, Tailwind CSS CDN, CSS Custom Properties, Vanilla ES Modules (ES2022+), Service Worker & Web App Manifest, Node.js `v24` built-in test runner (`node --test`).

---

## Task 1: Defaults & Schema v2 (`data/defaults.js`, `js/schema.js`) — TDD

**Files:**
- Create: `tests/schema.test.mjs`
- Create: `data/defaults.js`
- Create: `js/schema.js`

- [ ] **Step 1:** Write failing unit tests in `tests/schema.test.mjs` covering:
  - `createDefaultState()` returns `schemaVersion: 2`, `startDate: "2026-08-08T00:00:00"`, `passcode: "0808"`, `lockOnOpen: false`, partners 许金阳（小狗/北京）& 渐姝君（小猪/连云港）, pinned core wish `"希望有一天能不在异地 并且我们越来越好"`, 4 default milestones, 5 tickets (Zaozhuang `2026.08.08 – 08.09`), 4 photos (`.webp`), 2 personalized letters.
  - `normalizeState(partial)` safely fills missing fields and defends against corrupted types.
  - `migrateLegacyStorage(rawLegacy)` upgrades old `bj_lyg_tickets`, `bj_lyg_wishes`, `bj_lyg_letters`, `bj_lyg_next_meet` into Schema v2 and ensures the pinned core wish exists.
  - `migrateBackupPayload(raw)` accepts both v1 backup `{ tickets, wishes, letters, nextMeet }` and v2 backup `{ schemaVersion: 2, ... }`, and throws on invalid payload.
- [ ] **Step 2:** Run `node --test tests/schema.test.mjs` and confirm RED failure.
- [ ] **Step 3:** Implement `data/defaults.js` and `js/schema.js` with clean pure functions.
- [ ] **Step 4:** Run `node --test tests/schema.test.mjs` and confirm GREEN pass.

---

## Task 2: Storage Adapter Layer (`js/store.js`) — TDD

**Files:**
- Create: `tests/store.test.mjs`
- Create: `js/store.js`

- [ ] **Step 1:** Write failing unit tests in `tests/store.test.mjs` covering:
  - Fresh storage initializes from defaults and persists to `two_city_memories_v2`.
  - Storage containing only legacy `bj_lyg_*` keys automatically migrates to `two_city_memories_v2`.
  - Corrupted JSON in storage gracefully falls back to defaults without throwing.
  - `update(mutator)` updates state, persists, and notifies subscribers.
  - `exportPayload()` + `importPayload(raw)` round-trips losslessly; invalid JSON throws readable error without mutating state.
  - `reset()` clears v2 key and restores default state.
- [ ] **Step 2:** Run `node --test tests/store.test.mjs` and confirm RED failure.
- [ ] **Step 3:** Implement `js/store.js` with `MemoryStore` and `createBrowserStore()`.
- [ ] **Step 4:** Run `node --test` and confirm all tests pass.

---

## Task 3: PWA Assets, Icons & Photo Directory Guide

**Files:**
- Create: `assets/icons/icon.svg`
- Create: `assets/icons/icon-192.png`
- Create: `assets/icons/icon-512.png`
- Create: `assets/icons/apple-touch-icon.png`
- Create: `manifest.json`
- Create: `sw.js`
- Create: `images/README.md`

- [ ] **Step 1:** Create vector icon `assets/icons/icon.svg` and generate crisp valid PNG icons (`192x192`, `512x512`, `180x180`) using a clean Node.js PNG generator (zero external dependencies).
- [ ] **Step 2:** Write `manifest.json` with relative `./` paths for GitHub Pages subpath compatibility.
- [ ] **Step 3:** Write `sw.js` with Network-First strategy and versioned cache cleanup.
- [ ] **Step 4:** Write `images/README.md` documenting avatar and 35mm gallery filenames, WebP conversion tips, and how to append new photos in `data/defaults.js`.

---

## Task 4: Modular Stylesheet (`assets/css/main.css`) & UI Modules (`js/modules/*.js`)

**Files:**
- Create: `assets/css/main.css`
- Create: `js/modules/ui.js`
- Create: `js/modules/counters.js`
- Create: `js/modules/couple.js`
- Create: `js/modules/tickets.js`
- Create: `js/modules/gallery.js`
- Create: `js/modules/wishlist.js`
- Create: `js/modules/letters.js`

- [ ] **Step 1:** Write `assets/css/main.css` with dark/light theme variables, film grain, glassmorphism cards, ticket notches, barcode, train dot animation, toast styles, and mobile bottom navigation safe-area styling.
- [ ] **Step 2:** Write `js/modules/ui.js` (HTML escape helper, Toast notifications, theme switcher, `0808` passcode lock screen + `lockOnOpen` toggle, starfield canvas, mobile bottom nav active-section highlight, JSON export/import/reset).
- [ ] **Step 3:** Write `js/modules/counters.js` (live love counter from `2026.08.08`, dynamic unique checked-in cities counter, next meetup countdown & modal).
- [ ] **Step 4:** Write `js/modules/couple.js` ("关于我们" dual partner profile cards with avatar fallback + profile edit modal, plus milestones timeline + add/delete milestone modal).
- [ ] **Step 5:** Write `js/modules/tickets.js` (dynamic ticket count, ticket cards, status toggle, add/delete ticket modal).
- [ ] **Step 6:** Write `js/modules/gallery.js` (dynamic city tabs, 35mm cards with graceful fallback, lightbox with caption/date, local temporary photo preview).
- [ ] **Step 7:** Write `js/modules/wishlist.js` (pinned core wish star highlight & top ordering, progress bar, toggle/add/delete).
- [ ] **Step 8:** Write `js/modules/letters.js` (许金阳 & 渐姝君 tabs, edit drawer, clipboard copy with fallback & Toast).

---

## Task 5: Refactor `index.html` & Wire `js/app.js`

**Files:**
- Modify: `index.html`
- Create: `js/app.js`

- [ ] **Step 1:** Refactor `index.html` into semantic layout with PWA/OG meta tags, top nav (`许金阳 ⇄ 渐姝君`), Hero, Section 02 "关于我们", Section 03–06, footer, modals, toast container, and mobile bottom tab bar (`md:hidden`).
- [ ] **Step 2:** Write `js/app.js` to bootstrap `createBrowserStore()`, register SW safely, bind all modules, keep reactive updates synchronized on store changes, and handle ESC key closure for modals.

---

## Task 6: Verification & Commit

- [ ] **Step 1:** Run full test suite `node --test` and confirm 0 failures.
- [ ] **Step 2:** Start a temporary local HTTP static server and probe all critical routes (`index.html`, `manifest.json`, `sw.js`, `assets/css/main.css`, all PNG icons, `js/app.js`, `data/defaults.js`) for HTTP 200 and valid JSON/PNG signatures.
- [ ] **Step 3:** Visually inspect the live page (desktop + mobile viewport) or verify zero runtime/console errors via browser check.
- [ ] **Step 4:** Review `git status` and commit Stage 1 implementation cleanly (excluding `.idea/`).
