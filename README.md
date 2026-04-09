<div align="center">

# 💰 Tracking Money

### Your money, on a dashboard — not a spreadsheet

A personal finance web app that watches your spending in real time, warns you before you overspend, and helps you understand your money habits — not just record them.

**No app store. No install. Open in a browser and go.**

</div>

---

## Why this is different

Most money apps show you what already happened. This one tells you what's about to happen.

Think of it like a car dashboard — you don't check your fuel *after* you've run out. You watch the gauge, get a warning light, and know roughly how far you can go. This app does the same for your money: it watches your spending patterns, flags when something looks unusual, and tells you when you're on track — or heading for trouble.

**Less financial stress. More financial confidence. For anyone.**

---

## What it does

| Page | What you get |
|---|---|
| **Tracker** | Log income, expenses, and savings. See totals for your current pay period at a glance. |
| **Budget Monitor** | Set monthly limits per category. Progress bars fill as you spend. Warnings fire before you go over. |
| **Charts** | Visualise spending by category and by month. Spot which areas are quietly growing. |
| **Forecast** | See what next month might look like, based on your last 3 months. Check if your savings goals are realistic. |
| **Settings** | Set your salary date, add your accounts, customise categories — everything fits how you actually manage money. |

---

## Coming soon

**Early warnings**
- 📉 Budget countdown — projects the exact day your budget runs out at your current spend rate
- 🚩 Unusual spend flag — auto-highlights transactions that are abnormally large for their category
- 🔔 Budget breach alerts — overspent categories stay flagged until you acknowledge them

**Understanding your money**
- 🏥 Financial Health Score — one number (0–100) that summarises how your finances are doing right now
- 🌊 Money flow waterfall — see your salary move: income → fixed costs → spending → savings
- 📌 Life event markers — tag moments like "Eid", "car repair", or "got a raise" so chart spikes make sense later

**Making it personal**
- 📋 Spending playbook — write notes to your future self; the app surfaces them when patterns repeat
- 🔍 Habit detection — spots recurring expenses you haven't budgeted for yet
- 🗓️ Daily heatmap — a calendar that colours each day by how much you spent

---

## Tech stack

Built intentionally simple — no framework, no build step, no dependencies to manage.

- **Frontend** — Vanilla HTML, CSS, JavaScript
- **Database** — Firebase Firestore (real-time, syncs across devices)
- **Charts** — Chart.js
- **Export** — Google Sheets via Apps Script

---

## Getting started

### 1. Clone the repo

```bash
git clone https://github.com/your-username/tracking-money.git
cd tracking-money
```

### 2. Set up Firebase

You need a free Firebase project to store your data.

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a new project
2. Add a **Web app** inside the project
3. Copy the config object Firebase gives you
4. Create the file `config/firebase-config.js` and paste your config:

```js
const FIREBASE_CONFIG = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

> ⚠️ `config/firebase-config.js` is listed in `.gitignore`. Never commit it. Never share it publicly.

### 3. Enable Firestore

In the Firebase console, go to **Firestore Database → Create database → Start in test mode**.

### 4. Run the app

```bash
# Option A — using Node
npx serve .

# Option B — using Python
python3 -m http.server 8080
```

Open `http://localhost:8080` and you're in.

---

## Setting up Google Sheets export *(optional)*

If you want to export transactions to a spreadsheet:

1. Open Google Sheets and create a new spreadsheet
2. Click **Extensions → Apps Script**
3. Delete everything and paste the contents of `sheets-script.gs`
4. Click **Deploy → New deployment → Web app**
5. Set *Execute as*: **Me** · *Who has access*: **Anyone**
6. Copy the Web App URL
7. Paste it into the Export section inside the app

---

## Project structure

```
/
├── index.html              # Tracker — dashboard + transaction entry
├── budget.html             # Budget Monitor
├── charts.html             # Charts & trends
├── forecast.html           # Forecast & savings goals
├── settings.html           # Settings — accounts, categories, pay period
├── sheets-script.gs        # Google Apps Script for Sheets export
├── js/
│   ├── app.js              # Core transaction logic and globals
│   ├── payperiod.js        # Pay period calculation — shared across all pages
│   ├── budget.js
│   ├── charts.js
│   ├── forecast.js
│   └── settings.js
├── css/
│   ├── style.css           # Global styles
│   ├── budget.css
│   ├── charts.css
│   ├── forecast.css
│   └── settings.css
└── config/
    └── firebase-config.js  # Your Firebase keys — DO NOT COMMIT
```

---

## How pay periods work

This app tracks money by **pay period**, not calendar month. You set your salary date (e.g. the 25th), and the app treats the 25th of each month as the start of a new period.

So if your salary lands on the 25th:
- The March period runs from **25 Feb → 24 Mar**
- The April period runs from **25 Mar → 24 Apr**

You can override this for any specific month from the Settings page — useful for months when your salary arrives a few days early or late.

---

## Contributing

This project is in active development. If you find a bug or have an idea, open an issue and describe it clearly.

For code contributions:
1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature-name`
3. Make your changes — keep it vanilla JS, no frameworks
4. Test in a browser before submitting
5. Open a pull request with a clear description of what changed and why

Please do not add a build system, npm, or bundler. The no-framework approach is a deliberate choice.

---

## Sensitive files

| File | Status |
|---|---|
| `config/firebase-config.js` | In `.gitignore` — never commit |
| `sheets-script.gs` | Contains your deployment URL — treat as private |

---

## Roadmap

See [`ROADMAP.md`](./ROADMAP.md) for the full feature plan and commercialisation timeline.

---

## License

MIT — do what you want with it, just don't hold the author liable.

---

<div align="center">

Built with clarity over complexity · Powered by Firebase · Made in Malaysia 🇲🇾

</div>
