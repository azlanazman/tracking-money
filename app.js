// ── Categories and accounts — loaded dynamically from Firebase settings ──
// Fallback defaults used if settings not yet saved
let CATEGORIES = {
  expense: {
    'Loan': ['PTPTN', 'Emas'], 'Bills': ['Unifi', 'Umobile', 'TNB', 'Air Selangor'],
    'Takaful': [], 'Family': ['Abah+Coway', 'Abah+Motor', 'Wife', 'Aidan', 'Dapur'],
    'CC': ['Charge'], 'Subs': ['Netflix', 'Sooka', 'Google One', 'Dorioo+', 'Quronly'],
    'SPay': [], 'Car': [], 'Community': ['Zakat', 'Sedekah'],
    'Food': ['Family', 'Work'], 'Toll': ['Family', 'Work'],
    'Parking': [], 'Fuel': ['Fuel', 'Charge'], 'Medical': [], 'Misc': [],
  },
  income: { 'Salary': [], 'Freelance': [], 'Bonus': [], 'Investment': [], 'Other': [] },
  savings: { 'Saving': [] }
};
let ACCOUNTS = ['CIMB', 'Maybank', 'RHB', 'AEON', 'TNG', 'SETEL', 'SPay', 'Cash', 'Other'];

// Load user settings from Firebase and refresh dropdowns
function loadUserSettings() {
  if (!db) return;
  db.collection('settings').doc('preferences').onSnapshot(doc => {
    if (doc.exists) {
      const data = doc.data();
      if (data.categories) CATEGORIES = data.categories;
      if (data.accounts) ACCOUNTS = data.accounts;
    }
    refreshAccountDropdowns();
    updateCategories();
    updateFilterCategories();
  });
}

function refreshAccountDropdowns() {
  const opts = ACCOUNTS.map(a => `<option value="${a}">${a}</option>`).join('');
  ['account', 'filterAccount'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const cur = el.value;
    if (id === 'filterAccount') {
      el.innerHTML = '<option value="all">All Accounts</option>' + opts;
    } else {
      el.innerHTML = opts;
    }
    // Restore previous selection if still valid
    if ([...el.options].some(o => o.value === cur)) el.value = cur;
  });
}


// ── Category icons ──
const ICONS = {
  Loan: '🏦', Bills: '💡', Takaful: '🛡️', Family: '👨‍👩‍👧',
  CC: '💳', Subs: '📱', SPay: '💳', Car: '🚗',
  Community: '🕌', Food: '🍱', Toll: '🛣️', Parking: '🅿️',
  Fuel: '⛽', Medical: '🏥', Misc: '📦',
  Salary: '💰', Freelance: '💼', Bonus: '🎁', Investment: '📈',
  Saving: '🏧', Other: '📌'
};

// ── Firebase init ──
let db = null;
let transactions = []; // in-memory cache

function initFirebase() {
  try {
    const app = firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();
    setStatus('connected', 'Connected to Firebase');
    migrateFromLocalStorage();
    loadTransactions();
    loadUserSettings();
  } catch (err) {
    setStatus('error', 'Firebase not configured — using local storage');
    fallbackToLocal();
  }
}

// ── Connection status indicator ──
function setStatus(state, msg) {
  const el = document.getElementById('dbStatus');
  el.textContent = msg;
  el.className = 'db-status ' + state;
}

// ── One-time migration: move localStorage data → Firebase ──
async function migrateFromLocalStorage() {
  const local = JSON.parse(localStorage.getItem('financeTransactions')) || [];
  if (local.length === 0) return;

  setStatus('connecting', 'Migrating your existing data to Firebase...');
  try {
    const batch = db.batch();
    local.forEach(t => {
      const ref = db.collection('transactions').doc(String(t.id));
      batch.set(ref, {
        date: t.date,
        amount: t.amount,
        account: t.account || 'Other',
        type: t.type,
        category: t.category,
        subcategory: t.subcategory || '',
        description: t.description || '',
        createdAt: t.id
      });
    });
    await batch.commit();
    localStorage.removeItem('financeTransactions'); // clear old data
    setStatus('connected', 'Migration done — data is now in Firebase');
  } catch (err) {
    setStatus('error', 'Migration failed: ' + err.message);
  }
}

// ── Load all transactions from Firestore ──
function loadTransactions() {
  setStatus('connecting', 'Loading...');
  db.collection('transactions')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snapshot => {
      transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStatus('connected', 'Firebase connected · ' + transactions.length + ' records');
      renderTransactions();
      updateSummary();
      updateFilterCategories();
    }, err => {
      setStatus('error', 'Load error: ' + err.message);
    });
}

// ── Fallback: use localStorage if Firebase not set up yet ──
function fallbackToLocal() {
  transactions = JSON.parse(localStorage.getItem('financeTransactions')) || [];
  renderTransactions();
  updateSummary();
  updateFilterCategories();
}

function saveLocal() {
  localStorage.setItem('financeTransactions', JSON.stringify(transactions));
}

// ── Add a new transaction ──
async function addTransaction() {
  const description = document.getElementById('description').value.trim();
  const amount = parseFloat(document.getElementById('amount').value);
  const type = document.getElementById('type').value;
  const account = document.getElementById('account').value;
  const category = document.getElementById('category').value;
  const subcategory = document.getElementById('subcategory').value;
  const date = document.getElementById('date').value;

  if (!amount || amount <= 0) { alert('Please enter a valid amount.'); return; }
  if (!date) { alert('Please select a date.'); return; }

  const t = {
    date, amount, account, type, category,
    subcategory: subcategory || '',
    description: description || '',
    createdAt: Date.now()
  };

  if (db) {
    try {
      await db.collection('transactions').add(t);
      // onSnapshot will update the UI automatically
    } catch (err) {
      alert('Save failed: ' + err.message);
    }
  } else {
    // Fallback
    t.id = Date.now();
    transactions.unshift(t);
    saveLocal();
    renderTransactions();
    updateSummary();
  }

  clearForm();
}

// ── Delete one transaction ──
async function deleteTransaction(id) {
  if (!confirm('Delete this transaction?')) return;

  if (db) {
    try {
      await db.collection('transactions').doc(String(id)).delete();
      // onSnapshot will update UI
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  } else {
    transactions = transactions.filter(t => String(t.id) !== String(id));
    saveLocal();
    renderTransactions();
    updateSummary();
  }
}

// ── Clear ALL transactions ──
async function clearAll() {
  if (transactions.length === 0) return;
  if (!confirm('Delete ALL transactions? This cannot be undone.')) return;

  if (db) {
    try {
      const snapshot = await db.collection('transactions').get();
      const batch = db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    } catch (err) {
      alert('Clear failed: ' + err.message);
    }
  } else {
    transactions = [];
    saveLocal();
    renderTransactions();
    updateSummary();
  }
}

// ── Clear form ──
function clearForm() {
  document.getElementById('description').value = '';
  document.getElementById('amount').value = '';
  document.getElementById('date').valueAsDate = new Date();
}

// ── Format helpers ──
function formatRM(amount) {
  return 'RM ' + parseFloat(amount).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-MY', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

// ── Category dropdowns ──
function updateCategories() {
  const type = document.getElementById('type').value;
  const catEl = document.getElementById('category');
  const cats = CATEGORIES[type] || {};

  catEl.innerHTML = Object.keys(cats).map(c =>
    `<option value="${c}">${c}</option>`
  ).join('');

  updateSubcategories();
  updateFilterCategories();
}

function updateSubcategories() {
  const type = document.getElementById('type').value;
  const cat = document.getElementById('category').value;
  const subEl = document.getElementById('subcategory');
  const subs = (CATEGORIES[type] && CATEGORIES[type][cat]) || [];

  subEl.innerHTML = subs.length === 0
    ? '<option value="">— none —</option>'
    : subs.map(s => `<option value="${s}">${s}</option>`).join('');
}

function updateFilterCategories() {
  const filterCat = document.getElementById('filterCategory');
  const current = filterCat.value;
  const allCats = new Set();

  Object.values(CATEGORIES).forEach(typeObj =>
    Object.keys(typeObj).forEach(c => allCats.add(c))
  );

  filterCat.innerHTML = '<option value="all">All Categories</option>' +
    [...allCats].map(c => `<option value="${c}">${c}</option>`).join('');

  if ([...allCats].includes(current)) filterCat.value = current;
}

// ── Pagination state ──
let currentPage = 1;
function resetPage() { currentPage = 1; }

// ── Tab switching ──
function switchTab(btn, type) {
  document.querySelectorAll('.tx-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('filterType').value = type;
  resetPage();
  renderTransactions();
}

// ── Render transaction list with pagination ──
function renderTransactions() {
  const filterType = document.getElementById('filterType').value;
  const filterAccount = document.getElementById('filterAccount').value;
  const filterCat = document.getElementById('filterCategory').value;
  const filterMonth = document.getElementById('filterMonth').value;
  const pageSize = parseInt(document.getElementById('pageSize').value) || 10;
  const list = document.getElementById('transactionList');

  let filtered = transactions.filter(t => {
    const matchType = filterType === 'all' || t.type === filterType;
    const matchAccount = filterAccount === 'all' || t.account === filterAccount;
    const matchCat = filterCat === 'all' || t.category === filterCat;
    const matchMonth = filterMonth === 'all' || (t.date && t.date.slice(5, 7) === filterMonth);
    return matchType && matchAccount && matchCat && matchMonth;
  });

  if (filtered.length === 0) {
    list.innerHTML = '<p class="empty-msg">No transactions found.</p>';
    document.getElementById('pageInfo').textContent = 'Showing 0 – 0 of 0';
    document.getElementById('pageNavRow').innerHTML = '';
    return;
  }

  // Clamp currentPage
  const totalPages = Math.ceil(filtered.length / pageSize);
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, filtered.length);
  const paged = filtered.slice(start, end);

  // Page info
  document.getElementById('pageInfo').textContent =
    `Showing ${filtered.length === 0 ? 0 : start + 1} – ${end} of ${filtered.length}`;

  // Render rows
  list.innerHTML = paged.map(t => {
    const sign = t.type === 'income' ? '+' : '-';
    const subLabel = t.subcategory ? ` › ${t.subcategory}` : '';
    const remarkLabel = t.description ? ` · ${t.description}` : '';
    const icon = ICONS[t.category] || '💳';

    return `
      <div class="transaction-item ${t.type}">
        <div class="tx-icon ${t.type}">${icon}</div>
        <div class="tx-left">
          <span class="tx-desc">${t.category}${subLabel}</span>
          <span class="tx-meta">${formatDate(t.date)} &nbsp;·&nbsp; ${t.account || ''}${remarkLabel}</span>
        </div>
        <span class="tx-badge ${t.type}">${t.type}</span>
        <span class="tx-amount ${t.type}">${sign} ${formatRM(t.amount)}</span>
        <button class="tx-delete" onclick="deleteTransaction('${t.id}')" title="Delete">&#x2715;</button>
      </div>
    `;
  }).join('');

  // Render pagination buttons
  const navRow = document.getElementById('pageNavRow');
  if (totalPages <= 1) { navRow.innerHTML = ''; return; }

  let pages = [];
  pages.push(1);
  for (let i = currentPage - 1; i <= currentPage + 1; i++) {
    if (i > 1 && i < totalPages) pages.push(i);
  }
  pages.push(totalPages);
  pages = [...new Set(pages)].sort((a, b) => a - b);

  let btns = '';
  btns += `<button class="page-btn" onclick="goPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>&#8592;</button>`;
  let prev = 0;
  pages.forEach(p => {
    if (p - prev > 1) btns += `<span class="page-ellipsis">…</span>`;
    btns += `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="goPage(${p})">${p}</button>`;
    prev = p;
  });
  btns += `<button class="page-btn" onclick="goPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>&#8594;</button>`;
  navRow.innerHTML = btns;
}

function goPage(n) {
  currentPage = n;
  renderTransactions();
  document.getElementById('transactionList').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Update summary cards ──
function updateSummary() {
  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const savings = transactions.filter(t => t.type === 'savings').reduce((s, t) => s + t.amount, 0);
  const balance = income - expenses - savings;

  document.getElementById('totalIncome').textContent = formatRM(income);
  document.getElementById('totalExpenses').textContent = formatRM(expenses);
  document.getElementById('totalSavings').textContent = formatRM(savings);

  const balEl = document.getElementById('balance');
  balEl.textContent = formatRM(balance);
  balEl.style.color = balance >= 0 ? '#27ae60' : '#e74c3c';

  // Update header balance
  const hBal = document.getElementById('headerBalance');
  const hSub = document.getElementById('headerBalanceSub');
  if (hBal) {
    hBal.textContent = formatRM(Math.abs(balance));
    hBal.style.color = balance >= 0 ? '#9fe1cb' : '#f1948a';
  }
  if (hSub) {
    const count = transactions.length;
    hSub.textContent = balance >= 0
      ? `Surplus across ${count} transaction${count !== 1 ? 's' : ''}`
      : `Deficit across ${count} transaction${count !== 1 ? 's' : ''}`;
  }
}

// ── Export helpers ──
function getExportData() {
  const start = document.getElementById('exportStart').value;
  const end = document.getElementById('exportEnd').value;
  const exportType = document.getElementById('exportType').value;

  if (!start || !end) { alert('Please select a Start Date and End Date.'); return null; }
  if (start > end) { alert('Start Date must be before End Date.'); return null; }

  return transactions.filter(t => {
    const inRange = t.date >= start && t.date <= end;
    const matchType = exportType === 'all' || t.type === exportType;
    return inRange && matchType;
  }).sort((a, b) => a.date.localeCompare(b.date));
}

async function exportToSheets() {
  const url = document.getElementById('sheetUrl').value.trim();
  const data = getExportData();
  if (!data) return;
  if (!url) { alert('Please paste your Google Apps Script URL first.'); return; }
  if (data.length === 0) { alert('No transactions in selected date range.'); return; }

  const statusEl = document.getElementById('exportStatus');
  statusEl.textContent = 'Sending ' + data.length + ' records...';
  statusEl.className = 'export-status sending';

  const rows = data.map(t => [
    formatDate(t.date), t.amount, t.account,
    t.category, t.subcategory || '', t.description || '', t.type
  ]);

  let iframe = document.getElementById('exportFrame');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'exportFrame'; iframe.name = 'exportFrame';
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
  }

  const form = document.createElement('form');
  form.method = 'POST'; form.action = url; form.target = 'exportFrame';
  const input = document.createElement('input');
  input.type = 'hidden'; input.name = 'payload';
  input.value = JSON.stringify({ rows });
  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);

  setTimeout(() => {
    statusEl.textContent = data.length + ' records sent! Check your Google Sheet.';
    statusEl.className = 'export-status success';
  }, 2500);
}

function exportCSV() {
  const data = getExportData();
  if (!data) return;
  if (data.length === 0) { alert('No transactions in selected date range.'); return; }

  const headers = ['Date', 'Amount', 'Account', 'Category', 'Sub-category', 'Remarks', 'Type'];
  const rows = data.map(t => [
    formatDate(t.date), t.amount.toFixed(2), t.account,
    t.category, t.subcategory || '', t.description || '', t.type
  ]);

  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `finance_${document.getElementById('exportStart').value}_to_${document.getElementById('exportEnd').value}.csv`;
  a.click();
}

// ── Save/load Sheet URL ──
function loadSheetUrl() {
  document.getElementById('sheetUrl').value = localStorage.getItem('sheetUrl') || '';
}
document.getElementById('sheetUrl').addEventListener('change', function () {
  localStorage.setItem('sheetUrl', this.value.trim());
});

// ── Init ──
document.getElementById('date').valueAsDate = new Date();
updateCategories();
updateFilterCategories();
loadSheetUrl();
initFirebase();
