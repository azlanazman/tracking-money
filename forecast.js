// ── Category colours ──
const CAT_COLORS = {
  'Loan':'#1a7a5e','Bills':'#2ecc99','Takaful':'#3498db',
  'Family':'#9b59b6','CC':'#e67e22','Subs':'#e74c3c',
  'SPay':'#1abc9c','Car':'#f39c12','Community':'#2980b9',
  'Food':'#8e44ad','Toll':'#27ae60','Parking':'#d35400',
  'Fuel':'#c0392b','Medical':'#16a085','Misc':'#7f8c8d'
};

// ── State ──
let db           = null;
let transactions = [];
let goals        = [];   // [{ id, name, emoji, monthly }]
let forecastChart= null;

// ── Helpers ──
const RM = v => 'RM ' + parseFloat(v).toFixed(2);

function getMonthPrefix(offset) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.toISOString().slice(0, 7); // YYYY-MM
}

function monthLabel(prefix) {
  const [y, m] = prefix.split('-');
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return names[parseInt(m) - 1] + ' ' + y;
}

// ── Firebase init ──
function setStatus(state, msg) {
  const el = document.getElementById('dbStatus');
  if (el) { el.textContent = msg; el.className = 'db-status ' + state; }
}

function init() {
  try {
    try { firebase.initializeApp(FIREBASE_CONFIG); } catch(e) {}
    db = firebase.firestore();
    setStatus('connecting', 'Loading...');

    // Load goals
    db.collection('goals').doc('list').get().then(doc => {
      goals = doc.exists ? (doc.data().goals || []) : [];
      renderGoals();
    });

    // Live transactions
    db.collection('transactions')
      .orderBy('date', 'desc')
      .onSnapshot(snap => {
        transactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setStatus('connected', 'Firebase connected · ' + transactions.length + ' records');
        renderAll();
      }, err => {
        setStatus('error', 'Load error: ' + err.message);
      });

  } catch(err) {
    transactions = JSON.parse(localStorage.getItem('financeTransactions')) || [];
    goals        = JSON.parse(localStorage.getItem('savingsGoals'))        || [];
    renderGoals();
    renderAll();
  }
}

// ── Get last 3 months prefixes (excluding current month) ──
function getLast3Months() {
  return [-3, -2, -1].map(o => getMonthPrefix(o));
}

// ── Compute monthly totals for a given type across a list of month prefixes ──
function monthlyTotals(type, months) {
  return months.map(prefix =>
    transactions
      .filter(t => t.type === type && t.date && t.date.startsWith(prefix))
      .reduce((s, t) => s + (t.amount || 0), 0)
  );
}

// ── Average of an array ──
function avg(arr) {
  const nonZero = arr.filter(v => v > 0);
  if (nonZero.length === 0) return 0;
  return nonZero.reduce((s, v) => s + v, 0) / nonZero.length;
}

// ── Render everything ──
function renderAll() {
  renderSummaryCards();
  renderGoals();
  renderForecast();
  renderCategoryForecast();
}

// ── Summary cards ──
function renderSummaryCards() {
  const months  = getLast3Months();
  const incomes = monthlyTotals('income',  months);
  const expenses= monthlyTotals('expense', months);

  const avgInc  = avg(incomes);
  const avgExp  = avg(expenses);
  const avgSurp = avgInc - avgExp;

  document.getElementById('avgIncome').textContent   = RM(avgInc);
  document.getElementById('avgExpenses').textContent = RM(avgExp);

  const surpEl       = document.getElementById('avgSurplus');
  surpEl.textContent = RM(Math.abs(avgSurp));
  surpEl.style.color = avgSurp >= 0 ? '#27ae60' : '#e74c3c';
  if (avgSurp < 0) surpEl.textContent = '-' + RM(Math.abs(avgSurp));

  // Goals on track count
  const totalGoalCost = goals.reduce((s, g) => s + (g.monthly || 0), 0);
  const onTrack = goals.filter(g => (g.monthly || 0) <= Math.max(avgSurp, 0)).length;
  document.getElementById('goalsOnTrack').textContent =
    goals.length === 0 ? '— / —' : `${onTrack} / ${goals.length}`;
}

// ── Render goals list ──
function renderGoals() {
  const months   = getLast3Months();
  const incomes  = monthlyTotals('income',  months);
  const expenses = monthlyTotals('expense', months);
  const avgSurp  = avg(incomes) - avg(expenses);

  // Running surplus after each goal
  let remainingSurplus = avgSurp;
  const totalGoals     = goals.reduce((s, g) => s + (g.monthly || 0), 0);

  const container = document.getElementById('goalsList');

  if (goals.length === 0) {
    container.innerHTML = '<p class="no-data" style="padding:16px 0">No goals yet. Add your first savings goal below.</p>';
    return;
  }

  container.innerHTML = goals.map((g, i) => {
    const monthly  = g.monthly || 0;
    remainingSurplus -= monthly;

    let statusClass, statusText;
    if (avgSurp <= 0) {
      statusClass = 'over';
      statusText  = 'No surplus';
    } else if (remainingSurplus >= 0) {
      statusClass = 'ok';
      statusText  = 'On track';
    } else if (remainingSurplus > -monthly * 0.3) {
      statusClass = 'tight';
      statusText  = 'Tight';
    } else {
      statusClass = 'over';
      statusText  = 'Over budget';
    }

    return `
      <div class="goal-card">
        <span class="goal-emoji">${g.emoji || '🎯'}</span>
        <div class="goal-info">
          <span class="goal-name">${g.name}</span>
          <span class="goal-sub">Monthly savings target</span>
        </div>
        <input
          class="goal-input"
          type="number"
          value="${monthly}"
          placeholder="RM / month"
          min="0" step="0.01"
          onchange="updateGoalAmount(${i}, this.value)"
        />
        <span class="goal-status ${statusClass}">${statusText}</span>
        <button class="goal-delete" onclick="deleteGoal(${i})" title="Remove">&#x2715;</button>
      </div>
    `;
  }).join('');
}

// ── Add a new goal ──
function addGoal() {
  const name   = document.getElementById('newGoalName').value.trim();
  const amount = parseFloat(document.getElementById('newGoalTarget').value) || 0;
  const emoji  = document.getElementById('newGoalEmoji').value.trim() || '🎯';

  if (!name) { alert('Please enter a goal name.'); return; }

  goals.push({ id: Date.now(), name, emoji, monthly: amount });

  document.getElementById('newGoalName').value   = '';
  document.getElementById('newGoalTarget').value = '';
  document.getElementById('newGoalEmoji').value  = '';

  renderGoals();
}

// ── Update goal amount inline ──
function updateGoalAmount(index, value) {
  goals[index].monthly = parseFloat(value) || 0;
  renderGoals();
}

// ── Delete a goal ──
function deleteGoal(index) {
  if (!confirm('Remove this goal?')) return;
  goals.splice(index, 1);
  renderGoals();
}

// ── Save goals to Firebase ──
async function saveGoals() {
  const statusEl = document.getElementById('goalSaveStatus');

  if (db) {
    try {
      await db.collection('goals').doc('list').set({ goals });
      statusEl.textContent = 'Saved!';
      setTimeout(() => statusEl.textContent = '', 2000);
    } catch(err) {
      statusEl.textContent = 'Save failed: ' + err.message;
    }
  } else {
    localStorage.setItem('savingsGoals', JSON.stringify(goals));
    statusEl.textContent = 'Saved locally!';
    setTimeout(() => statusEl.textContent = '', 2000);
  }

  renderAll();
}

// ── Forecast chart & summary ──
function renderForecast() {
  const past3   = getLast3Months();
  const next3   = [0, 1, 2].map(o => getMonthPrefix(o));
  const allMonths = [...past3, ...next3];

  const avgInc = avg(monthlyTotals('income',  past3));
  const avgExp = avg(monthlyTotals('expense', past3));
  const avgSav = avg(monthlyTotals('savings', past3));
  const totalGoalSavings = goals.reduce((s, g) => s + (g.monthly || 0), 0);
  const projectedSurplus = avgInc - avgExp - totalGoalSavings;

  // Summary cards
  document.getElementById('forecastSummary').innerHTML = `
    <div class="fc-card income">
      <p class="fc-label">Projected income</p>
      <p class="fc-amount">${RM(avgInc)}</p>
      <p class="fc-note">per month</p>
    </div>
    <div class="fc-card expense">
      <p class="fc-label">Projected expenses</p>
      <p class="fc-amount">${RM(avgExp)}</p>
      <p class="fc-note">per month</p>
    </div>
    <div class="fc-card saving">
      <p class="fc-label">After goals</p>
      <p class="fc-amount" style="color:${projectedSurplus >= 0 ? '#27ae60' : '#e74c3c'}">${RM(Math.abs(projectedSurplus))}</p>
      <p class="fc-note">${projectedSurplus >= 0 ? 'surplus / month' : 'shortfall / month'}</p>
    </div>
  `;

  // Chart data
  const actualIncome   = past3.map(m => monthlyTotals('income',  [m])[0]);
  const actualExpenses = past3.map(m => monthlyTotals('expense', [m])[0]);
  const actualSavings  = past3.map(m => monthlyTotals('savings', [m])[0]);

  const forecastIncome   = next3.map(() => avgInc);
  const forecastExpenses = next3.map(() => avgExp);
  const forecastSavings  = next3.map(() => totalGoalSavings || avgSav);

  const labels = allMonths.map(monthLabel);

  if (forecastChart) { forecastChart.destroy(); forecastChart = null; }

  const ctx = document.getElementById('forecastChart').getContext('2d');

  forecastChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Income',
          data: [...actualIncome, ...forecastIncome],
          backgroundColor: [...past3.map(() => '#2ecc7188'), ...next3.map(() => '#2ecc7144')],
          borderColor:     [...past3.map(() => '#27ae60'),   ...next3.map(() => '#27ae6077')],
          borderWidth: 1.5,
          borderRadius: 4,
        },
        {
          label: 'Expenses',
          data: [...actualExpenses, ...forecastExpenses],
          backgroundColor: [...past3.map(() => '#e74c3c88'), ...next3.map(() => '#e74c3c44')],
          borderColor:     [...past3.map(() => '#c0392b'),   ...next3.map(() => '#c0392b77')],
          borderWidth: 1.5,
          borderRadius: 4,
        },
        {
          label: 'Savings / Goals',
          data: [...actualSavings, ...forecastSavings],
          backgroundColor: [...past3.map(() => '#1abc9c88'), ...next3.map(() => '#1abc9c44')],
          borderColor:     [...past3.map(() => '#16a085'),   ...next3.map(() => '#16a08577')],
          borderWidth: 1.5,
          borderRadius: 4,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12, padding: 10 } },
        tooltip: {
          callbacks: {
            label: c => ` ${c.dataset.label}: ${RM(c.parsed.y)}`
          }
        },
        annotation: {}
      },
      scales: {
        x: { grid: { display: false } },
        y: { ticks: { callback: v => 'RM ' + v.toLocaleString() }, grid: { color: '#f0f0f0' } }
      }
    }
  });

  // Add a vertical divider label between past and forecast
  const dividerEl = document.getElementById('forecastChart').parentElement;
  let divNote = dividerEl.querySelector('.forecast-divider');
  if (!divNote) {
    divNote = document.createElement('p');
    divNote.className = 'forecast-divider';
    divNote.style.cssText = 'font-size:11px;color:#aaa;text-align:center;margin-top:6px;letter-spacing:0.5px';
    dividerEl.appendChild(divNote);
  }
  divNote.textContent = '◀ Actual (past 3 months)   |   Forecast (next 3 months) ▶';
}

// ── Category forecast breakdown ──
function renderCategoryForecast() {
  const past3     = getLast3Months();
  const container = document.getElementById('categoryForecast');

  const cats = Object.keys(CAT_COLORS);

  const rows = cats.map(cat => {
    const monthly = past3.map(m =>
      transactions
        .filter(t => t.type === 'expense' && t.category === cat && t.date && t.date.startsWith(m))
        .reduce((s, t) => s + (t.amount || 0), 0)
    );

    const average = avg(monthly);
    if (average === 0) return null;

    // Trend: compare most recent month vs average of prior 2
    const recent = monthly[2];
    const prior  = avg(monthly.slice(0, 2));
    const diff   = prior > 0 ? ((recent - prior) / prior) * 100 : 0;

    let trendClass, trendText;
    if (Math.abs(diff) < 5)  { trendClass = 'trend-flat'; trendText = 'Stable'; }
    else if (diff > 0)       { trendClass = 'trend-up';   trendText = `+${diff.toFixed(0)}%`; }
    else                     { trendClass = 'trend-down';  trendText = `${diff.toFixed(0)}%`; }

    return `
      <div class="cat-fc-row">
        <span class="cat-fc-dot" style="background:${CAT_COLORS[cat]}"></span>
        <span class="cat-fc-name">${cat}</span>
        <span class="cat-fc-avg">${RM(average)}</span>
        <span class="cat-fc-trend ${trendClass}">${trendText}</span>
      </div>
    `;
  }).filter(Boolean);

  if (rows.length === 0) {
    container.innerHTML = '<p class="no-data">Not enough data yet — add at least 1 month of transactions.</p>';
    return;
  }

  container.innerHTML = rows.join('');
}

// ── Init ──
init();
