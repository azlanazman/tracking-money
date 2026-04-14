# Lumina — Personal Finance Intelligence

A personal finance web app built to help you see the present and prepare for the future. Like a car dashboard — it watches your spending, warns you before things go wrong, and helps you understand your money habits clearly.

---

## What This App Is About

Most money apps show you the past. This one is built to help you **see the present and prepare for the future**. It watches spending patterns, spots unusual transactions, tells you when you're heading toward trouble, and helps build habits that stick.

Goal: **less financial stress, more financial confidence** — for anyone, not just people who are good with numbers.

---

## Who This Is For

Anyone who wants a clearer picture of their money — whether you're living paycheck to paycheck, saving for something important, managing a household, or just tired of wondering where it all went.

---

## What It Does Today

Everything lives in a single-page app (`index.html`) with these screens, navigated via sidebar:

- **Dashboard** (`sc-dashboard`) — Summary cards (income, expenses, balance, YTD), mini 6-month bar chart, recent ledger, top spending allocations for current pay period
- **Analytics** (`sc-analytics`) — Stacked bar + line charts by category, period selector (this period / last period / last 30 / last 90 / all time), category breakdown table
- **Transactions** (`sc-transactions`) — Paginated transaction list with filters by type, category, and month; edit and delete actions
- **Log Transaction** (`sc-entry`) — Add/edit transaction form; type toggle (expense / income / savings), category and subcategory selectors, date, amount, account, memo
- **Budget Monitor** (`sc-budgets`) — Gauge showing total budget consumption, per-category progress bars with status badges (On Track / Alert / Over Budget), burn rate widget, budget allocation form, unbudgeted spending section
- **Forecast** (`sc-forecast`) — 3-month rolling averages for income/expense/savings, savings goals, projected surplus/shortfall
- **Settings** (`sc-settings`) — Accounts list, category/subcategory manager (expense/income/savings tabs), pay period configuration with per-month override grid

Auth is a full-screen wall before the app shell — email/password and Google Sign-In, with forgot password flow.

---

## Where It's Going — Planned Features

### Coming Next — Early Warnings
- **Spend anomaly flags** — transactions that are 2x the 3-month rolling average for their category get an amber "Unusual" badge
- **Budget breach alert panel** — when a category goes over budget, create an open alert in Firestore; show dismissible alert cards; user acknowledges to resolve
- **Alert badge on nav** — red badge on the Budgets nav item showing count of open alerts

### Soon After — Understanding Your Money Better
- **Financial Health Score** — 0–100 score from budget compliance, savings on track, fixed cost ratio, burn rate safety
- **Money flow waterfall chart** — income → committed costs → discretionary → savings → remaining
- **Life event annotations** — tag dates with labels; show as vertical lines on charts

### Later — Making It Personal
- **Personal spending playbook** — per-category notes surfaced when that category goes over budget
- **Habit detection** — flag recurring unbudgeted expense categories
- **Spending heatmap** — calendar grid of daily spend intensity
- **12-month compliance history** — green/red/grey badges for past 12 periods

---

## Tech Stack

- **Frontend**: Vanilla HTML + JavaScript; Tailwind CSS (CDN, no build step); all in one file — intentional for zero-dependency deployability
- **Fonts**: Manrope (headlines), Inter (body) — Google Fonts
- **Icons**: Material Symbols Outlined — Google Fonts
- **Charts**: Chart.js 4.4 (CDN)
- **Database**: Firebase Firestore (real-time, user-scoped)
- **Auth**: Firebase Authentication (email/password + Google)
- **Export**: Google Sheets via Apps Script (`sheets-script.gs`)

---

## Project Structure

```
/
├── index.html              # App shell — HTML structure and inline CSS (~774 lines)
├── sheets-script.gs        # Google Apps Script for Sheets export
├── js/
│   ├── payperiod.js        # Pay period utilities — loaded in <head>, no DOM deps
│   ├── app.js              # State, navigation, Firebase data, all screen render logic
│   └── auth.js             # Firebase init, auth state observer, auth UI handlers
└── config/
    └── firebase-config.js  # Firebase API keys — never commit, never expose
```

**Script load order** (matters — no bundler):
```
<head>:  payperiod.js
<body>:  app.js  →  auth.js
```

`auth.js` calls `initDB()` defined in `app.js` — this works because both files are fully loaded before `DOMContentLoaded` fires.

---

## Key Conventions

- **SPA navigation**: `nav(scr)` in `app.js` swaps `.screen.active` class; each screen has id `sc-{name}`
- **State globals**: `db`, `uref`, `txs[]`, `budgets{}`, `goals[]`, `CATS{}`, `ACCTS[]`, `auth`, `currentUser`, `isLoading` — declared in `app.js`, set/used across `app.js` and `auth.js`
- **Loading gate**: `isLoading` starts `true`, is reset to `true` at the top of `initDB()` (handles re-login), and is set to `false` only when the Firestore transactions snapshot first fires (or on any error path). All data-dependent render functions check `isLoading` and show a spinner early-return if true — do not call these functions before `initDB` completes
- **Firebase paths**: all data is user-scoped under `users/{uid}/` — see Firestore model below
- `payperiod.js` must load before `app.js`; it exposes `window.PAY_PERIOD`
- `app.js` must load before `auth.js`; `auth.js` calls `initDB()` and sets globals declared in `app.js`
- Pay period: salary day of previous month → day before salary day this month (configurable per month)
- All monetary values stored as raw floats; formatted as `RM X.XX` only at render time via `RM()` helper
- Tailwind config is inline in a `<script id="tw-cfg">` block — includes custom colour tokens and font families
- No module bundler — `<script>` load order matters

---

## Firestore Data Model

```
users/{uid}/transactions/{id}       — date, amount, account, type, category, subcategory, description, createdAt
users/{uid}/settings/preferences    — accounts[], categories{ expense{}, income{}, savings{} }
users/{uid}/settings/payperiod      — { defaultDay, overrides }
users/{uid}/budgets/settings        — { [category]: { amount, threshold } }
users/{uid}/goals/list              — { goals: [{ id, name, emoji, monthly }] }

[planned]
users/{uid}/alerts/{id}             — type, category, period, status (open/acknowledged), createdAt
users/{uid}/annotations/{id}        — date, label, icon, description
users/{uid}/health/history          — { periods: [{ period, score, breakdown }] }
users/{uid}/reviews/{YYYY-MM}       — what happened, reason, what to do differently
```

---

## Running the App

```bash
npx serve .
# or
python3 -m http.server 8080
```

Open `index.html` in a browser. Firebase connects automatically if `config/firebase-config.js` is present.

---

## Sensitive Files

- `config/firebase-config.js` — live Firebase API keys; in `.gitignore`; never edit, never commit, never expose
- `sheets-script.gs` — treat as private

---

## Constraints — Do Not

- Add a build system, npm, or bundler unless explicitly asked
- Commit `config/firebase-config.js`
- Use `localStorage` as primary storage — Firebase is the source of truth; localStorage is fallback only
- Break the no-framework rule — vanilla JS + Tailwind CDN is intentional
- Create separate HTML or CSS files — the SPA pattern is established; HTML and styles stay in `index.html`
- Create additional JS files without a clear responsibility boundary — the current split (`payperiod.js`, `app.js`, `auth.js`) is intentional
- Read Firestore outside of `users/{uid}/` paths — all data must be user-scoped

---

## Development Workflow

I follow a 7-step process. Steps 1–3 I prompt manually. Steps 4–6 you run automatically after every build slice. Step 7 requires my explicit approval.

### Step 1 · Define
I will describe the objective in plain English. Before writing any code, confirm back to me in 2–3 sentences what you understand the goal to be. If anything is ambiguous, ask one clarifying question before proceeding.

### Step 2 · Plan
Break the work into small, atomic tasks — each task should change one thing and be testable on its own. Show me the task list before starting. Wait for my go-ahead.

### Step 3 · Build
Build one task at a time. Before touching any file, say which file you're editing and why in plain English. No jargon. Prefer the simpler of two approaches.

### Step 4 · Test (automatic after every build slice)
- Open the browser and confirm the feature works as described — list what you checked
- Verify no existing screens are broken (Dashboard, Transactions, Budget Monitor at minimum)
- If something is broken, stop and report it before touching anything else
- Do not proceed to step 5 until the slice works correctly

### Step 5 · Review (automatic after step 4 passes)
Check the code you just wrote for:
- Functions longer than 30 lines — flag them
- Logic that duplicates something already in `app.js` — flag it
- Variable names that would confuse someone in 6 months — flag them
- Anything that violates the constraints listed above — flag it

Keep the review to bullet points, 5 items max. Minor issues can be noted but don't need to block step 6.

### Step 6 · Simplify (automatic after step 5)
Suggest one or two concrete simplifications to the code just written. Prefer deleting lines over adding them. Prefer obvious names over clever ones. Apply the simplification only if it does not change behaviour.

### Step 7 · Ship (requires my approval)
- Never push to GitHub without asking me first
- Before pushing, summarise what changed in plain English — one short paragraph, no jargon
- Use commit messages in this format: `add [feature]` or `fix [problem]`
- Only commit files that changed. Never touch `config/firebase-config.js`
