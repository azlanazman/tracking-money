// ── Default data (pre-loaded on first run) ──
const DEFAULTS = {
  accounts: ['CIMB', 'Maybank', 'RHB', 'AEON', 'TNG', 'SETEL', 'SPay', 'Cash', 'Other'],
  categories: {
    expense: {
      'Loan':      ['PTPTN', 'Emas'],
      'Bills':     ['Unifi', 'Umobile', 'TNB', 'Air Selangor'],
      'Takaful':   [],
      'Family':    ['Abah+Coway', 'Abah+Motor', 'Wife', 'Aidan', 'Dapur'],
      'CC':        ['Charge'],
      'Subs':      ['Netflix', 'Sooka', 'Google One', 'Dorioo+', 'Quronly'],
      'SPay':      [],
      'Car':       [],
      'Community': ['Zakat', 'Sedekah'],
      'Food':      ['Family', 'Work'],
      'Toll':      ['Family', 'Work'],
      'Parking':   [],
      'Fuel':      ['Fuel', 'Charge'],
      'Medical':   [],
      'Misc':      [],
    },
    income: {
      'Salary':     [],
      'Freelance':  [],
      'Bonus':      [],
      'Investment': [],
      'Other':      [],
    },
    savings: {
      'Saving': [],
    }
  }
};

// ── State ──
let db            = null;
let settings      = null;   // { accounts: [], categories: { expense:{}, income:{}, savings:{} } }
let activeType    = 'expense';
let selectedCat   = null;

// ── Init Firebase ──
function init() {
  try {
    try { firebase.initializeApp(FIREBASE_CONFIG); } catch(e) {}
    db = firebase.firestore();
    setStatus('connecting', 'Loading...');

    db.collection('settings').doc('preferences').get().then(doc => {
      if (doc.exists) {
        settings = doc.data();
        settings.categories = settings.categories || {};
        ['expense','income','savings'].forEach(t => {
          if (!settings.categories[t]) settings.categories[t] = DEFAULTS.categories[t];
        });
        if (!settings.accounts) settings.accounts = [...DEFAULTS.accounts];
      } else {
        settings = {
          accounts:   [...DEFAULTS.accounts],
          categories: JSON.parse(JSON.stringify(DEFAULTS.categories))
        };
      }
      setStatus('connected', 'Connected');
      loadPayPeriodFromSettings(settings);
      renderAll();
    });

  } catch(err) {
    setStatus('error', 'Firebase error');
    settings = {
      accounts:   [...DEFAULTS.accounts],
      categories: JSON.parse(JSON.stringify(DEFAULTS.categories))
    };
    renderAll();
  }
}

function setStatus(state, msg) {
  const el = document.getElementById('dbStatus');
  if (el) { el.textContent = msg; el.className = 'db-status ' + state; }
}

// ── Render all ──
function renderAll() {
  renderAccounts();
  renderCategories();
  renderSubcategories();
}

// ── Accounts ──
function renderAccounts() {
  const list = document.getElementById('accountList');
  const accs = settings.accounts || [];

  if (accs.length === 0) {
    list.innerHTML = '<span class="tag-empty">No accounts yet</span>';
    return;
  }

  list.innerHTML = accs.map((a, i) => `
    <span class="tag">
      ${a}
      <button class="tag-del" onclick="deleteAccount(${i})" title="Remove">×</button>
    </span>
  `).join('');
}

function addAccount() {
  const input = document.getElementById('newAccount');
  const val   = input.value.trim();
  if (!val) return;
  if (settings.accounts.includes(val)) { alert('Account already exists.'); return; }
  settings.accounts.push(val);
  input.value = '';
  renderAccounts();
}

function deleteAccount(i) {
  settings.accounts.splice(i, 1);
  renderAccounts();
}

// ── Type tab switch ──
function switchType(btn, type) {
  document.querySelectorAll('.type-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  activeType  = type;
  selectedCat = null;
  renderCategories();
  renderSubcategories();
}

// ── Categories ──
function renderCategories() {
  const list = document.getElementById('categoryList');
  const cats = Object.keys(settings.categories[activeType] || {});

  if (cats.length === 0) {
    list.innerHTML = '<span class="tag-empty">No categories yet</span>';
    return;
  }

  list.innerHTML = cats.map(cat => `
    <span class="tag ${cat === selectedCat ? 'selected' : ''}" onclick="selectCategory('${cat}')">
      ${cat}
      <button class="tag-del" onclick="event.stopPropagation();deleteCategory('${cat}')" title="Remove">×</button>
    </span>
  `).join('');
}

function selectCategory(cat) {
  selectedCat = cat;
  renderCategories();
  renderSubcategories();
}

function addCategory() {
  const input = document.getElementById('newCategory');
  const val   = input.value.trim();
  if (!val) return;
  if (settings.categories[activeType][val] !== undefined) {
    alert('Category already exists.'); return;
  }
  settings.categories[activeType][val] = [];
  input.value = '';
  renderCategories();
}

function deleteCategory(cat) {
  if (!confirm(`Delete category "${cat}" and all its sub-categories?`)) return;
  delete settings.categories[activeType][cat];
  if (selectedCat === cat) selectedCat = null;
  renderCategories();
  renderSubcategories();
}

// ── Sub-categories ──
function renderSubcategories() {
  const labelEl  = document.getElementById('subColLabel');
  const list     = document.getElementById('subcategoryList');
  const addRow   = document.getElementById('subAddRow');

  if (!selectedCat) {
    labelEl.textContent = 'Select a category →';
    list.innerHTML = '';
    addRow.style.display = 'none';
    return;
  }

  labelEl.textContent = `Sub-categories of "${selectedCat}"`;
  addRow.style.display = 'flex';

  const subs = settings.categories[activeType][selectedCat] || [];

  if (subs.length === 0) {
    list.innerHTML = '<span class="tag-empty">No sub-categories</span>';
    return;
  }

  list.innerHTML = subs.map((s, i) => `
    <span class="tag">
      ${s}
      <button class="tag-del" onclick="deleteSubcategory(${i})" title="Remove">×</button>
    </span>
  `).join('');
}

function addSubcategory() {
  if (!selectedCat) return;
  const input = document.getElementById('newSubcategory');
  const val   = input.value.trim();
  if (!val) return;
  const subs = settings.categories[activeType][selectedCat];
  if (subs.includes(val)) { alert('Sub-category already exists.'); return; }
  subs.push(val);
  input.value = '';
  renderSubcategories();
}

function deleteSubcategory(i) {
  settings.categories[activeType][selectedCat].splice(i, 1);
  renderSubcategories();
}


// ══════════════════════════════════════
//  PAY PERIOD SETTINGS
// ══════════════════════════════════════

let ppOverrides = {}; // { 'YYYY-MM': 'YYYY-MM-DD' }

function initPayPeriod() {
  // Populate year selector (current year ± 2)
  const yearEl = document.getElementById('overrideYear');
  const now    = new Date();
  const curY   = now.getFullYear();
  for (let y = curY - 1; y <= curY + 1; y++) {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y;
    if (y === curY) opt.selected = true;
    yearEl.appendChild(opt);
  }

  // Set current month as default in override selects
  document.getElementById('overrideMonth').value = String(now.getMonth() + 1).padStart(2, '0');
}

function loadPayPeriodFromSettings(data) {
  if (data.payperiod) {
    document.getElementById('defaultDay').value = data.payperiod.defaultDay || 25;
    ppOverrides = data.payperiod.overrides || {};
  }
  renderOverrides();
  updatePreview();
}

function addOverride() {
  const month = document.getElementById('overrideMonth').value;
  const year  = document.getElementById('overrideYear').value;
  const date  = document.getElementById('overrideDate').value;
  if (!date) { alert('Please select an actual start date.'); return; }
  const key = `${year}-${month}`;
  ppOverrides[key] = date;
  document.getElementById('overrideDate').value = '';
  renderOverrides();
  updatePreview();
}

function deleteOverride(key) {
  delete ppOverrides[key];
  renderOverrides();
  updatePreview();
}

function renderOverrides() {
  const container = document.getElementById('overrideList');
  const keys = Object.keys(ppOverrides).sort();
  if (keys.length === 0) {
    container.innerHTML = '<p class="tag-empty">No overrides set — using default day every month.</p>';
    return;
  }
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  container.innerHTML = keys.map(k => {
    const [y, m] = k.split('-');
    const periodLabel = MONTHS[parseInt(m)-1] + ' ' + y;
    const startDate   = new Date(ppOverrides[k] + 'T00:00:00')
      .toLocaleDateString('en-MY', { day:'2-digit', month:'short', year:'numeric' });
    return `
      <div class="override-row">
        <span class="override-period">${periodLabel}</span>
        <span class="override-arrow">starts →</span>
        <span class="override-date">${startDate}</span>
        <button class="override-del" onclick="deleteOverride('${k}')" title="Remove">&#x2715;</button>
      </div>`;
  }).join('');
}

function updatePreview() {
  const day = parseInt(document.getElementById('defaultDay').value) || 25;
  // Temporarily apply to PAY_PERIOD for preview
  PAY_PERIOD.save(day, ppOverrides).then(() => {
    const period = PAY_PERIOD.currentPeriod();
    document.getElementById('ppPreview').textContent =
      'Current period: ' + period.label;
  });
}

// Trigger preview on day change
document.getElementById('defaultDay').addEventListener('input', updatePreview);

// ── Save to Firebase ──
async function saveSettings() {
  const statusEl = document.getElementById('saveStatus');
  statusEl.textContent = 'Saving...';
  // Bundle payperiod into settings
  const day = parseInt(document.getElementById('defaultDay').value) || 25;
  settings.payperiod = { defaultDay: day, overrides: ppOverrides };

  if (db) {
    try {
      await db.collection('settings').doc('preferences').set(settings);
      statusEl.textContent = 'Saved! Changes apply immediately across all pages.';
      setTimeout(() => statusEl.textContent = '', 3000);
    } catch(err) {
      statusEl.textContent = 'Save failed: ' + err.message;
    }
  } else {
    localStorage.setItem('userSettings', JSON.stringify(settings));
    statusEl.textContent = 'Saved locally.';
    setTimeout(() => statusEl.textContent = '', 3000);
  }
}

// ── Enter key support ──
document.getElementById('newAccount').addEventListener('keydown',     e => { if (e.key==='Enter') addAccount(); });
document.getElementById('newCategory').addEventListener('keydown',    e => { if (e.key==='Enter') addCategory(); });
document.getElementById('newSubcategory').addEventListener('keydown', e => { if (e.key==='Enter') addSubcategory(); });

// ── Init ──
initPayPeriod();
init();
