// ── Expense categories (must match app.js) ──
const EXPENSE_CATEGORIES = [
  'Loan', 'Bills', 'Takaful', 'Family', 'CC', 'Subs',
  'SPay', 'Car', 'Community', 'Food', 'Toll',
  'Parking', 'Fuel', 'Medical', 'Misc'
];

// Category colours (matching chart palette)
const CAT_COLORS = {
  'Loan': '#1a7a5e', 'Bills': '#2ecc99', 'Takaful': '#3498db',
  'Family': '#9b59b6', 'CC': '#e67e22', 'Subs': '#e74c3c',
  'SPay': '#1abc9c', 'Car': '#f39c12', 'Community': '#2980b9',
  'Food': '#8e44ad', 'Toll': '#27ae60', 'Parking': '#d35400',
  'Fuel': '#c0392b', 'Medical': '#16a085', 'Misc': '#7f8c8d'
};

// ── State ──
let db = null;
let budgets = {};   // { category: { amount, threshold } }
let transactions = [];

// ── Current month info ──
const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_MONTH = String(NOW.getMonth() + 1).padStart(2, '0');
const MONTH_PREFIX = `${CURRENT_YEAR}-${CURRENT_MONTH}`;
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

document.getElementById('currentMonth').textContent =
  MONTH_NAMES[NOW.getMonth()] + ' ' + CURRENT_YEAR;

// ── Init Firebase ──
function init() {
  try {
    try { firebase.initializeApp(FIREBASE_CONFIG); } catch (e) { }
    db = firebase.firestore();

    // Load budgets from Firestore
    db.collection('budgets').doc('settings').get().then(doc => {
      if (doc.exists) budgets = doc.data();
      buildBudgetForm();
    });

    // Live-listen to this month's transactions
    db.collection('transactions')
      .where('type', '==', 'expense')
      .orderBy('date', 'desc')
      .onSnapshot(snapshot => {
        transactions = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(t => t.date && t.date.startsWith(MONTH_PREFIX));
        renderProgress();
        renderSummaryCards();
      });

  } catch (err) {
    // Fallback to localStorage
    budgets = JSON.parse(localStorage.getItem('budgets')) || {};
    transactions = (JSON.parse(localStorage.getItem('financeTransactions')) || [])
      .filter(t => t.type === 'expense' && t.date && t.date.startsWith(MONTH_PREFIX));
    buildBudgetForm();
    renderProgress();
    renderSummaryCards();
  }
}

// ── Build the budget settings form ──
function buildBudgetForm() {
  const container = document.getElementById('budgetForm');

  container.innerHTML = `
    <div class="budget-form-header">
      <span>Category</span>
      <span>Monthly budget (RM)</span>
      <span>Alert me at</span>
      <span>Current spent</span>
    </div>
  ` + EXPENSE_CATEGORIES.map(cat => {
    const b = budgets[cat] || { amount: 0, threshold: 80 };
    const spent = getSpent(cat);
    const color = CAT_COLORS[cat] || '#888';

    return `
      <div class="budget-row">
        <div class="budget-cat-label">
          <span class="budget-cat-dot" style="background:${color}"></span>
          ${cat}
        </div>
        <input
          type="number"
          id="budget_${cat}"
          value="${b.amount || ''}"
          placeholder="0.00"
          min="0" step="0.01"
        />
        <select class="threshold-select" id="threshold_${cat}">
          <option value="70"  ${b.threshold == 70 ? 'selected' : ''}>At 70%</option>
          <option value="80"  ${b.threshold == 80 ? 'selected' : ''}>At 80%</option>
          <option value="90"  ${b.threshold == 90 ? 'selected' : ''}>At 90%</option>
          <option value="100" ${b.threshold == 100 ? 'selected' : ''}>At 100%</option>
        </select>
        <span style="font-size:13px;color:#555;font-weight:500">
          RM ${spent.toFixed(2)}
        </span>
      </div>
    `;
  }).join('');
}

// ── Save budgets to Firebase ──
async function saveBudgets() {
  const newBudgets = {};

  EXPENSE_CATEGORIES.forEach(cat => {
    const amountEl = document.getElementById('budget_' + cat);
    const thresholdEl = document.getElementById('threshold_' + cat);
    const amount = parseFloat(amountEl.value) || 0;
    const threshold = parseInt(thresholdEl.value) || 80;
    newBudgets[cat] = { amount, threshold };
  });

  budgets = newBudgets;

  const statusEl = document.getElementById('saveStatus');

  if (db) {
    try {
      await db.collection('budgets').doc('settings').set(newBudgets);
      statusEl.textContent = 'Saved!';
      setTimeout(() => statusEl.textContent = '', 2000);
    } catch (err) {
      statusEl.textContent = 'Save failed: ' + err.message;
    }
  } else {
    localStorage.setItem('budgets', JSON.stringify(newBudgets));
    statusEl.textContent = 'Saved locally!';
    setTimeout(() => statusEl.textContent = '', 2000);
  }

  renderProgress();
  renderSummaryCards();
}

// ── Get amount spent for a category this month ──
function getSpent(cat) {
  return transactions
    .filter(t => t.category === cat)
    .reduce((s, t) => s + (t.amount || 0), 0);
}

// ── Render progress bars ──
function renderProgress() {
  const container = document.getElementById('budgetProgress');

  // Split categories into budgeted and unbudgeted
  const budgeted = EXPENSE_CATEGORIES.filter(c => budgets[c] && budgets[c].amount > 0);
  const unbudgeted = EXPENSE_CATEGORIES.filter(c => (!budgets[c] || !budgets[c].amount));

  // Filter unbudgeted to only those with actual spending
  const unbudgetedWithSpend = unbudgeted.filter(c => getSpent(c) > 0);

  if (budgeted.length === 0 && unbudgetedWithSpend.length === 0) {
    container.innerHTML = '<p class="empty-msg">Set your category budgets above and click Save.</p>';
    return;
  }

  let html = '<div class="progress-list">';

  budgeted.forEach(cat => {
    const b = budgets[cat];
    const spent = getSpent(cat);
    const budget = b.amount;
    const threshold = b.threshold || 80;
    const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
    const rawPct = budget > 0 ? (spent / budget) * 100 : 0;
    const remaining = Math.max(budget - spent, 0);

    let state, fillClass, pctClass, alertText, alertClass;

    if (rawPct >= 100) {
      state = 'over'; fillClass = 'fill-over'; pctClass = 'pct-over';
      alertText = 'OVER BUDGET'; alertClass = 'alert-over';
    } else if (rawPct >= threshold) {
      state = 'warning'; fillClass = 'fill-warning'; pctClass = 'pct-warning';
      alertText = `${threshold}% alert`; alertClass = 'alert-warning';
    } else {
      state = 'ok'; fillClass = 'fill-ok'; pctClass = 'pct-ok';
      alertText = 'On track'; alertClass = 'alert-ok';
    }

    const color = CAT_COLORS[cat] || '#888';

    html += `
      <div class="progress-card ${state}">
        <div class="progress-top">
          <span class="progress-cat">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};margin-right:6px;vertical-align:middle"></span>
            ${cat}
          </span>
          <span class="progress-amounts">
            Spent <strong>RM ${spent.toFixed(2)}</strong>
            of <strong>RM ${budget.toFixed(2)}</strong>
            &nbsp;·&nbsp; RM ${remaining.toFixed(2)} left
          </span>
        </div>
        <div class="progress-track">
          <div class="progress-fill ${fillClass}" style="width:${pct}%"></div>
        </div>
        <div class="progress-bottom">
          <span class="progress-pct ${pctClass}">${rawPct.toFixed(1)}% used</span>
          <span class="progress-alert ${alertClass}">${alertText}</span>
        </div>
      </div>
    `;
  });

  // Show unbudgeted spending below
  if (unbudgetedWithSpend.length > 0) {
    html += `
      <div class="unset-section">
        <p class="unset-title">Spending without a budget set</p>
        ${unbudgetedWithSpend.map(cat => `
          <div class="unset-row">
            <span>
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${CAT_COLORS[cat] || '#ccc'};margin-right:6px;"></span>
              ${cat}
            </span>
            <span class="unset-amount">RM ${getSpent(cat).toFixed(2)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  html += '</div>';
  container.innerHTML = html;
}

// ── Summary cards ──
function renderSummaryCards() {
  const totalSpent = transactions.reduce((s, t) => s + (t.amount || 0), 0);

  const totalBudgeted = EXPENSE_CATEGORIES.reduce((s, cat) => {
    return s + ((budgets[cat] && budgets[cat].amount) || 0);
  }, 0);

  const remaining = Math.max(totalBudgeted - totalSpent, 0);

  document.getElementById('totalSpent').textContent = 'RM ' + totalSpent.toFixed(2);
  document.getElementById('totalBudgeted').textContent = 'RM ' + totalBudgeted.toFixed(2);

  const remEl = document.getElementById('totalRemaining');
  remEl.textContent = 'RM ' + remaining.toFixed(2);
  remEl.style.color = totalSpent > totalBudgeted ? '#e74c3c' : '#27ae60';
}

// ── Run ──
init();
