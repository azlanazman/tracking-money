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
        // Migrate: ensure all 3 type keys exist
        settings.categories = settings.categories || {};
        ['expense','income','savings'].forEach(t => {
          if (!settings.categories[t]) settings.categories[t] = DEFAULTS.categories[t];
        });
        if (!settings.accounts) settings.accounts = [...DEFAULTS.accounts];
      } else {
        // First time — load defaults
        settings = {
          accounts:   [...DEFAULTS.accounts],
          categories: JSON.parse(JSON.stringify(DEFAULTS.categories))
        };
      }
      setStatus('connected', 'Connected');
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

// ── Save to Firebase ──
async function saveSettings() {
  const statusEl = document.getElementById('saveStatus');
  statusEl.textContent = 'Saving...';

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
init();
