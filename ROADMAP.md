# Tracking Money — Commercialisation Roadmap

**Version**: 1.0 — April 2026  
**Horizon**: 6 months to launch-ready  
**Token allocation**: 60% of plan usage for this project

---

## How to Read This Plan

Each phase has a goal, a list of features, and a set of **Claude Code sessions**. Every session is a self-contained unit of work — one session = one Claude Code conversation, started fresh. This keeps token consumption predictable and prevents context bloat from killing a session mid-build.

The token constraint is real right now. Anthropic has acknowledged that people are hitting usage limits in Claude Code way faster than expected, and weekly quotas now apply to heavy users on Pro and Max plans. The session design here accounts for that — each session is scoped tightly so you are never caught mid-feature when the limit hits.

---

## Token Budget Reality Check

Pro plan users typically have access to approximately 44,000 tokens per 5-hour period, which translates to roughly 10–40 prompts depending on the complexity of the codebase being analysed.

Your allocation at 60% of that:
- **Per session**: ~26,000 tokens available for this project
- **Safe prompt budget per session**: 6–15 prompts depending on file size
- **Weekly**: Assume 3–4 usable sessions per week (accounting for weekly limits and reset cycles)

This means **one feature per session**, not one phase per session. The plan is structured accordingly.

### How to protect your budget

1. **Start each session by pasting only the relevant files** — not the whole codebase. For most features, that is 2–3 files maximum.
2. **Use `/compact` in Claude Code** before switching tasks within a session. It summarises the context and frees tokens.
3. **Keep CLAUDE.md tight** — it loads into every session. Every word costs. The current version is well-sized; do not grow it without trimming elsewhere.
4. **One session = one feature** — finishing half a feature and continuing in a new session wastes tokens re-establishing context. Scope each session to complete one thing.
5. **Do planning (like this document) in claude.ai chat, not Claude Code** — Claude Code sessions are expensive. Use chat for thinking, Claude Code for building.
6. **Run Claude Code in off-peak hours** — Anthropic has offered off-peak usage doubling promotions, and peak-hour quotas are reduced, so early morning or late evening sessions go further.

---

## Phase 0 — Foundation Hardening
**Duration**: Week 1–2  
**Goal**: Make the existing codebase clean, consistent, and ready to build on top of. No new features. Fix the things that will cause problems later.  
**Why first**: Every feature you add later will read these files. Cleaning them now saves tokens in every subsequent session.

| # | Session Goal | Files to bring | Prompt to use in Claude Code |
|---|---|---|---|
| 0.1 | Normalise all JS files to consistent error handling and Firebase null-checks | `app.js`, `payperiod.js` | "Review app.js and payperiod.js for inconsistent Firebase error handling, missing null checks on Firestore results, and any places where the app could silently fail. Fix all of them. Do not add features." |
| 0.2 | Audit and fix mobile layout issues across all pages | `style.css`, `index.html`, `budget.html` | "Audit index.html and budget.html for mobile layout breakage below 400px screen width. Fix any overflow, truncation, or tap-target issues in style.css. Do not change the visual design." |
| 0.3 | Standardise CSS — merge patch files, remove dead rules | All `.css` files | "Merge style-patch.css into style.css and budget-patch.css into budget.css, removing any duplicate or overridden rules. The visual output must not change." |
| 0.4 | Add loading and empty states everywhere they are missing | `app.js`, `budget.js`, `forecast.js` | "Add consistent loading spinners and empty-state messages to every section that fetches from Firebase. Use the existing `.empty-msg` class pattern already in style.css." |

---

## Phase 1 — Early Warning System
**Duration**: Week 3–5  
**Goal**: The app starts telling users what is about to happen, not just what already happened. This is the core differentiator that makes it feel smarter than a ledger.

| # | Session Goal | Files to bring | Prompt to use in Claude Code |
|---|---|---|---|
| 1.1 | Burn rate widget on dashboard | `app.js`, `index.html`, `style.css`, `payperiod.js` | "Add a burn rate widget to index.html between the summary cards and the Add Transaction form. It should read the current pay period from PAY_PERIOD.currentPeriod(), calculate daily spend rate from transactions this period, load the total budget from Firestore budgets/settings, then show: days left in period, daily spend rate, projected day the budget runs out (or confirmation it won't), and two progress bars — budget consumed % and period elapsed %. Update every time the transactions snapshot fires. Match the existing card design in style.css." |
| 1.2 | Unusual spend flag on transactions | `app.js`, `index.html`, `style.css` | "Add automatic anomaly flagging to the transaction list in app.js. For each transaction, check if its amount is more than 2x the 3-month rolling average for that category. If so, render a small amber warning badge next to the transaction amount with the label 'Unusual'. Store no new data — calculate on the fly from the existing transactions array. Match the existing .tx-badge style pattern." |
| 1.3 | Budget breach alert panel | `budget.js`, `budget.html`, `budget.css` | "Add a budget breach alert panel to budget.html above the progress section. When any category exceeds its budget, create an alert entry stored in Firestore under alerts/{id} with fields: category, period (YYYY-MM), status ('open'), amount_over, createdAt. Show open alerts as dismissible cards. When the user clicks Acknowledge, update the status to 'acknowledged' in Firestore. Show a count of open alerts in the page header. Use the existing budget card colour patterns." |
| 1.4 | Alert badge on nav tab | `index.html`, `budget.html`, `charts.html`, `forecast.html`, `settings.html`, `style.css` | "Add a small red badge to the Budget Monitor nav tab showing the count of open alerts from Firestore alerts collection where status is 'open'. Load this count on every page using a shared snippet. The badge should disappear when count is zero. Keep the implementation in a small inline script in each HTML file — do not create a new JS file." |

---

## Phase 2 — Understanding Layer
**Duration**: Week 6–9  
**Goal**: Give users tools to understand *why* their money moved the way it did, not just *that* it did.

| # | Session Goal | Files to bring | Prompt to use in Claude Code |
|---|---|---|---|
| 2.1 | Financial Health Score on dashboard | `app.js`, `index.html`, `style.css`, `payperiod.js`, `budget.js` | "Add a Financial Health Score (0–100) card to index.html. Calculate it from four equally weighted signals: (1) budget compliance — did spending stay under budget this period; (2) savings on track — are savings transactions happening this period; (3) fixed cost ratio — what % of average monthly income goes to fixed categories (Loan, Bills, Takaful, CC, Subs); (4) burn rate safety — will the budget last the full period at current rate. Show the score as a large number, a colour-coded label (Healthy/Fair/At risk), and a brief one-line explanation of the biggest factor pulling the score down. Recalculate whenever the transactions snapshot fires." |
| 2.2 | Money flow waterfall chart | `charts.js`, `charts.html`, `charts.css` | "Add a new Waterfall tab to charts.html. For a selected pay period, show a waterfall chart using Chart.js that starts with total income, then subtracts: committed costs (Loan, Bills, Takaful, CC, Subs combined), then discretionary spending (all other expense categories combined), then savings, leaving the remaining balance as the final bar. Use the existing chart colour palette and period selector pattern from the existing charts." |
| 2.3 | Life event annotations | `settings.html`, `settings.js`, `settings.css`, `charts.html`, `charts.js` | "Add a Life Events section to settings.html where users can add dated annotations with a label and an icon choice (from a fixed list: celebration, problem, work, health, travel, other). Store in Firestore under annotations/{id} with fields: date, label, icon, createdAt. On charts.html, render these annotations as vertical dashed lines on both the bar and line charts, with a small label at the top. Use Chart.js annotation plugin loaded from CDN." |
| 2.4 | End-of-month review prompt | `budget.html`, `budget.js`, `budget.css` | "At the end of each pay period, if total spending exceeded total budget, show a gentle prompt at the top of budget.html: 'Last period went over budget. Take 2 minutes to note what happened.' The prompt opens a small inline form with three fields: what happened (text), main reason (dropdown: unexpected expense / underestimated category / income was lower / planned overspend / other), and what I'll do differently (text). Save to Firestore under reviews/{YYYY-MM} and show past reviews in a collapsible history list below." |

---

## Phase 3 — Personalisation
**Duration**: Week 10–12  
**Goal**: The app learns the user's patterns and reflects them back. This is the layer that creates retention — the app becomes genuinely personal and harder to replace.

| # | Session Goal | Files to bring | Prompt to use in Claude Code |
|---|---|---|---|
| 3.1 | Personal spending playbook | `settings.html`, `settings.js`, `settings.css`, `budget.html`, `budget.js` | "Add a Playbook section to settings.html. For each expense category, users can write a personal note — their own reminder of what to check when that category goes high (e.g. 'Check Grab orders, review meal plan'). Store in Firestore under settings/playbook as a map of category to note text. On budget.html, when a category shows a warning or over-budget status, display its playbook note as a soft tip below the progress bar." |
| 3.2 | Habit detection — unbudgeted recurring expenses | `forecast.js`, `forecast.html`, `forecast.css` | "Add a Recurring but Unbudgeted section to forecast.html. Scan 3+ months of transactions to find expense categories that appear in every pay period but have no budget set in Firestore budgets/settings. List them with their average monthly amount and a button 'Add to budget' that navigates to budget.html with that category pre-highlighted. Show this section only if at least one such category exists." |
| 3.3 | Daily spending heatmap | `charts.html`, `charts.js`, `charts.css` | "Add a Heatmap tab to charts.html showing a calendar grid of the last 3 months. Each day cell is coloured by total spend that day — white for zero, light green for low, through to dark red for high spend days. Clicking a day cell shows a small tooltip listing the transactions for that day. Build this in plain HTML/CSS/JS without an external library — use a CSS grid of divs." |
| 3.4 | 12-month compliance history | `forecast.html`, `forecast.js`, `forecast.css` | "Add a Budget Track Record section to forecast.html showing the last 12 pay periods as a grid of month badges. Each badge is green if total spending stayed within total budget that period, red if it went over, and grey if no budget was set. Calculate from Firestore transaction and budget data. Store the compliance result for each period in Firestore under health/history so the record persists even after transactions are deleted." |

---

## Phase 4 — Pre-Launch Polish
**Duration**: Week 13–16  
**Goal**: Make it trustworthy and shareable. A product ready to show to strangers, not just yourself.

| # | Session Goal | Files to bring | Prompt to use in Claude Code |
|---|---|---|---|
| 4.1 | Firebase Authentication — login wall | `index.html`, `app.js`, `firebase-config.js`, `style.css` | "Add Firebase Authentication (email/password) to the app. Show a simple login/register screen before any content loads. Store the UID on each Firestore document so data is user-scoped. Redirect to login if not authenticated. Keep the login screen minimal — match the existing dark green header style." |
| 4.2 | Data isolation — scope all Firestore reads to current user | All `.js` files | "Update all Firestore collection paths to be user-scoped: transactions/{uid}/records, settings/{uid}/preferences, budgets/{uid}/settings, goals/{uid}/list, alerts/{uid}/items, annotations/{uid}/items, reviews/{uid}/items, health/{uid}/history. Migrate the existing data structure. Test that two different browser sessions see completely separate data." |
| 4.3 | Onboarding flow for new users | `index.html`, `app.js`, `style.css` | "Add a first-run onboarding flow for new users who have zero transactions and no settings saved. Show a 3-step modal: (1) Set your salary day; (2) Add your first account; (3) Add your first expense category. After completing the 3 steps, dismiss the modal and never show it again (store completion flag in Firestore). Keep it short — the goal is to get them to their first transaction, not to explain everything." |
| 4.4 | Performance — lazy load charts and forecast | `charts.html`, `forecast.html`, `charts.js`, `forecast.js` | "Defer loading Chart.js and the chart/forecast JS files until the user navigates to those pages. On index.html and budget.html, remove the Chart.js script tag. Add an IntersectionObserver or navigation-based loader so the heavy scripts only load when needed. This reduces initial page load weight." |
| 4.5 | PWA — installable on mobile | `index.html`, new `manifest.json`, new `sw.js` | "Make the app installable as a Progressive Web App. Create a manifest.json with app name, icons (use simple coloured square SVGs), theme colour #0f3d2e, and display: standalone. Create a basic service worker sw.js that caches the core HTML, CSS, and JS files for offline access (excluding Firebase calls). Register the service worker in index.html." |
| 4.6 | Error boundaries and offline handling | `app.js`, `budget.js`, `forecast.js`, `charts.js` | "Add graceful offline handling across all pages. When Firebase fails to connect, show a persistent banner 'You are offline — showing last loaded data' and fall back to the most recent data cached in localStorage. When connectivity resumes, refresh automatically. Add try/catch error boundaries around every Firestore call that currently has none." |

---

## Phase 5 — Commercialisation Readiness
**Duration**: Week 17–20  
**Goal**: The infrastructure to charge for the product and support multiple users properly.

| # | Session Goal | Files to bring | Prompt to use in Claude Code |
|---|---|---|---|
| 5.1 | Landing page — standalone marketing page | New `landing.html`, new `landing.css` | "Create a standalone landing page (landing.html) for the app. It should not require Firebase. Include: headline and one-sentence value proposition, three feature highlights (budget countdown, health score, spend anomaly detection), a call-to-action button to sign up, and a footer. Use the existing dark green colour scheme. No frameworks, no CDN dependencies except Google Fonts." |
| 5.2 | Usage limits for free tier | `app.js`, `firebase-config.js` | "Add a free tier limit: free users can store a maximum of 50 transactions. When the limit is reached, show a modal explaining the limit and a call-to-action to upgrade. Read the user's plan tier from Firestore under users/{uid}/plan (default: 'free'). If plan is 'pro', skip the limit check. Do not build payment processing yet — just the limit enforcement and upgrade prompt." |
| 5.3 | Basic admin view — see all registered users | New `admin.html`, new `admin.js` | "Create a simple admin page (admin.html) protected by a hardcoded admin UID check. It should list all documents in the users collection showing: uid, email, plan tier, transaction count, and last active date. This is for your own visibility as the operator — not a public feature. Keep it simple: a plain HTML table, no styling beyond the base style.css." |
| 5.4 | Export to PDF — monthly statement | `index.html`, `app.js` | "Add a Download Statement button to the export section of index.html. When clicked, generate a clean PDF of the selected period's transactions using the browser's print API (window.print with a print-specific CSS). The print layout should show: period label, summary totals, and a clean transaction table. Use a @media print stylesheet — no external PDF library." |

---

## Go/No-Go Checklist Before Launch

Work through this before telling anyone the product exists.

**Technical**
- [ ] Authentication is live and every Firestore path is user-scoped
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

These are the habits that keep you inside your 60% token budget across 5 months of building.

1. **Plan in chat, build in Claude Code.** Use this conversation for thinking, scoping, and reviewing. Only switch to Claude Code when you have a clear, bounded task.

2. **One session, one feature.** Never start a second feature in the same Claude Code session. Close the session when the feature is done and tested.

3. **Paste only what Claude Code needs.** Before starting a session, identify the 2–3 files relevant to that feature. Paste those only. Do not paste the whole codebase.

4. **Test before closing the session.** Open the browser, confirm the feature works, then close Claude Code. If you find a bug the next day, open a new session — do not reopen the old one.

5. **Update CLAUDE.md after each phase.** Add any new files, new Firestore collections, or new conventions so the next session starts with accurate context.

6. **Use this chat to write your next prompt.** Before each Claude Code session, describe what you want to build here first. That process of writing it out often reveals scope issues before they cost tokens.

---

## Timeline Summary

| Week | Phase | Milestone |
|---|---|---|
| 1–2 | Foundation | Codebase clean, consistent, mobile-safe |
| 3–5 | Early Warnings | Burn rate, anomaly flags, breach alerts live |
| 6–9 | Understanding | Health score, waterfall, annotations, reviews live |
| 10–12 | Personalisation | Playbook, habit detection, heatmap, compliance history |
| 13–16 | Polish | Auth, PWA, onboarding, offline handling |
| 17–20 | Commercialisation | Landing page, free tier limits, admin view, PDF export |
| 21+ | Launch | Go/no-go checklist complete — start telling people |
