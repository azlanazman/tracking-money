# Lumina — Commercialisation Roadmap

**Version**: 1.1 — April 2026  
**Horizon**: 6 months to launch-ready  
**Token allocation**: 60% of plan usage for this project

---

## How to Read This Plan

Each phase has a goal, a list of features, and a set of **Claude Code sessions**. Every session is a self-contained unit of work — one session = one Claude Code conversation, started fresh. This keeps token consumption predictable and prevents context bloat from killing a session mid-build.

The token constraint is real right now. Anthropic has acknowledged that people are hitting usage limits in Claude Code way faster than expected, and weekly quotas now apply to heavy users on Pro and Max plans. The session design here accounts for that — each session is scoped tightly so you are never caught mid-feature when the limit hits.

---

## Architecture Note (Updated April 2026)

The codebase was restructured into a **single-page app**. The separate `budget.html`, `charts.html`, `forecast.html`, `settings.html`, all CSS files, and the old monolithic JS files were removed. JS was subsequently extracted from inline `<script>` back into separate files for maintainability (commit `89f1062`).

**Current file layout:**
- `index.html` (~774 lines) — HTML structure and inline `<style>` block only
- `js/payperiod.js` (~167 lines) — pay period utilities, loaded in `<head>`
- `js/app.js` (~722 lines) — all state, navigation, Firebase data, and screen render logic
- `js/auth.js` (~187 lines) — Firebase init, auth state observer, auth UI

**What this means for sessions:**
- "Files to bring" is `index.html` (relevant screen div) + the JS function(s) from `js/app.js` + `js/payperiod.js` if pay period logic is involved
- Each screen's JS section in `app.js` is delimited by `// ── Section Name ──` comments

---

## Token Budget Reality Check

Pro plan users typically have access to approximately 44,000 tokens per 5-hour period, which translates to roughly 10–40 prompts depending on the complexity of the codebase being analysed.

Your allocation at 60% of that:
- **Per session**: ~26,000 tokens available for this project
- **Safe prompt budget per session**: 6–15 prompts depending on file size
- **Weekly**: Assume 3–4 usable sessions per week (accounting for weekly limits and reset cycles)

This means **one feature per session**, not one phase per session. The plan is structured accordingly.

### How to protect your budget

1. **Start each session by pasting only the relevant sections** — not the whole file. For most features, paste the relevant screen div + its JS section + payperiod.js if needed.
2. **Use `/compact` in Claude Code** before switching tasks within a session.
3. **Keep CLAUDE.md tight** — it loads into every session. Every word costs.
4. **One session = one feature** — finishing half a feature and continuing in a new session wastes tokens re-establishing context.
5. **Do planning in claude.ai chat, not Claude Code** — Claude Code sessions are expensive. Use chat for thinking, Claude Code for building.
6. **Run Claude Code in off-peak hours** — early morning or late evening sessions go further.

---

## Phase 0 — Foundation Hardening ✅ COMPLETE

**Status**: Done. The multi-page architecture was replaced by a SPA which addressed these concerns structurally. Individual sessions below are marked with their outcome.

| # | Session Goal | Status | Notes |
|---|---|---|---|
| 0.1 | Normalise JS files to consistent error handling and Firebase null-checks | ✅ Done | Completed in commit `2cbe906`; fixes to `payperiod.js` persist; `app.js` was later absorbed into the SPA |
| 0.2 | Audit and fix mobile layout issues below 400px | ✅ Done | Fixed in commit `a8bbb70`; sub-400px CSS rules now live in `index.html` `<style>` block |
| 0.3 | Standardise CSS — merge patch files, remove dead rules | ✅ Superseded | All CSS is now inline in `index.html`; patch files were deleted with the multi-page structure |
| 0.4 | Add loading and empty states everywhere | ✅ Done | `isLoading` flag added to `app.js`; spinner shown on Dashboard, Transactions, Analytics, Budgets, Forecast while Firebase connects; empty states added for Analytics (no chart on zero data), Forecast (no transactions), Settings accounts and categories tabs |

---

## Phase 1 — Early Warning System

**Duration**: Week 3–5  
**Goal**: The app starts telling users what is about to happen, not just what already happened.

| # | Session Goal | Status | Files to bring | Prompt to use in Claude Code |
|---|---|---|---|---|
| 1.1 | Burn rate widget on Budget Monitor | ✅ Done | — | — |
| 1.2 | Unusual spend flag on transactions | ✅ Done | — | — |
| 1.3 | Budget breach alert panel | ✅ Done | — | — |
| 1.4 | Alert badge on Budgets nav item | ✅ Done | — | — |

---

## Phase 2 — Understanding Layer

**Duration**: Week 6–9  
**Goal**: Give users tools to understand *why* their money moved the way it did, not just *that* it did.

| # | Session Goal | Status | Files to bring | Prompt to use in Claude Code |
|---|---|---|---|---|
| 2.1 | Financial Health Score on dashboard | ✅ Done | — | — |
| 2.2 | Money flow waterfall chart in Analytics | ✅ Done | `index.html` (paste `sc-analytics` div + `renderAnalytics` function) | "In index.html, add a Waterfall tab to the `sc-analytics` screen alongside the existing bar/line charts. For the selected period, show a waterfall chart using Chart.js that starts with total income, then subtracts: committed costs (Loan, Bills, Takaful, CC, Subs combined), discretionary spending (all other expense categories), savings — leaving the remaining balance as the final bar. Use the existing `PAL` colour palette and period selector pattern." |
| 2.3 | Life event annotations | ✅ Done | `index.html` (paste `sc-settings` div + `renderSettings` function + `renderAnalytics` function) | "In index.html, add a Life Events section to the `sc-settings` screen. The section has an inline form with three fields: a date input, a text input for the label, and an icon selector — six choices rendered as clickable Material Symbols icons: `celebration` (celebration), `warning` (problem), `work` (work), `favorite` (health), `flight` (travel), `more_horiz` (other). On submit, save to Firestore under `users/{uid}/annotations/{id}` with fields: date, label, icon, createdAt. Below the form, list existing annotations (date · icon · label) with a delete icon button on each row that removes the document from Firestore. Load annotations inside `initDB` with a `onSnapshot` listener on `users/{uid}/annotations`, store in a global `annotations[]` array, and call `renderAnalytics()` after load if it is already active. On the analytics screen, load `chartjs-plugin-annotation` from CDN (jsDelivr, placed immediately after the Chart.js script tag). Register it globally with `Chart.register(ChartAnnotation)`. In `renderAnalytics`, after building chart config for the stacked bar chart and the line chart (the two existing Chart.js charts — not the Waterfall tab), add an `annotations` object to each chart's `plugins.annotation` config. For each entry in `annotations[]`, add a vertical line annotation: `type: 'line'`, `scaleID: 'x'`, `value` set to the annotation date formatted to match the chart's x-axis label, `borderColor: '#6366f1'`, `borderWidth: 1`, `borderDash: [4, 4]`, and a `label` with the annotation label text and the Material Symbols icon name displayed above the line. Show all annotations regardless of the active period selector — do not filter by period. Do not touch the Waterfall tab or any other screen." |
| 2.4 | End-of-period review prompt | ⬜ Not started | `index.html` (paste `sc-budgets` div + `renderBudgets` function) | "In index.html, add an end-of-period review prompt to the `sc-budgets` screen. At the end of each pay period, if total spending exceeded total budget, show a gentle prompt: 'Last period went over budget. Take 2 minutes to note what happened.' The prompt opens a small inline form with three fields: what happened (text), main reason (dropdown: unexpected expense / underestimated category / income was lower / planned overspend / other), and what I'll do differently (text). Save to Firestore under `users/{uid}/reviews/{YYYY-MM}`. Show past reviews in a collapsible history list below the form." |
| 2.5 | Dashboard visual revamp — Session A: content | ✅ Done | `index.html` (paste `sc-dashboard` div) + `js/app.js` (paste `renderDashboard` function + `calculateHealthScore` function + `unusualThresholds` function) | "Revamp the `sc-dashboard` screen in index.html to match a mobile-first layout. Replace the existing bento grid with these sections in order: (1) Greeting header — 'Good morning/afternoon/evening, [first name]' derived from `currentUser.displayName`, with pay period range and days left below it (e.g. 'Apr 1 – Apr 24 · 8 days left'), calculated from `PAY_PERIOD.currentPeriod()`. (2) Financial Health hero card — full-width, warm cream background (`bg-[#f5f3ee]`), larger SVG ring (keep IDs `hs-ring`, `hs-score`, `hs-label`, `hs-detail`); `calculateHealthScore()` is unchanged. (3) Budget Runway card — two stacked progress bars side by side: left bar shows budget used (total period expense / total budget, labelled 'Budget used', shows 'RM X / RM Y' below), right bar shows period elapsed (days elapsed / total period days, labelled 'Period elapsed', shows 'Day X of Y' below); status text at top-right ('Lasts the full period' if projected spend ≤ budget, 'At risk' if over). (4) Three summary chips in a horizontal row — Income (green), Spent (neutral/dark), Saved (blue) — using the same `inc`, `exp`, `sav` values already in `renderDashboard`. (5) Anomaly alert card — call `unusualThresholds()` inside `renderDashboard`, find the highest anomalous expense transaction from the current period `inP`, render an amber card with the transaction category, amount, date, and 'That's Nx your usual for [category]'; hide the card if no anomaly exists; 'Review transaction →' calls `nav('transactions')`. (6) Full-width 'Add transaction' button at the bottom calling `nav('entry')`. Remove from the dashboard: the gradient Liquidity hero card, the Income and Expenses bento cards, the Recent Transactions list, the Net Gain YTD chart, and the Top Allocations card. Do not touch any other screen." |
| 2.6 | App chrome revamp — sidebar polish + top bar | ✅ Done | `index.html` (paste `<nav>` sidebar block + `<main>` opening tag + nav-related CSS in `<style>`) + `js/app.js` (paste `nav()` function + `TITLES` map) | "Revamp the app chrome in index.html. (1) Sidebar: add a 'Lumina / FINANCIAL' brand header at top; add Material Symbols icons before each nav label; add a full-width indigo 'New Transfer' pill button above a divider that calls `nav('entry')`; add 'Support' and 'Sign Out' text links below the divider; add a green-dot record count badge at the very bottom ('N RECORDS' derived from `txs.length`, updated via a new `updateRecordCount()` call inside `renderDashboard`); keep the existing Budgets red-dot alert badge. (2) Top bar: add a `<header>` spanning the main content area with: left — 'Financial Intelligence' heading; centre — a non-functional search `<input>` (placeholder 'Search transactions…'); right — notification bell icon, a non-functional dark-mode-toggle icon button, and the existing user avatar `#top-avatar`. Shift `<main>` down by the header height using padding-top. Do not touch any screen content, render functions, or Firestore logic." |
| 2.7 | Dashboard hero row — liquidity card + layout tweaks | ✅ Done | `index.html` (paste `sc-dashboard` div) + `js/app.js` (paste `renderDashboard` function + `calculateHealthScore` function) | "In index.html, make three layout changes to the `sc-dashboard` screen. (1) Two-column hero row: wrap the health score card and a new 'Total Liquidity' card in a two-column CSS grid (`grid grid-cols-2 gap-4`). Health score card on the left (keep all existing IDs). Liquidity card on the right: label 'TOTAL LIQUIDITY', large figure showing current period balance (inc − exp − sav) via `RM()`, and a period-over-period comparison line: compute the same balance for the previous period using `PAY_PERIOD.lastNPeriods(txs, 1)`, show percentage change with a green up-arrow if positive, red down-arrow if negative. (2) Budget runway bars side-by-side: change the two stacked progress bars inside the runway card to a two-column grid — 'BUDGET USED' on the left, 'PERIOD ELAPSED' on the right. Keep all existing IDs (`d-runway-used-fill`, `d-runway-used-amt`, `d-runway-elapsed-fill`, `d-runway-days`, `d-runway-status`) and all data logic unchanged. (3) No changes to any other screen." |

---

## Phase 3 — Personalisation

**Duration**: Week 10–12  
**Goal**: The app learns the user's patterns and reflects them back.

| # | Session Goal | Status | Files to bring | Prompt to use in Claude Code |
|---|---|---|---|---|
| 3.1 | Personal spending playbook | ⬜ Not started | `index.html` (paste `sc-settings` div + `renderSettings` + `renderBudgets` budget progress section) | "In index.html, add a Playbook section to the `sc-settings` screen. For each expense category, users can write a personal note — their own reminder of what to check when that category goes high. Store in Firestore under `users/{uid}/settings/playbook` as a map of category to note text. On the budgets screen, when a category shows warning or over-budget status, display its playbook note as a soft tip below the progress bar." |
| 3.2 | Habit detection — unbudgeted recurring expenses | ⬜ Not started | `index.html` (paste `sc-forecast` div + `renderForecast` function) | "In index.html, add a 'Recurring but Unbudgeted' section to the `sc-forecast` screen. Scan the `txs` array across the last 3+ pay periods using `PAY_PERIOD.lastNPeriods` to find expense categories that appear in every period but have no budget set in `budgets{}`. List them with their average monthly amount and an 'Add to budget' button that switches to the budgets screen and scrolls to the budget input for that category. Show this section only if at least one such category exists." |
| 3.3 | Daily spending heatmap | ⬜ Not started | `index.html` (paste `sc-analytics` div + `renderAnalytics` function) | "In index.html, add a Heatmap tab to the `sc-analytics` screen showing a calendar grid of the last 3 months. Each day cell is coloured by total spend — white for zero, light indigo for low, through to dark indigo for high spend days. Clicking a day shows a small tooltip listing transactions for that day. Build in plain HTML/CSS/JS using a CSS grid of divs — no external library." |
| 3.4 | 12-month compliance history | ⬜ Not started | `index.html` (paste `sc-forecast` div + `renderForecast` function) | "In index.html, add a Budget Track Record section to the `sc-forecast` screen showing the last 12 pay periods as a grid of month badges. Each badge is green if total spending stayed within total budget, red if it went over, grey if no budget was set. Calculate from `txs` and `budgets`. Store the compliance result for each period in Firestore under `users/{uid}/health/history` so the record persists even after transactions are deleted." |

---

## Phase 4 — Pre-Launch Polish

**Duration**: Week 13–16  
**Goal**: Make it trustworthy and shareable.

| # | Session Goal | Status | Files to bring | Prompt to use in Claude Code |
|---|---|---|---|---|
| 4.1 | Firebase Authentication — login wall | ✅ Done | — | — |
| 4.2 | Data isolation — all Firestore paths user-scoped | ✅ Done | — | — |
| 4.3 | Onboarding flow for new users | ⬜ Not started | `index.html` (paste `initDB` function + `sc-entry` div) | "In index.html, add a first-run onboarding flow for new users who have zero transactions and no categories saved. After `initDB` loads settings and finds them empty, show a 3-step modal: (1) Set your salary day; (2) Add your first account; (3) Add your first expense category. After completing the 3 steps, dismiss the modal and store a completion flag in Firestore under `users/{uid}/settings/preferences` so it never shows again. Keep it short — get them to their first transaction, not explain everything." |
| 4.4 | Performance — defer Chart.js load | ⬜ Not started | `index.html` (paste script tags in `<head>` + `renderAnalytics` function) | "In index.html, defer loading the Chart.js CDN script until the user first navigates to the Analytics screen. Remove the Chart.js `<script>` tag from `<head>`. In the `nav()` function, when switching to 'analytics', dynamically inject the Chart.js script tag if not already loaded, then call `renderAnalytics` in its `onload` callback. This reduces initial page load weight." |
| 4.5 | PWA — installable on mobile | ⬜ Not started | `index.html` (`<head>` section) | "Make the app installable as a Progressive Web App. Create `manifest.json` with app name 'Lumina', icons (simple coloured square SVGs in indigo #3525cd), theme colour #3525cd, display: standalone. Create `sw.js` that caches `index.html`, `js/payperiod.js`, and CDN resources for offline access (excluding Firebase calls). Register the service worker in `index.html`." |
| 4.6 | Offline handling and error boundaries | ⬜ Not started | `index.html` (paste `initDB` function + `setDB` function) | "In index.html, add graceful offline handling. When Firebase fails to connect or the Firestore listener errors, show a persistent banner at the top of the app shell: 'You are offline — showing last loaded data'. Cache the last-known `txs`, `budgets`, and `goals` values in localStorage whenever they update via snapshot. On load, if Firebase hasn't connected within 3 seconds, fall back to localStorage cache. When connectivity resumes and snapshots fire again, clear the banner and refresh." |
| 4.7 | Demo environment — seed tool + read-only mode | ✅ Done | — | Created `demo/seed.html`: standalone internal tool that signs in as `demo@lumina.app`, wipes existing data, and batch-seeds ~88 transactions across Jan–Apr 2026, plus budgets, goals (3), life event annotations (3), and preferences. Re-runnable — safe to run again at any time to reset demo state. Added `DEMO_MODE` flag in `app.js` (activates on `demo@lumina.app` login): guards all 15 write functions with a toast "Demo mode — changes are disabled"; shows an amber "Demo Mode" pill in the top bar; resets to `false` on sign-out. |
| 4.8 | Design system foundation — CSS tokens + typography | ✅ Done | `index.html` (paste `<head>` and `<style>` block only) | "In index.html, layer a CSS custom property design system on top of the existing Tailwind setup. (1) Fonts: replace the Manrope + Inter Google Fonts link with a single link loading Geist (wght 300–700), Instrument Serif (regular + italic), and Geist Mono (wght 400–500) from Google Fonts. (2) CSS tokens: in the `<style>` block, add a `:root` block with: `--bg:#F5F3EE`, `--bg-2:#EEEBE3`, `--surface:#FFFFFF`, `--ink:#14120F`, `--ink-2:#3A362E`, `--ink-3:#6B6559`, `--ink-4:#A39C8E`, `--line:rgba(20,18,15,0.08)`, `--line-2:rgba(20,18,15,0.04)`, `--accent:#2B5F3E`, `--accent-soft:#D9E4D8`, `--warn:#B8572B`, `--shadow-sm:0 1px 2px rgba(20,18,15,0.04)`, `--shadow-md:0 4px 20px rgba(20,18,15,0.06)`, `--r-sm:10px`, `--r-md:16px`, `--r-lg:24px`, `--r-xl:36px`, `--sans:'Geist',-apple-system,system-ui,sans-serif`, `--serif:'Instrument Serif',Georgia,serif`, `--mono:'Geist Mono',ui-monospace,monospace`. (3) Theme overrides: add `[data-theme='dark']` block with `--bg:#0C0B0A`, `--bg-2:#141311`, `--surface:#1A1816`, `--ink:#F4F1EA`, `--ink-2:#D0CBC0`, `--ink-3:#8A847A`, `--ink-4:#56524B`, `--accent:#C9F560`, `--accent-soft:rgba(201,245,96,0.12)`, `--warn:#F5A15F`. Add `[data-theme='warm']` block with `--bg:#F7EFE4`, `--bg-2:#F0E6D6`, `--surface:#FBF6EE`, `--ink:#2A1F14`, `--ink-2:#4E3F2E`, `--ink-3:#857663`, `--ink-4:#B5A691`, `--accent:#C85A3C`, `--accent-soft:#F2D9CC`, `--warn:#B56B1C`. (4) Typography: update existing `body` rule to add `font-family:var(--sans)` and `h1,h2,h3,h4` to add `font-family:var(--serif)`. Do not touch any Tailwind utility classes, any HTML structure, or any JS files." |
| 4.9 | Theme switcher — light / dark / warm | ✅ Done | `index.html` (paste `sc-settings` div) + `js/app.js` (paste `renderSettings` function) | "In index.html, add a Theme section to the top of the `sc-settings` screen. Render three pill buttons in a horizontal row: 'Minimal' (sets `data-theme=''`), 'Dark' (sets `data-theme='dark'`), 'Warm' (sets `data-theme='warm'`). On click, write `document.body.setAttribute('data-theme', val)` and persist the value to `localStorage` under the key `lumina-theme`. Mark the active button with a filled background using `var(--accent)`. Add a new `initTheme()` function in `js/app.js` that reads from `localStorage` and applies the theme immediately before `initFirebase()` is called — this prevents a flash of the wrong theme on load. Do not touch any other screen or any Firestore logic." |
| 4.10 | Sidebar redesign — new mark, accent nav, runway card | ⬜ Not started | `index.html` (paste `<aside id="sidebar">` block) + `js/app.js` (paste `renderDashboard` function) | "In index.html, redesign the `<aside id='sidebar'>` block. (1) Brand: replace the Material Symbols wallet icon with a 28×28 dark square (`background:var(--ink)`, border-radius 8px) containing a crescent SVG (`<path d='M8 3a10 10 0 1012 12A8 8 0 018 3z' fill='var(--bg)'/>`). Change the 'Lumina' wordmark `<div>` to `font-family:var(--serif); font-style:italic; font-size:22px`. (2) Nav active state: change `.nav-active` CSS rule from the indigo `#eef2ff / #3525cd` to `background:var(--accent-soft); color:var(--accent)`. Nav hover stays as-is. (3) Runway mini card at sidebar bottom: replace the existing record-count badge `<div>` at the bottom of the sidebar with a compact card (`background:var(--surface); border:1px solid var(--line); border-radius:var(--r-md); padding:14px`) containing: label 'NEXT SALARY' (10px, `var(--ink-3)`, uppercase, tracking-wider), days remaining in serif italic at 26px with id `sb-runway-days`, a thin 4px progress bar (`background:var(--line)`, inner fill `var(--accent)`) with id `sb-runway-bar-fill`, and a small date-range line (e.g. 'Apr 20 → May 1') with id `sb-runway-dates` at 10px `var(--ink-3)`. Add a `updateSidebarRunway()` function in `js/app.js` that computes days remaining from `PAY_PERIOD.currentPeriod()` and writes to those three IDs; call it at the end of `renderDashboard()`. Keep all existing `onclick='nav(...)'` handlers and nav IDs unchanged." |
| 4.11 | RunwayHero — animated arc ring on dashboard | ⬜ Not started | `index.html` (paste `sc-dashboard` div) + `js/app.js` (paste `renderDashboard` function + `calculateHealthScore` function) | "In index.html, add a RunwayHero widget as the first child of `sc-dashboard`, before the existing hero row. The widget is a full-width card (`background:var(--bg-2); border:1px solid var(--line); border-radius:var(--r-lg); padding:40px; position:relative; overflow:hidden`) with a soft radial gradient overlay (`background:radial-gradient(circle at 80% 20%, var(--accent-soft), transparent 60%); opacity:0.6; position:absolute; inset:0; pointer-events:none`). Inside: a flex row with an SVG ring on the left and a stat column on the right. SVG ring (280×280): outer circle track in `var(--line)`, 12px stroke. Progress arc in `var(--accent)`, 12px stroke, stroke-linecap round, animated via stroke-dashoffset from `circumference` to `circumference * (1 - daysRemaining/daysTotal)` over 1.6s using `requestAnimationFrame` with ease-out expo. 30 day-tick marks at each 1/30 rotation, past ticks `var(--ink-4)` at 50% opacity, future ticks `var(--line)`. Centre: 'RUNWAY' label (10px uppercase `var(--ink-3)`), large number in serif italic (font-size 120px, line-height 0.85) with id `rh-days`, 'days to [end-date]' label. Right column: a serif italic sentence 'You can spend RM [daily-safe-spend] a day and finish green.' (or 'Slow down RM [X] a day to recover.' if over), at 36px; daily-safe-spend = max(0, (totalBudget − totalSpent) / daysRemaining). Below: 3 stat cells (Spent / Income / Saved) using `font-family:var(--mono)`. Derive all values from existing `txs[]`, `budgets{}`, and `PAY_PERIOD.currentPeriod()`. Animate the centre count from 0 to actual value in sync with the arc. Store RAF id in a module-level `_rhRaf` variable, cancel it at the top of `renderDashboard()`. Do not modify any existing card below the hero or any other screen." |
| 4.12 | Surface token pass + transaction row restyle | ⬜ Not started | `index.html` (paste `sc-dashboard` div + `sc-transactions` div) + `js/app.js` (paste `renderTxs` function) | "Two contained polish changes. (1) Add a CSS class `.lum-card` to the `<style>` block: `background:var(--surface); border:1px solid var(--line); box-shadow:var(--shadow-sm); border-radius:var(--r-lg)`. Apply this class to the existing dashboard health score card, the budget runway card, the 3-stat chip row, and the anomaly alert card — add it alongside their existing Tailwind classes, do not remove Tailwind classes. Update the sidebar 'Log Transaction' button and the dashboard 'Add transaction' button background to `var(--accent)`. (2) In `renderTxs()` in `js/app.js`, update the icon badge on each transaction row: replace the category-colored left-border or dot with a 28×28 square badge (border-radius 8px): income rows get `↑` symbol on `var(--accent-soft)` background in `var(--accent)` color; savings rows get `→` on `var(--line-2)` in `var(--ink-3)` color; expense rows get `↓` on `var(--line-2)` in `var(--ink-3)` color. Apply `font-family:var(--mono)` to the amount span in each row. Keep all existing edit/delete buttons, onclick handlers, and data-id attributes unchanged. Do not touch any other screen or render function." |

---

## Phase 5 — Commercialisation Readiness

**Duration**: Week 17–20  
**Goal**: The infrastructure to charge for the product and support multiple users properly.

| # | Session Goal | Status | Files to bring | Prompt to use in Claude Code |
|---|---|---|---|---|
| 5.1 | Landing page — standalone marketing page | ⬜ Not started | Nothing from the app | "Create a standalone `landing.html` for the app. It should not require Firebase. Include: headline and one-sentence value proposition, three feature highlights (budget countdown, health score, spend anomaly detection), a call-to-action button to sign up (links to index.html), and a footer. Use the indigo colour scheme (#3525cd primary). No frameworks, no CDN dependencies except Google Fonts (Manrope + Inter)." |
| 5.2 | Usage limits for free tier | ⬜ Not started | `index.html` (paste `initDB` function + `submitEntry` function) | "In index.html, add a free tier limit of 50 transactions. In `submitEntry`, before saving to Firestore, count the user's existing transactions. If count >= 50 and user's plan is not 'pro', show a modal explaining the limit with a call-to-action to upgrade. Read the user's plan tier from Firestore under `users/{uid}/plan` (default: 'free'). Do not build payment processing — just enforce the limit and show the upgrade prompt." |
| 5.3 | Basic admin view | ⬜ Not started | Nothing from the app | "Create a standalone `admin.html` protected by a hardcoded admin UID check. List all documents in the `users` collection showing: uid, email, plan tier, transaction count, and last active date. This is operator-only — not a public feature. Plain HTML table, minimal styling." |
| 5.4 | Export to PDF — monthly statement | ⬜ Not started | `index.html` (paste `sc-transactions` div + `renderTx` function) | "In index.html, add a 'Download Statement' button to the transactions screen. When clicked, trigger `window.print()` with a `@media print` stylesheet that hides navigation, filters, and pagination, and renders a clean statement: period label, summary totals, and a full transaction table. No external PDF library." |

---

## Go/No-Go Checklist Before Launch

**Technical**
- [x] Authentication is live and every Firestore path is user-scoped
- [ ] App works offline and recovers cleanly when connection returns
- [ ] App is installable as a PWA on both Android and iOS
- [ ] No Firebase API keys exposed in any public repository
- [ ] All pages load in under 3 seconds on a mid-range Android device on 4G

**Product**
- [ ] A brand new user can complete onboarding and add their first transaction in under 3 minutes
- [ ] The health score, burn rate, and anomaly flag all show meaningful data after 1 week of use
- [ ] Every alert has a clear resolution path — the user knows what to do when they see it
- [ ] The app has been used by at least 3 people who are not you, and their feedback is addressed

**Commercial**
- [ ] Free tier limit is enforced
- [ ] Landing page is live on a real domain (not localhost)
- [ ] You have a payment method ready to hook in (Stripe or local equivalent)
- [ ] Privacy policy exists — even a simple one — because you are storing financial data
- [ ] You know your target price point and can explain why someone should pay it

---

## Session Discipline — Rules to Follow Every Time

1. **Plan in chat, build in Claude Code.** Use this conversation for thinking, scoping, and reviewing. Only switch to Claude Code when you have a clear, bounded task.

2. **One session, one feature.** Never start a second feature in the same Claude Code session. Close the session when the feature is done and tested.

3. **Paste only what Claude Code needs.** The app is one big file now. Before starting a session, identify which screen div and which JS function(s) are relevant — paste those sections only, not the whole file.

4. **Test before closing the session.** Open the browser, confirm the feature works, then close Claude Code. If you find a bug the next day, open a new session.

5. **Update CLAUDE.md after each phase.** Add any new Firestore collections or new screen sections so the next session starts with accurate context.

6. **Use this chat to write your next prompt.** Before each Claude Code session, describe what you want to build here first. That process of writing it out often reveals scope issues before they cost tokens.

---

## Timeline Summary

| Week | Phase | Milestone |
|---|---|---|
| 1–2 | Foundation | ✅ Done — SPA built, auth live, data user-scoped |
| 3–5 | Early Warnings | Anomaly flags, breach alerts, alert badge |
| 6–9 | Understanding | Health score, waterfall, annotations, reviews |
| 10–12 | Personalisation | Playbook, habit detection, heatmap, compliance history |
| 13–16 | Polish | Onboarding, deferred Chart.js, PWA, offline handling |
| 17–20 | Commercialisation | Landing page, free tier limits, admin view, PDF export |
| 21+ | Launch | Go/no-go checklist complete — start telling people |
