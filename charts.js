// ── Transactions loaded from Firebase ──
let transactions = [];

function initChartsFirebase() {
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
  } catch (e) { }  // already initialized is fine
  const db = firebase.firestore();
  db.collection('transactions')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snapshot => {
      transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderAll();
    }, err => {
      // Fallback to localStorage
      transactions = JSON.parse(localStorage.getItem('financeTransactions')) || [];
      renderAll();
    });
}

// ── Colour palette for categories ──
const PALETTE = [
  '#1a7a5e', '#2ecc99', '#3498db', '#9b59b6', '#e67e22',
  '#e74c3c', '#1abc9c', '#f39c12', '#2980b9', '#8e44ad',
  '#27ae60', '#d35400', '#c0392b', '#16a085', '#7f8c8d',
  '#2c3e50', '#f1c40f', '#34495e'
];

let barChartInstance = null;
let lineChartInstance = null;

// ── Set default date range (this month) on load ──
function initDates() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  document.getElementById('startDate').value = toInputDate(start);
  document.getElementById('endDate').value = toInputDate(end);
}

function toInputDate(d) {
  return d.toISOString().slice(0, 10);
}

// ── Quick select shortcuts ──
function applyQuickSelect() {
  const val = document.getElementById('quickSelect').value;
  if (!val) return;

  const now = new Date();
  let start, end;

  if (val === 'this_month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  } else if (val === 'last_month') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0);

  } else if (val === 'this_year') {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 11, 31);

  } else if (val === 'last_30') {
    end = new Date(now);
    start = new Date(now);
    start.setDate(start.getDate() - 30);

  } else if (val === 'last_90') {
    end = new Date(now);
    start = new Date(now);
    start.setDate(start.getDate() - 90);

  } else if (val === 'all') {
    const dates = transactions.map(t => t.date).sort();
    if (dates.length === 0) return;
    start = new Date(dates[0] + 'T00:00:00');
    end = new Date(dates[dates.length - 1] + 'T00:00:00');
  }

  document.getElementById('startDate').value = toInputDate(start);
  document.getElementById('endDate').value = toInputDate(end);
  renderAll();
}

// ── Get filtered transactions by date range and type ──
function getFiltered() {
  const start = document.getElementById('startDate').value;
  const end = document.getElementById('endDate').value;
  const type = document.getElementById('typeSelect').value;

  return transactions.filter(t =>
    t.type === type &&
    (!start || t.date >= start) &&
    (!end || t.date <= end)
  );
}

// ── Get date range label for chart titles ──
function getDateLabel() {
  const start = document.getElementById('startDate').value;
  const end = document.getElementById('endDate').value;
  const fmt = d => new Date(d + 'T00:00:00').toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  if (end) return `Until ${fmt(end)}`;
  return 'All time';
}

// ── Build month-label × category data for charts ──
function buildChartData(filtered) {
  const cats = [...new Set(filtered.map(t => t.category))].sort();

  // Group by month (YYYY-MM) and get sorted unique months
  const monthSet = new Set(filtered.map(t => t.date.slice(0, 7)));
  const months = [...monthSet].sort();

  // month labels for display: "Mar 2026"
  const monthLabels = months.map(m => {
    const [y, mo] = m.split('-');
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return names[parseInt(mo) - 1] + ' ' + y;
  });

  // data[monthKey][category] = total
  const data = {};
  months.forEach(m => {
    data[m] = {};
    cats.forEach(c => data[m][c] = 0);
  });
  filtered.forEach(t => {
    const m = t.date.slice(0, 7);
    data[m][t.category] = (data[m][t.category] || 0) + t.amount;
  });

  return { cats, months, monthLabels, data };
}

// ── Render everything ──
function renderAll() {
  const type = document.getElementById('typeSelect').value;
  const label = type.charAt(0).toUpperCase() + type.slice(1);
  const dateLabel = getDateLabel();

  document.getElementById('barTitle').textContent = `${label}s by category — ${dateLabel}`;
  document.getElementById('lineTitle').textContent = `${label} trends by category — ${dateLabel}`;
  document.getElementById('tableTitle').textContent = `${label} breakdown — ${dateLabel}`;

  renderSummaryCards();
  renderBarChart();
  renderLineChart();
  renderTable();
}

// ── Summary cards for selected range ──
function renderSummaryCards() {
  const start = document.getElementById('startDate').value;
  const end = document.getElementById('endDate').value;

  const inRange = t => (!start || t.date >= start) && (!end || t.date <= end);

  const exp = transactions.filter(t => t.type === 'expense' && inRange(t)).reduce((s, t) => s + t.amount, 0);
  const inc = transactions.filter(t => t.type === 'income' && inRange(t)).reduce((s, t) => s + t.amount, 0);
  const sav = transactions.filter(t => t.type === 'savings' && inRange(t)).reduce((s, t) => s + t.amount, 0);

  document.getElementById('thisMonthExp').textContent = 'RM ' + exp.toFixed(2);
  document.getElementById('thisMonthInc').textContent = 'RM ' + inc.toFixed(2);
  document.getElementById('thisMonthSav').textContent = 'RM ' + sav.toFixed(2);

  // Top expense category in range
  const expOnly = transactions.filter(t => t.type === 'expense' && inRange(t));
  const catTotals = {};
  expOnly.forEach(t => catTotals[t.category] = (catTotals[t.category] || 0) + t.amount);
  const top = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
  document.getElementById('topCategory').textContent = top
    ? `${top[0]} (RM ${top[1].toFixed(2)})`
    : '—';
}

// ── Bar Chart ──
function renderBarChart() {
  const filtered = getFiltered();
  const ctx = document.getElementById('barChart').getContext('2d');

  if (barChartInstance) { barChartInstance.destroy(); barChartInstance = null; }

  if (filtered.length === 0) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.font = '14px Segoe UI'; ctx.fillStyle = '#aaa'; ctx.textAlign = 'center';
    ctx.fillText('No data for selected period', ctx.canvas.width / 2, 150);
    return;
  }

  const { cats, monthLabels, months, data } = buildChartData(filtered);

  const datasets = cats.map((cat, i) => ({
    label: cat,
    data: months.map(m => data[m][cat] || 0),
    backgroundColor: PALETTE[i % PALETTE.length] + 'cc',
    borderColor: PALETTE[i % PALETTE.length],
    borderWidth: 1,
    borderRadius: 3,
  }));

  barChartInstance = new Chart(ctx, {
    type: 'bar',
    data: { labels: monthLabels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12, padding: 10 } },
        tooltip: { callbacks: { label: c => ` ${c.dataset.label}: RM ${c.parsed.y.toFixed(2)}` } }
      },
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, ticks: { callback: v => 'RM ' + v.toLocaleString() } }
      }
    }
  });
}

// ── Line Chart ──
function renderLineChart() {
  const filtered = getFiltered();
  const ctx = document.getElementById('lineChart').getContext('2d');

  if (lineChartInstance) { lineChartInstance.destroy(); lineChartInstance = null; }

  if (filtered.length === 0) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.font = '14px Segoe UI'; ctx.fillStyle = '#aaa'; ctx.textAlign = 'center';
    ctx.fillText('No data for selected period', ctx.canvas.width / 2, 150);
    return;
  }

  const { cats, monthLabels, months, data } = buildChartData(filtered);

  const datasets = cats.map((cat, i) => ({
    label: cat,
    data: months.map(m => data[m][cat] || 0),
    borderColor: PALETTE[i % PALETTE.length],
    backgroundColor: PALETTE[i % PALETTE.length] + '22',
    borderWidth: 2,
    pointRadius: 4,
    pointHoverRadius: 6,
    tension: 0.3,
    fill: false,
  }));

  lineChartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels: monthLabels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12, padding: 10 } },
        tooltip: { callbacks: { label: c => ` ${c.dataset.label}: RM ${c.parsed.y.toFixed(2)}` } }
      },
      scales: {
        x: { grid: { color: '#f0f0f0' } },
        y: { ticks: { callback: v => 'RM ' + v.toLocaleString() }, grid: { color: '#f0f0f0' } }
      }
    }
  });
}

// ── Category Breakdown Table ──
function renderTable() {
  const filtered = getFiltered();
  const container = document.getElementById('categoryTable');

  if (filtered.length === 0) {
    container.innerHTML = '<p class="no-data">No data for selected period.</p>';
    return;
  }

  const catTotals = {};
  filtered.forEach(t => catTotals[t.category] = (catTotals[t.category] || 0) + t.amount);

  const total = Object.values(catTotals).reduce((s, v) => s + v, 0);
  const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

  const rows = sorted.map(([cat, amt], i) => {
    const pct = total > 0 ? (amt / total * 100).toFixed(1) : 0;
    const color = PALETTE[i % PALETTE.length];
    return `
      <tr>
        <td><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${color};margin-right:6px;"></span>${cat}</td>
        <td>RM ${amt.toFixed(2)}</td>
        <td class="bar-cell">
          <div class="bar-track">
            <div class="bar-fill" style="width:${pct}%;background:${color}"></div>
          </div>
        </td>
        <td class="pct-cell">${pct}%</td>
      </tr>`;
  }).join('');

  container.innerHTML = `
    <table class="cat-table">
      <thead><tr><th>Category</th><th>Total (RM)</th><th class="bar-cell">Share</th><th>%</th></tr></thead>
      <tbody>
        ${rows}
        <tr style="font-weight:600;background:#f9fafb">
          <td>Total</td><td>RM ${total.toFixed(2)}</td><td></td><td>100%</td>
        </tr>
      </tbody>
    </table>`;
}

// ── Init ──
initDates();
initChartsFirebase();
