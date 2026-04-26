# Lumina — Commercialisation Roadmap

**Version**: 1.3 — April 2026 (Phase I added — Insights intelligence layer)  
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
- `index.html` (~928 lines) — HTML structure and inline `<style>` block only
- `js/payperiod.js` (~172 lines) — pay period utilities, loaded in `<head>`
- `js/app.js` (~1467 lines) — all state, navigation, Firebase data, and screen render logic
- `js/auth.js` (~187 lines) — Firebase init, auth state observer, auth UI

> Line counts grow with each phase. Treat these as approximate — check `wc -l` before a session if you need the real number.

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
| 2.4 | End-of-period review prompt | ⏸ Deferred to Phase 3 | `index.html` (paste `sc-budgets` div + `renderBudgets` function) | "In index.html, add an end-of-period review prompt to the `sc-budgets` screen. At the end of each pay period, if total spending exceeded total budget, show a gentle prompt: 'Last period went over budget. Take 2 minutes to note what happened.' The prompt opens a small inline form with three fields: what happened (text), main reason (dropdown: unexpected expense / underestimated category / income was lower / planned overspend / other), and what I'll do differently (text). Save to Firestore under `users/{uid}/reviews/{YYYY-MM}`. Show past reviews in a collapsible history list below the form." |
| 2.5 | Dashboard visual revamp — Session A: content | ✅ Done | `index.html` (paste `sc-dashboard` div) + `js/app.js` (paste `renderDashboard` function + `calculateHealthScore` function + `unusualThresholds` function) | "Revamp the `sc-dashboard` screen in index.html to match a mobile-first layout. Replace the existing bento grid with these sections in order: (1) Greeting header — 'Good morning/afternoon/evening, [first name]' derived from `currentUser.displayName`, with pay period range and days left below it (e.g. 'Apr 1 – Apr 24 · 8 days left'), calculated from `PAY_PERIOD.currentPeriod()`. (2) Financial Health hero card — full-width, warm cream background (`bg-[#f5f3ee]`), larger SVG ring (keep IDs `hs-ring`, `hs-score`, `hs-label`, `hs-detail`); `calculateHealthScore()` is unchanged. (3) Budget Runway card — two stacked progress bars side by side: left bar shows budget used (total period expense / total budget, labelled 'Budget used', shows 'RM X / RM Y' below), right bar shows period elapsed (days elapsed / total period days, labelled 'Period elapsed', shows 'Day X of Y' below); status text at top-right ('Lasts the full period' if projected spend ≤ budget, 'At risk' if over). (4) Three summary chips in a horizontal row — Income (green), Spent (neutral/dark), Saved (blue) — using the same `inc`, `exp`, `sav` values already in `renderDashboard`. (5) Anomaly alert card — call `unusualThresholds()` inside `renderDashboard`, find the highest anomalous expense transaction from the current period `inP`, render an amber card with the transaction category, amount, date, and 'That's Nx your usual for [category]'; hide the card if no anomaly exists; 'Review transaction →' calls `nav('transactions')`. (6) Full-width 'Add transaction' button at the bottom calling `nav('entry')`. Remove from the dashboard: the gradient Liquidity hero card, the Income and Expenses bento cards, the Recent Transactions list, the Net Gain YTD chart, and the Top Allocations card. Do not touch any other screen." |
| 2.6 | App chrome revamp — sidebar polish + top bar | ✅ Done | `index.html` (paste `<nav>` sidebar block + `<main>` opening tag + nav-related CSS in `<style>`) + `js/app.js` (paste `nav()` function + `TITLES` map) | "Revamp the app chrome in index.html. (1) Sidebar: add a 'Lumina / FINANCIAL' brand header at top; add Material Symbols icons before each nav label; add a full-width indigo 'New Transfer' pill button above a divider that calls `nav('entry')`; add 'Support' and 'Sign Out' text links below the divider; add a green-dot record count badge at the very bottom ('N RECORDS' derived from `txs.length`, updated via a new `updateRecordCount()` call inside `renderDashboard`); keep the existing Budgets red-dot alert badge. (2) Top bar: add a `<header>` spanning the main content area with: left — 'Financial Intelligence' heading; centre — a non-functional search `<input>` (placeholder 'Search transactions…'); right — notification bell icon, a non-functional dark-mode-toggle icon button, and the existing user avatar `#top-avatar`. Shift `<main>` down by the header height using padding-top. Do not touch any screen content, render functions, or Firestore logic." |
| 2.7 | Dashboard hero row — liquidity card + layout tweaks | ✅ Done | `index.html` (paste `sc-dashboard` div) + `js/app.js` (paste `renderDashboard` function + `calculateHealthScore` function) | "In index.html, make three layout changes to the `sc-dashboard` screen. (1) Two-column hero row: wrap the health score card and a new 'Total Liquidity' card in a two-column CSS grid (`grid grid-cols-2 gap-4`). Health score card on the left (keep all existing IDs). Liquidity card on the right: label 'TOTAL LIQUIDITY', large figure showing current period balance (inc − exp − sav) via `RM()`, and a period-over-period comparison line: compute the same balance for the previous period using `PAY_PERIOD.lastNPeriods(txs, 1)`, show percentage change with a green up-arrow if positive, red down-arrow if negative. (2) Budget runway bars side-by-side: change the two stacked progress bars inside the runway card to a two-column grid — 'BUDGET USED' on the left, 'PERIOD ELAPSED' on the right. Keep all existing IDs (`d-runway-used-fill`, `d-runway-used-amt`, `d-runway-elapsed-fill`, `d-runway-days`, `d-runway-status`) and all data logic unchanged. (3) No changes to any other screen." |

---

## Phase R — Home Tab Redesign

**Duration**: Runs in parallel with / immediately after Phase 2  
**Goal**: Deliver the redesigned Home tab and nav restructure. Each session is a self-contained component. Build in the order below — R.7 assembles everything last.

### Confirmed design decisions
- **Activity** = redesigned Transactions screen. Columns: Merchant (+ subtitle/memo), Category, Account, Date (with time), Amount. Type filter tabs: All | Expenses | Income | Savings. "+ Filter" button. Quick Log bar at bottom.
- **Insights** = single screen with tab switcher: **Spend** (current Analytics) | **Budgets** (current Budget Monitor) | **Forecast** (current Forecast).
- **Log Transaction full form** = moves under Settings nav as a dedicated section/tab. The `+ Log transaction ⌘N` sidebar CTA stays and routes there.
- **Coach card** = always visible, never dismissible. Priority 6 (savings lagging) included.
- **Quick Log bar** = thin wrapper around `submitEntry()`, no new Firestore write path.

### Build order (locked)

```
R.2 → R.1 → R.4 → R.3 → R.5 → R.6 → R.7
```

| # | Session Goal | Status | Files to bring | Session prompt |
|---|---|---|---|---|
| R.2 | Where It Went — period donut + vs-last deltas | ✅ Done | `js/app.js` (paste `renderDashboard` function) + `index.html` (paste `sc-dashboard` div) | See full prompt below |
| R.1 | Spend Rhythm — day-of-week heatmap + auto pattern label | ✅ Done | `js/app.js` (paste `renderDashboard` function) + `index.html` (paste `sc-dashboard` div) | See full prompt below |
| R.4 | Categories card on Home — budget progress mini-panel | ✅ Done | — | — |
| R.3 | Coach card — advisory message rule engine | ✅ Done | — | — |
| R.5 | Quick Log bar — persistent bottom entry | ✅ Done | — | Floating pill, fixed bottom, category + memo + log; no account selector |
| R.6 | Navigation restructure — Home / Activity / Insights / Settings | ✅ Done | — | Nav restructured; Log Transaction collapsible in Settings; fixed div nesting bug (sc-settings was outside #main) |
| R.7 | Home tab final assembly | ✅ Done | — | — |
| R.8 | Financial Health expanded card | ✅ Done | — | — |

---

### R.2 — Where It Went (session prompt)

> "In js/app.js, add a `renderWhereItWent()` function. In index.html, add a `<div id='d-where-it-went'>` placeholder inside `sc-dashboard` (exact position: after the Financial Health row, before Spend Rhythm).
>
> **Logic** (zero extra Firestore reads — all from `txs[]`):
> - Current period: `PAY_PERIOD.filterToPeriod(txs, PAY_PERIOD.currentPeriod())`, aggregate expense by category → `{Food: 842, Transit: 318, ...}`
> - Previous period: `PAY_PERIOD.lastNPeriods(2)[1]`, same aggregation → `{Food: 751, Transit: 345, ...}`
> - For each category in current period: `delta = (curr - prev) / prev * 100`. If no prev data, delta = null.
>
> **Render**:
> - Card: `background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:24px`
> - Header row: left — 'Where it went' (`font-family:var(--serif);font-size:20px`), right — 'Period breakdown · vs last' (`font-size:11px;color:var(--ink-3)`)
> - Two-column layout: left — Chart.js `doughnut` chart (200×200, `cutout:'72%'`, no legend, no tooltip title, value tooltip shows `RM X`); right — legend rows
> - Donut centre: 'TOTAL' label + `RM X.Xk` amount (inject via `afterDraw` plugin or absolute-positioned div overlay)
> - Legend rows (one per category, sorted by spend desc, max 6): category name, delta badge. Delta badge: if positive → `color:var(--warn)` text `+X%`; if negative → `color:var(--accent)` text `-X%`; if null → `color:var(--ink-4)` text `—`. No background on the badge — inline text only.
> - Donut segment colours: use `PAL` array already in app.js
> - Store the chart instance in a module-level `_whereChart` variable; destroy it before recreating (same pattern as `anBar`/`anLine`)
> - Call `renderWhereItWent()` at the end of `renderDashboard()`, after the existing render calls
> - Do not touch any other screen or function."

---

### R.1 — Spend Rhythm (session prompt)

> "In js/app.js, add a `renderSpendRhythm()` function. In index.html, add a `<div id='d-spend-rhythm'>` placeholder inside `sc-dashboard` (after Where It Went).
>
> **Data** (zero extra Firestore reads):
> - Get the last 28 days of expense transactions from `txs[]` by filtering `t.date >= 28daysAgo && t.type === 'expense'`
> - Build a 4×7 matrix: rows = W1–W4 (oldest first), columns = M T W T F S S
> - For each cell, sum all expense amounts on that calendar date. Use `–` and amount 0 for days with no transactions.
> - 4-week daily average: total of all cell amounts / count of cells with amount > 0
> - Day-of-week averages: for each column (M–S), average of the 4 weekly values (ignore 0-spend days)
> - Auto-pattern label: find the column with the highest day-of-week average. If that average is > 1.5× the overall weekly mean: label = `[Dayname]s run hot` (e.g. "Fridays run hot"). If the top 2 columns are Sat+Sun: label = "Weekends run hot". If no column exceeds 1.5×: label = null, subtitle shows "Last 4 weeks" only.
>
> **Render**:
> - Card: same surface/border/radius/padding as Where It Went
> - Header row: left — 'Spend rhythm' (serif 20px), right — '4-wk avg RM X' (ink-3, 12px, mono)
> - Subtitle: left — 'Last 4 weeks[· {patternLabel}]' (ink-3, 11px) — omit the label part if null
> - Grid: CSS grid `grid-template-columns: auto repeat(7, 1fr)`, gap 4px. Row labels W1–W4 in ink-4 at 10px. Column headers M T W T F S S in ink-3 at 10px, centered.
> - Cell appearance: `border-radius:8px; padding:10px 4px; text-align:center; font-family:var(--mono); font-size:12px`. Three tiers based on amount vs 4-week daily avg:
>   - Zero/no spend: `background:var(--bg-2); color:var(--ink-4)` — show `–`
>   - Low (≤ 0.75× avg): `background:rgba(201,245,96,0.08); color:var(--ink-3)`
>   - Mid (0.75×–1.5× avg): `background:rgba(201,245,96,0.25); color:var(--ink)`
>   - High (> 1.5× avg): `background:rgba(245,161,95,0.35); color:var(--ink)`
> - Legend row below grid: 'Avg daily spend in RM' left; 'LOW [dark swatch] [lime swatch] [orange swatch] HIGH' right — swatches are 10×10px divs with the same background colours above
> - Call `renderSpendRhythm()` at end of `renderDashboard()`. Do not touch any other screen."

---

### R.4 — Categories Card on Home (session prompt)

> "In js/app.js, add a `renderHomeCats()` function. In index.html, add a `<div id='d-home-cats'>` placeholder inside `sc-dashboard` in the right column of the second row (alongside Financial Health).
>
> **Logic** (no new Firestore reads — uses `budgets{}` and current-period `txs[]`):
> - Get all expense categories that have a budget set (`budgets[cat] && budgets[cat].amount > 0`)
> - For each: `spent = sum of current-period expenses for that category`, `limit = budgets[cat].amount`
> - Progress bar fill %: `Math.min(spent / limit * 100, 100)`
> - Bar colour: `var(--accent)` if `spent/limit < 0.85`, `var(--warn)` if `spent/limit >= 0.85`
> - Sort by `spent/limit` descending (most consumed first), show max 5 categories
>
> **Render**:
> - Card: same surface/border/radius tokens
> - Header row: left — 'Categories' (serif 18px), right — 'Adjust →' (ink-3, 12px, `onclick="nav('budgets')"`)
> - Category rows: category name (ink, 13px, font-weight 500), right-aligned `RM X / RM Y` (mono, 11px, ink-3). Below: progress bar full width, height 3px, background var(--line), inner fill var(--accent) or var(--warn), border-radius 99px.
> - Row gap: 14px. No budget set → hide the card entirely (set display:none on the wrapper)
> - Call `renderHomeCats()` at end of `renderDashboard()`. Do not touch any other screen."

---

### R.3 — Coach Card (session prompt)

> "In js/app.js, add a `renderCoach()` function. In index.html, add a `<div id='d-coach'>` placeholder inside `sc-dashboard` in the right column of the second row (below Categories card).
>
> **Rule engine** — evaluate in priority order, first match wins. All values computed from existing variables already available inside `renderDashboard` scope (`exp`, `inc`, `sav`, `budgetTot`, `daysLeft`, `daily`, `projected`, `dailySafe`):
>
> ```
> topCat = expense category with highest spend in current period (from inP)
> savGoal = goals.reduce((s,g) => s + (g.monthly||0), 0)
> savAmt = current period savings total
>
> Rule 1: exp > budgetTot && budgetTot > 0
>   → headline: "You've gone {RM(exp-budgetTot)} over budget."
>   → sub: "Cut {RM(Math.max(0,(exp-budgetTot)/Math.max(daysLeft,1)))} a day to recover."
>   → dot: var(--warn)
>
> Rule 2: projected > budgetTot && budgetTot > 0 && daysLeft > 3
>   → headline: "At this rate you'll exceed budget by {RM(projected-budgetTot)}."
>   → sub: "Ease up on {topCat} this week."
>   → dot: var(--warn)
>
> Rule 3: daily > dailySafe * 1.1 && dailySafe > 0
>   → headline: "You're spending {RM(daily)}/day. Safe limit is {RM(dailySafe)}."
>   → sub: "Watch {topCat} this week."
>   → dot: var(--warn)
>
> Rule 4: daily <= dailySafe && daysLeft > 5 && budgetTot > 0
>   → headline: "You're pacing {RM(dailySafe-daily)} under your daily safe-spend."
>   → sub: "Keep this rhythm and you'll finish +{RM((dailySafe-daily)*daysLeft)}."
>   → dot: var(--accent)
>
> Rule 5: daysLeft <= 3 && (budgetTot === 0 || exp <= budgetTot)
>   → headline: "{RM(Math.max(0,budgetTot-exp))} left. {daysLeft} day{daysLeft!==1?'s':''} to payday."
>   → sub: "You're going to land this one."
>   → dot: var(--accent)
>
> Rule 6: savGoal > 0 && savAmt < savGoal * 0.5 && daysLeft > 10
>   → headline: "Savings at {Math.round(savAmt/savGoal*100)}% of your goal."
>   → sub: "{RM(savGoal-savAmt)} still needed this period."
>   → dot: var(--ink-3)
>
> Rule 7 (fallback):
>   → headline: "Period day {elapsed} of {totalDays}."
>   → sub: "{RM(exp)} spent so far."
>   → dot: var(--ink-3)
> ```
>
> **Render**:
> - Card: `background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:24px`. In dark theme (`data-theme='dark'`), use `background:#F4F1EA;color:#14120F` to create the high-contrast cream break (detect via `document.body.getAttribute('data-theme')==='dark'`).
> - Header: dot (8px circle, `background:{ruleColour}`), 'COACH' label (9px, letter-spacing 0.18em, uppercase, ink-3)
> - Headline: serif 22px, line-height 1.3, ink (or #14120F in dark)
> - Sub: 13px, ink-3 (or rgba(20,18,15,0.55) in dark), margin-top 8px
> - Always visible — no dismiss logic
> - Card hides only if `isLoading` — show a `–` placeholder in that case
> - Call `renderCoach()` at end of `renderDashboard()`. Do not touch any other screen."

---

### R.5 — Quick Log Bar (session prompt)

> "In index.html, add a sticky quick-log bar at the bottom of `<main>` — outside and below all screen divs, always visible regardless of which screen is active.
>
> **HTML** (inside `<main>`, after the last `sc-*` div):
> ```html
> <div id='quick-log-bar' style='position:sticky;bottom:0;z-index:50;padding:12px 24px;background:var(--bg);border-top:1px solid var(--line)'>
>   <div style='display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-xl);padding:12px 20px;max-width:900px;margin:0 auto'>
>     <span style='font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:var(--ink-3);flex-shrink:0'>+ Quick log</span>
>     <span style='font-size:13px;color:var(--ink-3);flex-shrink:0;font-family:var(--mono)'>RM</span>
>     <input id='ql-amt' type='number' min='0' step='0.01' placeholder='0.00' style='width:90px;border:none;outline:none;background:transparent;font-family:var(--mono);font-size:16px;color:var(--ink)'>
>     <select id='ql-cat' style='border:none;outline:none;background:transparent;font-size:13px;color:var(--ink);flex:1;cursor:pointer'></select>
>     <input id='ql-memo' type='text' placeholder='Memo (optional)' style='flex:2;border:none;outline:none;background:transparent;font-size:13px;color:var(--ink-3)'>
>     <button id='ql-btn' onclick='quickLog()' style='background:var(--accent);color:var(--bg);border:none;border-radius:var(--r-sm);padding:8px 18px;font-size:13px;font-weight:600;cursor:pointer;flex-shrink:0;white-space:nowrap'>Log ↵</button>
>   </div>
> </div>
> ```
>
> **In js/app.js**, add:
> - A module-level `let lastUsedCat = null;` variable
> - A `refreshQuickLog()` function that populates `#ql-cat` with expense categories from `CATS.expense`, preserving the selected value if it matches a valid category. If `lastUsedCat` is set and valid, select it; otherwise select the first category. Call `refreshQuickLog()` inside `renderDashboard()` and whenever settings snapshot fires (add it to the existing `refreshEntry()` call in the settings snapshot handler).
> - A `quickLog()` function:
>   ```
>   const amt = parseFloat(document.getElementById('ql-amt').value);
>   if (!amt || amt <= 0) { document.getElementById('ql-amt').focus(); return; }
>   if (DEMO_MODE) { showDemoToast(); return; }
>   const cat = document.getElementById('ql-cat').value;
>   const memo = document.getElementById('ql-memo').value.trim();
>   lastUsedCat = cat;
>   const tx = {
>     type: 'expense',
>     amount: amt,
>     category: cat,
>     subcategory: '',
>     account: ACCTS[0] || '',
>     date: new Date().toISOString().slice(0, 10),
>     description: memo,
>     createdAt: firebase.firestore.FieldValue.serverTimestamp()
>   };
>   uref.collection('transactions').add(tx).then(() => {
>     document.getElementById('ql-amt').value = '';
>     document.getElementById('ql-memo').value = '';
>   }).catch(err => console.error(err));
>   ```
> - Add `keydown` listener on `#ql-amt`: if Enter key, call `quickLog()`
> - Do not modify `submitEntry()` or any other function. Do not touch any screen divs."

---

### R.6 — Navigation Restructure (session prompt)

> "Restructure the app navigation in index.html and js/app.js from 6 items to 4: **Home, Activity, Insights, Settings**.
>
> **Sidebar changes** (index.html `<aside>` block):
> - Replace the 6 nav items with exactly 4. Keep all existing icon/label/onclick patterns:
>   - `onclick="nav('dashboard')"` → `onclick="nav('home')"`, id `snav-home`, label 'Home', icon `home`
>   - `onclick="nav('transactions')"` → `onclick="nav('activity')"`, id `snav-activity`, label 'Activity', icon `show_chart`
>   - New: `onclick="nav('insights')"`, id `snav-insights`, label 'Insights', icon `bar_chart`
>   - `onclick="nav('settings')"` stays, id `snav-settings`, label 'Settings', icon `settings`
>   - Remove nav items for: analytics, budgets, forecast, entry
>   - Keep `+ Log transaction ⌘N` CTA button — change its onclick to `nav('settings')` (full form lives there now)
>
> **Screen ID renames** (index.html):
> - Rename `id="sc-dashboard"` → `id="sc-home"`
> - Rename `id="sc-transactions"` → `id="sc-activity"`
> - Keep `id="sc-analytics"`, `id="sc-budgets"`, `id="sc-forecast"`, `id="sc-entry"`, `id="sc-settings"` — their content is unchanged for now; they become sub-screens managed by the Insights and Settings tabs in R.7
>
> **New Insights screen** (index.html — add after sc-activity):
> ```html
> <div id='sc-insights' class='screen'>
>   <div style='display:flex;gap:0;border-bottom:1px solid var(--line);margin-bottom:24px'>
>     <button id='ins-tab-spend' onclick="switchInsightsTab('spend')" style='...tab style...'>Spend</button>
>     <button id='ins-tab-budgets' onclick="switchInsightsTab('budgets')" style='...'>Budgets</button>
>     <button id='ins-tab-forecast' onclick="switchInsightsTab('forecast')" style='...'>Forecast</button>
>   </div>
>   <div id='ins-spend' class='ins-pane'></div>
>   <div id='ins-budgets' class='ins-pane' style='display:none'></div>
>   <div id='ins-forecast' class='ins-pane' style='display:none'></div>
> </div>
> ```
> Tab style (active): `border-bottom:2px solid var(--accent);color:var(--ink);font-weight:600`. Tab style (inactive): `border-bottom:2px solid transparent;color:var(--ink-3)`. Common: `padding:10px 20px;font-size:14px;background:none;border-top:none;border-left:none;border-right:none;cursor:pointer`.
>
> **In js/app.js**:
> - Rename every internal call to `nav('dashboard')` → `nav('home')`, `nav('transactions')` → `nav('activity')`, `nav('analytics')` → `nav('insights')`, `nav('budgets')` → `nav('insights')`, `nav('forecast')` → `nav('insights')`
> - In `nav()` function: add cases `'home'` (calls `renderDashboard()`), `'activity'` (calls `renderTx()`), `'insights'` (calls `switchInsightsTab` with the last active tab, defaulting to 'spend')
> - Remove cases for `'dashboard'`, `'transactions'`, `'analytics'`, `'budgets'`, `'forecast'` (replaced above)
> - Add `let insTab = 'spend';` module-level variable
> - Add `switchInsightsTab(tab)` function: sets `insTab = tab`, hides/shows `.ins-pane` divs, updates tab button styles, then calls the appropriate render function: spend → move `sc-analytics` content into `#ins-spend` and call `applyAnalyticsPeriod()`; budgets → move `sc-budgets` content into `#ins-budgets` and call `renderBudgets()`; forecast → move `sc-forecast` content into `#ins-forecast` and call `renderForecast()`
>   - Actually: instead of moving DOM nodes (fragile), just re-render into the panes. Add `<div id='ins-spend'>` and render Analytics HTML directly into it inside `switchInsightsTab`. Same for budgets and forecast.
>   - Simpler approach: keep `sc-analytics`, `sc-budgets`, `sc-forecast` as hidden divs and use CSS `display:contents` or just show/hide them inside their respective `ins-pane` wrappers.
>   - **Simplest correct approach**: each `ins-pane` div IS the old screen div — just move `id='sc-analytics'` → `id='ins-spend'`, `id='sc-budgets'` → `id='ins-budgets'`, `id='sc-forecast'` → `id='ins-forecast'`. Update all render calls accordingly.
> - Add a Settings sub-section for Log Transaction (see below)
> - Update `initDB()` call to use `nav('home')` as the default on load
> - Update all `snav-*` alert badge logic (existing budget alert badge) to point to `snav-insights`
>
> **Settings screen — Log Transaction section**:
> - In `sc-settings`, add a new 'Log Transaction' section at the top (before the Theme section). This is the existing `sc-entry` form content — move the form HTML from `sc-entry` into a collapsible section inside settings. Keep all existing IDs (`e-amt`, `e-date`, `e-cat-grid`, `e-acct`, `e-memo`, `e-submit`, `e-cancel`, `tb-expense`, `tb-income`, `tb-savings`) unchanged so all existing `submitEntry`, `setType`, `refreshEntry` logic works without modification.
> - `sc-entry` div can be removed from index.html after the move.
>
> Do not change any render function logic — only routing, IDs, and nav structure."

---

### R.7 — Home Tab Final Assembly (session prompt)

> "Assemble the final Home tab layout in index.html `sc-home` div and js/app.js `renderDashboard()`.
>
> **Target layout** (top to bottom):
> 1. Greeting header (already exists — `d-greeting`, `d-period-sub`)
> 2. RunwayHero full-width card (already exists — `d-runway-hero`)
> 3. Two-column row: left 60% — Financial Health card (already exists — health score ring, sub-signals grid); right 40% — Coach card (`d-coach`, built in R.3)
> 4. Two-column row: left 60% — Spend Rhythm (`d-spend-rhythm`, built in R.1); right 40% — Where It Went (`d-where-it-went`, built in R.2)
> 5. Categories card full-width (`d-home-cats`, built in R.4)
> 6. Remove from Home: the old summary chips row (`d-inc`/`d-exp`/`d-sav`), the liquidity card, the budget runway bars card, the anomaly alert card — these are either replaced by the new components or moved to Insights/Activity
>
> **Grid CSS**: use `display:grid;grid-template-columns:3fr 2fr;gap:20px` for rows 3 and 4. On viewport < 1024px, collapse to single column (`@media (max-width:1023px){...grid-template-columns:1fr}`).
>
> **Anomaly alert**: move it to the Activity screen (sc-activity) as a dismissible banner above the transaction list, not the Home screen.
>
> **Render call order** in `renderDashboard()`: RunwayHero → HealthScore → Coach → SpendRhythm → WhereItWent → HomeCats → SidebarRunway. Remove calls to the old cards being retired.
>
> Do not touch the Insights screen, Activity screen, Settings screen, or any render function other than `renderDashboard`."

---

### R.8 — Financial Health Expanded Card (session prompt)

> "In js/app.js, expand `calculateHealthScore()` to return individual sub-scores and descriptor strings in addition to the existing composite score. Add four new fields to its return value:
>
> ```
> budgetAdherence: { score, bar, descriptor }
> savingsRate:     { score, bar, descriptor }
> runway:          { score, bar, descriptor }
> spendVariance:   { score, bar, descriptor }
> ```
>
> **Sub-score calculations** (all 0–100):
>
> - **Budget adherence**: `pctUsed = totalSpent / totalBudget`. `pctElapsed = daysElapsed / totalDays`. If `pctUsed <= pctElapsed`: score = `Math.round(100 - (pctUsed / Math.max(pctElapsed,0.01) - 1) * 100)` clamped 0–100. Descriptor: `'{pctUsed*100|0}% used at day {daysElapsed} of {totalDays}'`.
>
> - **Savings rate**: `rate = savAmt / Math.max(incAmt, 1)`. `target = 0.20`. score = `Math.round(Math.min(rate / target, 1) * 100)`. Descriptor: `'{(rate*100).toFixed(1)}% of income · target 20%'`.
>
> - **Runway**: days until end of period (`daysLeft`). score = `Math.round(Math.min(daysLeft / 7, 1) * 100)` (full score at 7+ days remaining, 0 at 0 days). Descriptor: `'{daysLeft} day{daysLeft!==1?"s":""} — {daysLeft>7?"safely ahead of":"close to"} payday'`.
>
> - **Spend variance**: compute coefficient of variation of daily spend over the current period (`stdDev / mean`). score = `Math.round(Math.max(0, 1 - cv) * 100)`. Descriptor: cv < 0.4 → `'Steady — consistent daily spend'`; cv < 0.8 → `'Moderate — some daily swings'`; otherwise → `'Variable — weekend or event spikes'`.
>
> **Composite score**: unchanged — weighted average of the four sub-scores with weights: budgetAdherence 0.30, savingsRate 0.25, runway 0.25, spendVariance 0.20.
>
> In index.html, replace the existing health score section inside `sc-home` (the SVG ring block and score label) with the new layout. Keep the outer card wrapper and its existing ID. New inner layout:
>
> **Header row** (unchanged): 'Financial health' serif title left, zone badge pill right (AT RISK / WATCH / HEALTHY / EXCELLENT based on score — AT RISK <40, WATCH <60, HEALTHY <80, EXCELLENT ≥80). Badge background: AT RISK `var(--warn)` + white text, WATCH `rgba(var(--warn),0.15)` + `var(--warn)` text, HEALTHY `var(--accent-soft)` + `var(--accent)` text, EXCELLENT `var(--accent)` + `var(--bg)` text.
>
> **Subtitle**: 'Composite of 4 weighted signals · updates daily' (12px, `var(--ink-3)`).
>
> **Score + zone bar row** (flex, align-items center, gap 24px):
> - Left: large serif number `id='hs-score'` (font-size 96px, line-height 1, `font-family:var(--serif)`), `/100` in `var(--ink-3)` at 18px beside it.
> - Right: segmented zone bar + zone labels.
>   - Bar: 28 equal-width segments in a flex row, gap 3px. Segments at positions 1–14 (AT RISK + WATCH zone, score < 60): `background:var(--line-2)` when inactive, `background:var(--warn)` when score falls in that zone and segment ≤ `Math.round(score/100*28)`. Segments 15–22 (HEALTHY): `background:var(--accent)` when lit. Segments 23–28 (EXCELLENT): `background:var(--accent)` at full opacity. A segment is lit if its index ≤ `Math.round(score/100*28)`. Unlit segments: `background:var(--line)`.
>   - Each segment: `height:20px; border-radius:3px; flex:1`.
>   - Zone labels below bar: 'AT RISK · WATCH · HEALTHY · EXCELLENT' in a flex row matching segment proportions, `font-size:9px; letter-spacing:0.12em; text-transform:uppercase; color:var(--ink-4)`.
>
> **Divider**: `border-top:1px solid var(--line); margin:20px 0`.
>
> **2×2 sub-signal grid** (`display:grid; grid-template-columns:1fr 1fr; border:1px solid var(--line); border-radius:var(--r-md); overflow:hidden`). Each cell has `padding:18px; border-right:1px solid var(--line); border-bottom:1px solid var(--line)` (remove right border on col 2, remove bottom border on row 2).
>
> Each sub-card cell:
> - Row 1: signal name left (`font-size:13px; font-weight:500; color:var(--ink)`), sub-score right (`font-size:22px; font-family:var(--mono); color:var(--accent)`).
> - Progress bar: full width, height 3px, `background:var(--line); border-radius:99px`. Fill: `background:var(--accent)` if sub-score ≥ 60, `background:var(--warn)` if < 60; width = `{sub-score}%`.
> - Descriptor: `font-size:11px; color:var(--ink-3); margin-top:6px`.
>
> In `renderDashboard()`, replace the existing `hs-score`, `hs-label`, `hs-ring`, `hs-detail` write calls with calls to the new sub-signal cell IDs: `hs-ba-score`, `hs-ba-bar`, `hs-ba-desc`, `hs-sr-score`, `hs-sr-bar`, `hs-sr-desc`, `hs-rw-score`, `hs-rw-bar`, `hs-rw-desc`, `hs-sv-score`, `hs-sv-bar`, `hs-sv-desc`, and the top-level `hs-score` (number) and `hs-badge` (zone pill).
>
> Do not touch the Coach card, Categories card, Spend Rhythm, Where It Went, or any other screen."

---

## Phase 3 — Personalisation

**Duration**: Week 10–12  
**Goal**: The app learns the user's patterns and reflects them back.

| # | Session Goal | Status | Files to bring | Prompt to use in Claude Code |
|---|---|---|---|---|
| 3.2 | Habit detection — unbudgeted recurring expenses | ✅ Done | `index.html` (paste `sc-forecast` div + `renderForecast` function) | "In index.html, add a 'Recurring but Unbudgeted' section to the `sc-forecast` screen. Scan the `txs` array across the last 3+ pay periods using `PAY_PERIOD.lastNPeriods` to find expense categories that appear in every period but have no budget set in `budgets{}`. List them with their average monthly amount and an 'Add to budget' button that switches to the budgets screen and scrolls to the budget input for that category. Show this section only if at least one such category exists." |
| 3.3 | Analytics heatmap — paginated monthly calendar | ✅ Done | `index.html` (ins-spend tab switcher + an-heatmap div) + `js/app.js` (renderHeatmap, switchAnTab, _hmMonthOffset) | Revised scope (April 2026): Single-month paginated view (not scrollable). ← / → arrows navigate across last 3 calendar months; starts on current month; arrows disabled at boundaries. Each day cell coloured by expense spend using 3-tier percentile thresholds (p25/p75) against accent token. Month total shown in header. Clicking a day reveals an inline transaction detail panel below the grid. Period + type selectors hidden while heatmap tab is active. Expenses only. No external library. |
| 3.4 | 12-month compliance history | ✅ Done | `index.html` (ins-forecast placeholder) + `js/app.js` (checkAndLockPeriod, renderBudgetTrackRecord, healthHistory global) | Completed April 2026. Budget Track Record section at bottom of Forecast tab. 12 pay period badges (green/red/grey). Periods locked to Firestore (`users/{uid}/health/history`) at period close with `totalBudget` snapshot. Estimated badges (not yet locked) show `~` prefix; stored badges where budget drifted >10% also show `~`. Completed periods sorted left, grey/no-data periods trail right. Streak counter in subtitle. |

---

## Phase I — Insights Intelligence Layer

**Duration**: Week 10–13 (runs in parallel with Phase 3)  
**Goal**: Transform the Insights tab from a passive report viewer into an active financial intelligence engine. The tab already exists and the three panes (Spend / Budgets / Forecast) are wired — this phase fills them with real AI-powered analysis, actionable CTAs, and proactive detection. This is what justifies the "Financial Intelligence" brand name.

**Gap assessment summary**: The Insights tab currently scores ~5.5/10 — strong chart scaffolding, but no real intelligence applied. Critical gaps: (1) Smart Insight and Strategic Opportunities are empty placeholders, (2) no insight links to an action, (3) Health Score is a black box, (4) no anomaly or pattern detection, (5) Forecast has no confidence signals. All eight sessions below address these directly.

**Files commonly needed**: `js/app.js` (paste relevant render function) + `index.html` (paste relevant `ins-spend`, `ins-budgets`, or `ins-forecast` div).

### Recommended build order

```
I.7 → I.3 → I.4 → I.2 → I.6 → I.5 → I.1 → I.8
```

- **I.7 first** — the hub card sits above all tabs; build the container before filling panes
- **I.3 before I.8** — I.8 appends to the narrative card built in I.3
- **I.4 before I.1/I.5** — anomaly detection (`unusualThresholds`) feeds the digest and opportunities prompts; build it first so the AI sessions receive richer data
- **I.2 after R.8** — Health Score explainer depends on the expanded `calculateHealthScore()` return shape already built in R.8 ✅
- **I.1 and I.5 last** — require the proxy backend to be deployed before the session starts (see I.1 note below)

| # | Session Goal | Status | Files to bring | Prompt to use in Claude Code |
|---|---|---|---|---|
| I.1 | AI Daily Digest — Claude-powered insight engine | ⬜ Not started | `index.html` (paste `ins-budgets` div) + `js/app.js` (paste `renderBudgets` function + `calculateHealthScore` function) | ⚠️ **Before building**: the API key must not be embedded in client-side JS. Deploy a small Firebase Cloud Function (or Cloudflare Worker) as a proxy — the function holds the key server-side and forwards the request. The client calls your proxy URL, not `api.anthropic.com` directly. Set up the proxy first, then use its URL in place of the Anthropic endpoint below. "In js/app.js, add an `async function renderDailyDigest()` that calls your proxy endpoint (replace `PROXY_URL` with the deployed function URL), sending a POST with the same body shape as the Anthropic API (`model`, `max_tokens`, `messages`). Model: `claude-sonnet-4-6`, max_tokens 500. Build a compact JSON summary of the user's current period data to pass as the user message: total income, total expenses, total savings, top 3 expense categories with amounts and budget limits, health score (composite + 4 sub-scores), days remaining in period, and budget breach status. System prompt: 'You are a concise financial coach for a Malaysian user. Analyse the data and return exactly 3 insights as a JSON array: [{id, type, title, body, action}]. type is one of: warning | opportunity | celebration | pattern. title is max 6 words. body is max 25 words. action is null or a short CTA string like "Adjust food budget" or "Start a savings goal". Respond with only the JSON array — no markdown, no preamble.' In index.html, add a `<div id='ins-digest'>` card at the top of the `ins-budgets` pane (above Smart Insight). Render the 3 insight cards: each has a left-border accent (warning = `var(--warn)`, opportunity = `var(--accent)`, celebration = `var(--accent)`, pattern = `var(--ink-3)`), title in serif 16px, body in 13px `var(--ink-2)`, and an action button if `action !== null` (inline text button `color:var(--accent); font-size:12px; font-weight:500; cursor:pointer`) — clicking it calls `nav()` to the appropriate screen. Show a skeleton loader (3 placeholder cards with animated shimmer using `@keyframes shimmer { from{opacity:0.4} to{opacity:0.8} }`) while the API call resolves. Cache the result in a module-level `_digestCache` object keyed by `currentPeriod().start` — only re-fetch when the period key changes. Do not replace or remove the existing Smart Insight section — place the digest above it. Do not touch any other screen." |
| I.2 | Health Score explainer — delta on Home + full breakdown in Insights hub | ✅ Done | `index.html` (Home Health card + `ins-hub` div) + `js/app.js` (`renderDashboard`, `renderInsightsHub`, `calculateHealthScore`) | Revised scope (April 2026): (1) Home Health card — add `<span id='hs-delta'>` below the `/100` showing `↑ +N pts` or `↓ −N pts` vs last period, plus a `See breakdown →` link calling `nav('insights')`. (2) Insights hub card (`ins-hub`) — merge the full explainer into the existing `renderInsightsHub()` card, below a second divider after the "Most important right now" row. Show: score delta, then 4 signal rows (name · sub-score · one-line tip). Tips: budget adherence → `Spend RM X/day or less to finish on track`; savings rate → `Transfer RM X more to hit 20%`; runway → `X days left — RM X/day remaining`; spend variance → `Keep daily spend within RM X to reduce variance`. (3) Add `scoreForPeriod(filteredTxs, period)` pure helper returning `{score, ba, baDesc, srScore, srDesc, rwScore, rwDesc, svScore, svDesc, spent, incAmt, savAmt, budgetTot, daysLeft, meanDailySpend}` — replaces the 20-line duplicate health block already inside `renderInsightsHub()`. Do not modify `calculateHealthScore()`. |
| I.3 | Period-over-period narrative card — "What changed" | ✅ Done | `index.html` (paste `ins-spend` div) + `js/app.js` (paste `applyAnalyticsPeriod` or `renderAnalytics` function) | "In js/app.js, add a `renderPeriodNarrative()` function. In index.html, add a `<div id='ins-narrative'>` card at the top of the `ins-spend` pane, before the existing period/type controls. Logic: compare current period vs previous period totals by category. Find: (1) biggest increase category (highest positive delta in RM), (2) biggest decrease category (highest negative delta), (3) any new category with no prior spend, (4) any new recurring transaction description seen in both periods (detect by matching memo/description strings across `txs`). Render as a single summary card (`background:var(--bg-2); border-radius:var(--r-md); padding:16px 20px`): serif header 'vs last period', then 2–4 bullet rows (plain `<p>` tags, not a `<ul>`). Each row uses an inline icon prefix: `↑` in `var(--warn)` for increases, `↓` in `var(--accent)` for decreases, `★` in `var(--ink-3)` for new categories, `↻` for recurring. Example rows: '↑ Food up RM 89 (RM 841 → RM 930)', '↓ Transport down RM 60', '★ New: Medical (RM 245 — first time this category appeared)'. Show at most 4 rows — pick the most significant changes. If no prior period data exists, hide the card (`display:none`). Call `renderPeriodNarrative()` at the start of `renderAnalytics()` before the chart render. Do not touch chart logic." |
| I.4 | Anomaly detection — Insights alert banner | ✅ Done | `index.html` (paste `ins-spend` div + `ins-budgets` div) + `js/app.js` (paste `unusualThresholds` function + `renderAnalytics` + `renderBudgets`) | "In js/app.js, extend `unusualThresholds()` to return a full array of anomalies (currently it returns one). Each anomaly: `{type, category, amount, ratio, message, action}`. Detect three types: (1) `spike` — an expense category whose current-period total is > 2× its average across the last 3 periods; message: '{Category} is {ratio}x your usual — RM {amount} vs avg RM {avg}'. (2) `new_recurring` — a transaction description/memo seen 3+ times in the last 60 days but with no budget set; message: 'New recurring charge detected: {desc} (~RM {amount}/mo) — not in your budget'. (3) `budget_pace` — a category where current spend / budget > current days elapsed / total period days by more than 0.25; message: '{Category} is pacing {N}% over budget with {daysLeft} days left'. In index.html, add a `<div id='ins-anomaly-banner'>` at the very top of the `ins-spend` pane. Render each anomaly as a compact row (`display:flex; align-items:center; gap:12px; padding:10px 14px; background:rgba(184,87,43,0.08); border-left:3px solid var(--warn); border-radius:var(--r-sm); margin-bottom:8px`): icon `⚠` in `var(--warn)`, message text 13px `var(--ink-2)`, and an action text button on the right (e.g. 'Add budget', 'Review'). Hide the banner wrapper if anomalies array is empty. Call `renderAnomalyBanner()` from both `renderAnalytics()` and `renderBudgets()`. Remove the anomaly card from the Activity screen if it was placed there in R.7 — this is its new home." |
| I.5 | Strategic Opportunities — AI forecast recommendations | ⬜ Not started | `index.html` (paste `ins-forecast` div) + `js/app.js` (paste `renderForecast` function) | "In js/app.js, add an `async function renderStrategicOpportunities()`. In index.html, the `ins-forecast` pane already has a `<div>` placeholder with a `auto_awesome` icon and 'Strategic Opportunities' heading — wire it to this function. Build a data snapshot: avg income per period, avg expenses per period, avg surplus per period, top 3 expense categories with their averages, current savings rate %, and goals array (name + target + current). Call the Anthropic API with system prompt: 'You are a Malaysian personal finance advisor. Given this data, return exactly 2 strategic opportunities as JSON: [{title, saving_per_month_rm, steps, difficulty}]. difficulty is "easy" | "moderate" | "hard". steps is an array of 2–3 short strings. title is max 8 words. Respond with only the JSON array.' Render each opportunity as a card: title in serif 16px, `Saves up to RM {saving_per_month_rm}/mo` badge in `var(--accent-soft)` text `var(--accent)`, difficulty pill (easy = green, moderate = amber, hard = coral), and numbered steps in 13px `var(--ink-2)`. Show skeleton loader while resolving. Cache by `JSON.stringify({avgInc, avgExp, avgSur})` key — only re-fetch when the user's averages change materially (> 5% difference). Call `renderStrategicOpportunities()` inside `renderForecast()`. Do not touch the cash flow chart or category forecast chart." |
| I.6 | Forecast confidence bands + data quality indicator | ✅ Done | `index.html` (paste `ins-forecast` div) + `js/app.js` (paste `renderForecast` function) | **Revised scope (April 2026):** (1) Data quality indicator — `<div id='ins-forecast-quality'>` row below the 4 KPI chips. Pill coloured amber (N < 3), grey (3–5), green (6+) using `var(--warn)` / `var(--ink-3)` / `var(--accent)`. Compute N as count of last 12 periods that contain at least one transaction. (2) Forecast range annotation — instead of Chart.js line overlays (visually noisy on a 3-series bar chart), compute ±1 stdDev for expenses across all available periods and render a compact text line on the chart card header: "Forecast range: RM X – RM Y / period" in `font-size:12px; color:var(--ink-3)`. Show only when N ≥ 2. Both are display-only — no new Firestore reads. Do not touch the category forecast chart. |
| I.7 | Insights tab — top-level summary hub card | ✅ Done | `index.html` (paste the outer `sc-insights` wrapper div) + `js/app.js` (paste `nav` function + `switchInsightsTab` function) | "In index.html, add a `<div id='ins-hub'>` card immediately inside `sc-insights`, above the tab switcher buttons (Spend / Budgets / Forecast). This hub card is always visible regardless of the active tab. Content: (1) a serif heading 'Your finances, {period label}' (e.g. 'Your finances, Apr 2026') at 22px; (2) three inline metric chips in a flex row: Net surplus this period (`inc − exp − sav`, green if positive / warn if negative), Savings rate (savAmt / incAmt as %), Budget status ('On track' in accent or 'Over budget' in warn); (3) a 'Most important right now' line — a single sentence that picks the most urgent signal: if any budget is breached → 'Food budget is 120% used with 8 days left.'; else if savings rate < 10% → 'Savings rate is below target — you have RM X surplus available.'; else if health score < 60 → 'Health score is {N} — see Budgets tab for guidance.'; else → 'Finances look stable. {daysLeft} days to payday.' Derive all values from existing globals (`txs`, `budgets`, `calculateHealthScore()`). In js/app.js, call `renderInsightsHub()` once inside `nav('insights')`, not on every tab switch. Do not touch the tab switcher logic or any pane content." |
| I.8 | Malaysia-specific context layer — local financial events + upcoming user annotations | ✅ Done | `js/app.js` (`renderPeriodNarrative`) | **Revised scope (April 2026):** (1) `gregorianToHijri()` helper using standard Julian Day algorithm — no hardcoded dates, works for all future years. (2) `getMalaysiaContext(date)` — detects Ramadan (Hijri month 9) and Hari Raya (Hijri month 10, days 1–7) via the algorithm; falls back to a static month lookup for CNY, school holidays, Merdeka, Deepavali, sales seasons. (3) Upcoming annotations — filter `annotations[]` for events in the next 30 days; display up to 3 as `📌 Label (date)` lines. Both context and upcoming annotations render as a footer block at the bottom of the `ins-narrative` card, separated by a hairline. Hidden when neither applies. Display-only — no new Firestore reads or writes. |

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
| 4.10 | Sidebar redesign — new mark, accent nav, runway card | ✅ Done | — | Completed in commit `fcbfd86` alongside 4.8–4.12. Sidebar runway mini-card (`sb-runway-days`, `sb-runway-bar-fill`, `sb-runway-dates`), crescent-mark brand block, and `nav-active` token update all shipped. |
| 4.11 | RunwayHero — animated arc ring on dashboard | ✅ Done | — | Completed in commit `fcbfd86`. Animated SVG arc ring, RAF-driven count animation, daily safe-spend sentence, and 3-stat cells all shipped. `_rhRaf` cancellation wired into `renderDashboard()`. |
| 4.12 | Surface token pass + transaction row restyle | ✅ Done | — | Completed in commit `fcbfd86`. `.lum-card` class applied to all dashboard surfaces; transaction rows use arrow-badge (↑/↓/→) with `var(--mono)` amounts. |

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
- [ ] The AI Daily Digest returns at least 2 relevant, non-generic insights for a user with 3+ weeks of data
- [ ] Every insight in the Insights tab has at least one CTA — no dead-end data cards
- [ ] The Health Score explainer is visible and the "how to improve" tips are accurate
- [ ] The app has been used by at least 3 people who are not you, and their feedback is addressed

**Commercial** *(owner: you — these cannot be built by Claude Code)*
- [ ] Free tier limit is enforced (session 5.2 covers the code gate; you decide the limit)
- [ ] Landing page is live on a real domain (session 5.1 builds the page; domain purchase and DNS is manual)
- [ ] You have a payment method ready to hook in (Stripe or Billplz for Malaysia; account registration is manual)
- [ ] Privacy policy exists — even a simple one — because you are storing financial data (draft in claude.ai chat first, then add a `privacy.html`)
- [ ] You know your target price point and can explain why someone should pay it (decide before building 5.1 so the landing page reflects it)

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
| 3–5 | Early Warnings | ✅ Done — Anomaly flags, breach alerts, alert badge |
| 6–9 | Understanding | ✅ Done (2.1–2.3, 2.5–2.7) — Health score, waterfall, annotations, RunwayHero, design tokens |
| Now | Home Redesign (R) | ✅ R.1–R.8 Done — all Home tab sessions complete |
| +4wk | Personalisation (3) + Insights Intelligence (I) | Playbook, habit detection, Analytics heatmap, compliance history, end-of-period review (2.4) — **plus** AI digest, Health Score explainer, period narrative, anomaly banner, strategic opportunities, forecast confidence, hub card, Malaysia context |
| +8wk | Polish (4) | Onboarding, deferred Chart.js, PWA, offline handling, remaining sidebar/surface polish |
| +12wk | Commercialisation (5) | Landing page, free tier limits, admin view, PDF export |
| +16wk | Launch | Go/no-go checklist complete — start telling people |
