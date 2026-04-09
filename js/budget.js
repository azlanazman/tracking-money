// ── State ──
let db           = null;
let budgets      = {};   // { category: { amount, threshold } }
let transactions = [];
let EXPENSE_CATEGORIES = []; // loaded dynamically from settings

// Category colours
const CAT_COLORS_DEFAULT = {
  'Loan':'#1a7a5e','Bills':'#2ecc99','Takaful':'#3498db',
  'Family':'#9b59b6','CC':'#e67e22','Subs':'#e74c3c',
  'SPay':'#1abc9c','Car':'#f39c12','Community':'#2980b9',
  'Food':'#8e44ad','Toll':'#27ae60','Parking':'#d35400',
  'Fuel':'#c0392b','Medical':'#16a085','Misc':'#7f8c8d'
};
let CAT_COLORS = { ...CAT_COLORS_DEFAULT };

// ── Pay period state ──
let currentPeriod = null;

// ── Init Firebase ──
function setStatus(state, msg) {
  const el = document.getElementById('dbStatus');
  if (el) { el.textContent = msg; el.className = 'db-status ' + state; }
}

function updatePeriodLabel() {
  const el = document.getElementById('currentMonth');
  if (!el) return;
  if (currentPeriod) {
    el.textContent = currentPeriod.label;
    el.title = `Pay period: ${currentPeriod.start} → ${currentPeriod.end}`;
  } else {
    const NOW = new Date();
    const MONTH_NAMES = ['January','February','March','April','May','June',
                         'July','August','September','October','November','December'];
    el.textContent = MONTH_NAMES[NOW.getMonth()] + ' ' + NOW.getFullYear();
  }
}

function init() {
  try {
    try { firebase.initializeApp(FIREBASE_CONFIG); } catch(e) {}
    db = firebase.firestore();
    setStatus('connecting', 'Loading...');

    // Init pay period — it will call onChange when ready
    PAY_PERIOD.init(db);
    PAY_PERIOD.onChange(() => {
      currentPeriod = PAY_PERIOD.currentPeriod();
      updatePeriodLabel();
      // Re-filter transactions to the correct period
      refreshTransactions();
    });

    // Load settings (categories) from Firestore
    db.collection('settings').doc('preferences').get().then(doc => {
      if (doc.exists && doc.data().categories && doc.data().categories.expense) {
        const expCats = doc.data().categories.expense;
        EXPENSE_CATEGORIES = Object.keys(expCats);
        // Build colour map from stored categories, fill missing with defaults
        EXPENSE_CATEGORIES.forEach((cat, i) => {
          if (!CAT_COLORS[cat]) {
            const palette = Object.values(CAT_COLORS_DEFAULT);
            CAT_COLORS[cat] = palette[i % palette.length];
          }
        });
      } else {
        // Fallback to defaults
        EXPENSE_CATEGORIES = Object.keys(CAT_COLORS_DEFAULT);
        CAT_COLORS = { ...CAT_COLORS_DEFAULT };
      }
      buildBudgetForm();
    });

    // Load budgets from Firestore
    db.collection('budgets').doc('settings').get().then(doc => {
      if (doc.exists) budgets = doc.data();
      buildBudgetForm();
    });

    // Live-listen to ALL transactions — we filter to pay period in JS
    db.collection('transactions')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
        const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        filterToCurrentPeriod(all);
        setStatus('connected', 'Firebase connected · ' + transactions.length + ' expense records this period');
        renderProgress();
        renderSummaryCards();
      }, err => {
        setStatus('error', 'Load error: ' + err.message);
      });

  } catch(err) {
    setStatus('error', 'Firebase error');
    budgets      = JSON.parse(localStorage.getItem('budgets')) || {};
    const all    = JSON.parse(localStorage.getItem('financeTransactions')) || [];
    filterToCurrentPeriod(all);
    buildBudgetForm();
    renderProgress();
    renderSummaryCards();
  }
}

// ── Filter transactions to current pay period ──
function filterToCurrentPeriod(all) {
  if (!currentPeriod) {
    // Pay period not loaded yet — fall back to calendar month
    const NOW = new Date();
    const prefix = `${NOW.getFullYear()}-${String(NOW.getMonth() + 1).padStart(2, '0')}`;
    transactions = all.filter(t => t.type === 'expense' && t.date && t.date.startsWith(prefix));
  } else {
    transactions = all.filter(t =>
      t.type === 'expense' &&
      t.date &&
      t.date >= currentPeriod.start &&
      t.date <= currentPeriod.end
    );
  }
}

// ── Called when pay period settings change ──
function refreshTransactions() {
  if (!db) return;
  db.collection('transactions')
    .orderBy('createdAt', 'desc')
    .get()
    .then(snapshot => {
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      filterToCurrentPeriod(all);
      renderProgress();
      renderSummaryCards();
    });
}

// ── Build the budget settings form ──
function buildBudgetForm() {
  if (EXPENSE_CATEGORIES.length === 0) return; // not loaded yet
  const container = document.getElementById('budgetForm');

  container.innerHTML = `
    <div class="budget-form-header">
      <span>Category</span>
      <span>Monthly budget (RM)</span>
      <span>Alert me at</span>
      <span>Current spent</span>
    </div>
  ` + EXPENSE_CATEGORIES.map(cat => {
    const b     = budgets[cat] || { amount: 0, threshold: 80 };
    const spent = getSpent(cat);
    const color = CAT_COLORS[cat] || '#888';

    return `
      <div class="budget-row">
        <div class="budget-cat-label">
          <span class="budget-cat-dot" style="background:${color}"></span>
          ${cat}
        </div>
        <input type="number" id="budget_${cat}" value="${b.amount || ''}"
          placeholder="0.00" min="0" step="0.01"/>
        <select class="threshold-select" id="threshold_${cat}">
          <option value="70"  ${b.threshold == 70  ? 'selected' : ''}>At 70%</option>
          <option value="80"  ${b.threshold == 80  ? 'selected' : ''}>At 80%</option>
          <option value="90"  ${b.threshold == 90  ? 'selected' : ''}>At 90%</option>
          <option value="100" ${b.threshold == 100 ? 'selected' : ''}>At 100%</option>
        </select>
        <span style="font-size:13px;color:#555;font-weight:500">RM ${spent.toFixed(2)}</span>
      </div>
    `;
  }).join('');
}

// ── Save budgets to Firebase ──
async function saveBudgets() {
  const newBudgets = {};

  EXPENSE_CATEGORIES.forEach(cat => {
    const amountEl    = document.getElementById('budget_' + cat);
    const thresholdEl = document.getElementById('threshold_' + cat);
    if (!amountEl) return;
    const amount    = parseFloat(amountEl.value) || 0;
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
    } catch(err) {
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

// ── Get amount spent for a category in current period ──
function getSpent(cat) {
  return transactions
    .filter(t => t.category === cat)
    .reduce((s, t) => s + (t.amount || 0), 0);
}

// ── Render progress bars ──
function renderProgress() {
  if (EXPENSE_CATEGORIES.length === 0) return;
  const container = document.getElementById('budgetProgress');

  const budgeted             = EXPENSE_CATEGORIES.filter(c => budgets[c] && budgets[c].amount > 0);
  const unbudgeted           = EXPENSE_CATEGORIES.filter(c => !budgets[c] || !budgets[c].amount);
  const unbudgetedWithSpend  = unbudgeted.filter(c => getSpent(c) > 0);

  if (budgeted.length === 0 && unbudgetedWithSpend.length === 0) {
    container.innerHTML = '<p class="empty-msg">Set your category budgets above and click Save.</p>';
    return;
  }

  const periodNote = currentPeriod
    ? `<p class="period-note">Showing spend for pay period: <strong>${currentPeriod.label}</strong></p>`
    : '';

  let html = periodNote + '<div class="progress-list">';

  budgeted.forEach(cat => {
    const b         = budgets[cat];
    const spent     = getSpent(cat);
    const budget    = b.amount;
    const threshold = b.threshold || 80;
    const pct       = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
    const rawPct    = budget > 0 ? (spent / budget) * 100 : 0;
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

  if (unbudgetedWithSpend.length > 0) {
    html += `
      <div class="unset-section">
        <p class="unset-title">Spending without a budget set</p>
        ${unbudgetedWithSpend.map(cat => `
          <div class="unset-row">
            <span>
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${CAT_COLORS[cat]||'#ccc'};margin-right:6px;"></span>
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

  document.getElementById('totalSpent').textContent    = 'RM ' + totalSpent.toFixed(2);
  document.getElementById('totalBudgeted').textContent = 'RM ' + totalBudgeted.toFixed(2);

  const remEl       = document.getElementById('totalRemaining');
  remEl.textContent = 'RM ' + remaining.toFixed(2);
  remEl.style.color = totalSpent > totalBudgeted ? '#e74c3c' : '#27ae60';

  renderBurnRate();
}

// ── Burn rate: how many days of budget remain at current spend rate ──
function renderBurnRate() {
  const el = document.getElementById('burnRate');
  if (!el) return;

  // Use the live currentPeriod if available; fall back to PAY_PERIOD directly
  const period = currentPeriod || (typeof PAY_PERIOD !== 'undefined' ? PAY_PERIOD.currentPeriod() : null);
  if (!period) {
    el.className = 'burn-card burn-neutral';
    el.innerHTML = '<span class="burn-label">Burn Rate</span> Loading period data…';
    return;
  }

  const totalBudgeted = EXPENSE_CATEGORIES.reduce((s, cat) =>
    s + ((budgets[cat] && budgets[cat].amount) || 0), 0);
  const totalSpent = transactions.reduce((s, t) => s + (t.amount || 0), 0);

  if (totalBudgeted === 0) {
    el.className = 'burn-card burn-neutral';
    el.innerHTML = '<span class="burn-label">Burn Rate</span> Set budgets above to see how long they\'ll last.';
    return;
  }

  const MS_PER_DAY    = 86400000;
  const today         = new Date(); today.setHours(0, 0, 0, 0);
  const start         = new Date(period.start + 'T00:00:00');
  const end           = new Date(period.end   + 'T00:00:00');
  const daysElapsed   = Math.max(Math.round((today - start) / MS_PER_DAY) + 1, 1);
  const daysRemaining = Math.max(Math.round((end - today) / MS_PER_DAY), 0);

  if (totalSpent >= totalBudgeted) {
    const overage = (totalSpent - totalBudgeted).toFixed(2);
    el.className = 'burn-card burn-critical';
    el.innerHTML = `<span class="burn-label">Burn Rate</span> Over budget by <strong>RM ${overage}</strong> — ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} still remaining in the period.`;
    return;
  }

  if (totalSpent === 0) {
    el.className = 'burn-card burn-neutral';
    el.innerHTML = '<span class="burn-label">Burn Rate</span> No spending recorded yet this period.';
    return;
  }

  const dailyRate      = totalSpent / daysElapsed;
  const budgetDaysLeft = (totalBudgeted - totalSpent) / dailyRate;
  const projectedTotal = totalSpent + dailyRate * daysRemaining;
  const rateLabel      = `RM ${dailyRate.toFixed(2)}/day`;

  if (budgetDaysLeft < daysRemaining) {
    const runsOutDate  = new Date(today.getTime() + budgetDaysLeft * MS_PER_DAY);
    const runsOutLabel = runsOutDate.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
    const daysShort    = Math.ceil(daysRemaining - budgetDaysLeft);
    el.className = 'burn-card ' + (budgetDaysLeft <= 3 ? 'burn-critical' : 'burn-warning');
    el.innerHTML = `<span class="burn-label">Burn Rate</span> At <strong>${rateLabel}</strong>, budget runs out around <strong>${runsOutLabel}</strong> — <strong>${daysShort} day${daysShort !== 1 ? 's' : ''} short</strong> of period end.`;
  } else {
    const surplus = (totalBudgeted - projectedTotal).toFixed(2);
    el.className = 'burn-card burn-safe';
    el.innerHTML = `<span class="burn-label">Burn Rate</span> At <strong>${rateLabel}</strong>, you'll finish the period with roughly <strong>RM ${surplus}</strong> to spare.`;
  }
}

// ── Run ──
init();
