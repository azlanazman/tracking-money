# Tracking Money — Your Personal Finance Companion

A personal finance web app that does more than track where your money went. It watches your spending like a dashboard, warns you before things go wrong, and helps you understand your money habits clearly — so you can make better decisions, not just better regrets.

---

## What This App Is About

Most money apps show you the past. This one is built to help you **see the present and prepare for the future**.

Think of it like a car dashboard — you don't just check your fuel after you've run out. You watch the gauge, you get a warning light, you know roughly how far you can go. This app does the same for your money: it watches your spending patterns, spots when something looks unusual, tells you when you're heading toward trouble, and helps you build habits that stick.

The goal is simple: **less financial stress, more financial confidence** — for anyone, not just people who are good with numbers.

---

## Who This Is For

Anyone who wants a clearer picture of their money — whether you're living paycheck to paycheck, saving for something important, managing a household, or just tired of wondering where it all went at the end of the month.

---

## What It Does Today

- **Tracker** (`index.html`) — Log your income, expenses, and savings. See your totals for the current pay period at a glance. Filter and search your transaction history.
- **Budget Monitor** (`budget.html`) — Set a monthly limit for each spending category. Watch a progress bar fill up as you spend. Get an early warning before you go over.
- **Charts** (`charts.html`) — See your spending visually by category and by month. Quickly spot which areas are growing over time.
- **Forecast** (`forecast.html`) — Based on how you've spent the last 3 months, the app projects what next month might look like. Set savings goals and see whether your current habits can support them.
- **Settings** (`settings.html`) — Customise your accounts, categories, sub-categories, and salary date so everything fits how you actually manage money.

---

## Where It's Going — Planned Features

### Coming Next — Early Warnings
- **"How long will my budget last?"** — Based on how fast you're spending right now, the app tells you roughly which day your budget runs out — so you can slow down before it's too late, not after
- **Spending alerts** — When a transaction looks unusually large for its category (say, a Grab bill 3x your normal spend), it gets flagged automatically. You decide if it was expected or a surprise worth looking into
- **Budget breach notifications** — When you go over budget, it doesn't just turn red and move on. It stays visible as an open issue until you acknowledge it — building awareness of patterns over time

### Soon After — Understanding Your Money Better
- **Financial Health Score** — A single number (0–100) that summarises how well your finances are doing right now: Are you spending within your means? Are your savings on track? Is too much of your income locked into fixed costs? One score, honest answer
- **Your money flow, visualised** — For any month, see exactly how your salary moved: what went to fixed commitments, what was discretionary, what made it to savings. Like a receipt for the whole month
- **Life event markers** — Tag moments on your timeline: "Eid," "car broke down," "got a raise." Then when you look back at a spending spike, you know why it happened

### Later — Making It Personal
- **Your own spending playbook** — Write notes to your future self: "When my Food spending goes high, check if I've been ordering Grab too much." The app surfaces these reminders when the pattern repeats
- **Habit detection** — The app notices regular expenses you haven't categorised as fixed costs yet, and suggests you account for them in your budget going forward
- **Spending heatmap** — A calendar view showing which days of the month you tend to spend the most — useful for spotting patterns you didn't know you had

---

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript (no build step — intentional; keeps it simple and deployable anywhere)
- **Database**: Firebase Firestore (real-time sync across devices)
- **Auth**: Firebase Authentication
- **Charts**: Chart.js
- **Export**: Google Sheets via Apps Script (`sheets-script.gs`)

---

## Project Structure

```
/
├── index.html              # Tracker — dashboard + transaction entry
├── budget.html             # Budget Monitor
├── charts.html             # Charts & trends
├── forecast.html           # Forecast & savings goals
├── settings.html           # Pay period, accounts, categories
├── sheets-script.gs        # Google Apps Script for Sheets export
├── js/
│   ├── app.js              # Transaction logic, category/account helpers, globals
│   ├── payperiod.js        # Pay period utilities — shared across all pages
│   ├── budget.js
│   ├── charts.js
│   ├── forecast.js
│   └── settings.js
├── css/
│   ├── style.css           # Global styles
│   ├── style-patch.css
│   ├── budget.css / budget-patch.css
│   ├── charts.css
│   ├── forecast.css
│   └── settings.css
└── config/
    └── firebase-config.js  # Firebase API keys — never commit, never expose
```

---

## Key Conventions

- Firebase initialised in `firebase-config.js`; `db` and `auth` are globals used across all pages
- Categories and accounts stored in Firestore `settings/preferences`, loaded on page load via `loadUserSettings()`
- `CATEGORIES` and `ACCOUNTS` are module-level globals in `app.js`
- No module bundler — `<script>` load order matters; `payperiod.js` must load before page scripts
- Pay period: salary day of previous month → day before salary day this month (configurable per month)
- All monetary values stored as raw floats in Firestore; formatted as `RM X.XX` only at render time

---

## Firestore Data Model

```
transactions/{id}       — date, amount, account, type, category, subcategory, description, createdAt
settings/preferences    — accounts[], categories{ expense{}, income{}, savings{} }
settings/payperiod      — { defaultDay, overrides }
budgets/settings        — { [category]: { amount, threshold } }
goals/list              — { goals: [{ id, name, emoji, monthly }] }

[planned]
alerts/{id}             — type, category, period, status (open/acknowledged/resolved), notes, createdAt
annotations/{id}        — date, label, icon, description
health/history          — { periods: [{ period, score, breakdown }] }
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
- `sheets-script.gs` — treat as private; contains account-specific deployment URL logic

---

## Constraints — Do Not

- Add a build system, npm, or bundler unless explicitly asked
- Commit `config/firebase-config.js`
- Use `localStorage` as primary storage — Firebase is the source of truth; localStorage is fallback only
- Break the no-framework rule — vanilla JS is intentional for zero-dependency deployability
