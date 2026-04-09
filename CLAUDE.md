# Tracking Money - Financial Intelligence

A personal finance web app for tracking income, expenses, and savings with budgeting, forecasting, and charts.

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript (no build step)
- **Styling**: Tailwind CSS (CDN), custom CSS files per page
- **Backend**: Firebase Firestore (database) + Firebase Auth (authentication)
- **Charts**: Chart.js
- **Integration**: Google Sheets (via Apps Script in `sheets-script.gs`)

## Project Structure

No build system. HTML files are at root; JS, CSS, and config are in subfolders.

```
/
├── index.html          # Main app (dashboard + transaction entry, inline JS)
├── budget.html         # Budget management page
├── charts.html         # Data visualisation page
├── forecast.html       # Spending forecast page
├── settings.html       # User settings page
├── sheets-script.gs    # Google Apps Script for Sheets integration
├── js/
│   ├── app.js          # Shared transaction logic, category/account helpers
│   ├── payperiod.js    # Pay period calculation utilities (shared across pages)
│   ├── budget.js
│   ├── charts.js
│   ├── forecast.js
│   └── settings.js
├── css/
│   ├── style.css       # Global styles
│   ├── style-patch.css
│   ├── budget.css / budget-patch.css
│   ├── charts.css
│   ├── forecast.css
│   └── settings.css
└── config/
    └── firebase-config.js  # Firebase API keys — do not commit or expose
```

## Key Conventions

- Firebase is initialised in `firebase-config.js` and used via `db` (Firestore) and `auth` globals
- Categories and accounts are stored in Firestore `settings/preferences` and loaded on page load via `loadUserSettings()`
- `CATEGORIES` and `ACCOUNTS` are module-level globals in `app.js`
- No module bundler — scripts are loaded with `<script>` tags in order; load order matters
- Categories/accounts are user-configurable and stored in Firestore
- Pay period runs from salary day of previous month to day before salary day this month

## Running the App

Open `index.html` directly in a browser or serve with any static file server:

```bash
npx serve .
# or
python3 -m http.server 8080
```

## Sensitive Files

- `config/firebase-config.js` — contains live Firebase API keys. Listed in `.gitignore`. Never edit or expose this file.
- `sheets-script.gs` — may contain account-specific logic; treat as private.

## Do Not

- Add a build system or npm unless explicitly asked
- Commit `config/firebase-config.js`
