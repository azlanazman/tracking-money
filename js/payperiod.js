// ══════════════════════════════════════════════════════
//  payperiod.js — shared pay period utility
//  Loaded on every page AFTER firebase-config.js
//  Exposes: window.PAY_PERIOD with helper functions
// ══════════════════════════════════════════════════════

window.PAY_PERIOD = (() => {

  // ── Cached settings ──
  let _defaultDay  = 25;          // salary day (1–28)
  let _overrides   = {};          // { 'YYYY-MM': 'YYYY-MM-DD' } start date overrides per period
  let _listeners   = [];          // callbacks notified when settings change
  let _db          = null;

  // ── Init: load from Firebase ──
  function init(db) {
    _db = db;
    db.collection('settings').doc('payperiod').onSnapshot(doc => {
      if (doc.exists) {
        const d = doc.data();
        _defaultDay = d.defaultDay  || 25;
        _overrides  = d.overrides   || {};
      }
      _listeners.forEach(fn => fn());
    });
  }

  // ── Register a callback for when settings change ──
  function onChange(fn) { _listeners.push(fn); }

  // ── Format a Date as YYYY-MM-DD ──
  function toYMD(d) { return d.toISOString().slice(0, 10); }

  // ── Format a Date as readable string e.g. "25 Feb 2026" ──
  function toLabel(d) {
    return d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ── Safe date: clamp day to last day of month ──
  function safeDate(year, month, day) {
    const last = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(day, last));
  }

  // ── Get the start date of a given period key (YYYY-MM = year+month of END date) ──
  // Period key convention: the month in which the period ENDS
  // e.g. key '2026-03' = period that ends ~25 Mar = starts ~25 Feb
  function getPeriodStart(periodKey) {
    // Check override first
    if (_overrides[periodKey]) {
      return new Date(_overrides[periodKey] + 'T00:00:00');
    }
    const [y, m] = periodKey.split('-').map(Number);
    // Start is defaultDay of previous month
    const prevMonth = m - 2; // 0-indexed, one month earlier
    const prevYear  = prevMonth < 0 ? y - 1 : y;
    const adjMonth  = ((prevMonth % 12) + 12) % 12;
    return safeDate(prevYear, adjMonth, _defaultDay);
  }

  // ── Get end date of period (exclusive — day before next period starts) ──
  function getPeriodEnd(periodKey) {
    const [y, m] = periodKey.split('-').map(Number);
    // End is the day BEFORE the next period's start
    const endD = safeDate(y, m - 1, _defaultDay);
    // subtract 1 day
    endD.setDate(endD.getDate() - 1);
    return endD;
  }

  // ── Get the current period key based on today ──
  function currentPeriodKey() {
    const now     = new Date();
    const day     = now.getDate();
    const month   = now.getMonth(); // 0-indexed
    const year    = now.getFullYear();
    // If today is on or after the salary day, we're in the period that ends next month
    if (day >= _defaultDay) {
      const endMonth = month + 2; // 1-indexed
      const endYear  = endMonth > 12 ? year + 1 : year;
      return `${endYear}-${String(endMonth > 12 ? endMonth - 12 : endMonth).padStart(2, '0')}`;
    } else {
      return `${year}-${String(month + 1).padStart(2, '0')}`;
    }
  }

  // ── Get start/end dates for the current period ──
  function currentPeriod() {
    const key   = currentPeriodKey();
    const start = getPeriodStart(key);
    const end   = getPeriodEnd(key);
    return {
      key,
      start:      toYMD(start),
      end:        toYMD(end),
      label:      `${toLabel(start)} – ${toLabel(end)}`,
      startLabel: toLabel(start),
      endLabel:   toLabel(end),
    };
  }

  // ── Get last N periods (most recent first) ──
  function lastNPeriods(n) {
    const periods = [];
    let key = currentPeriodKey();
    for (let i = 0; i < n; i++) {
      const start = getPeriodStart(key);
      const end   = getPeriodEnd(key);
      periods.push({
        key,
        start:      toYMD(start),
        end:        toYMD(end),
        label:      `${toLabel(start)} – ${toLabel(end)}`,
        startLabel: toLabel(start),
        endLabel:   toLabel(end),
      });
      // Move to previous period: subtract one month from key
      const [y, m] = key.split('-').map(Number);
      const pm = m - 1;
      key = pm <= 0
        ? `${y - 1}-12`
        : `${y}-${String(pm).padStart(2, '0')}`;
    }
    return periods;
  }

  // ── Filter transactions to a period ──
  function filterToPeriod(transactions, period) {
    return transactions.filter(t =>
      t.date && t.date >= period.start && t.date <= period.end
    );
  }

  // ── Get default salary day ──
  function getDefaultDay() { return _defaultDay; }

  // ── Get overrides ──
  function getOverrides() { return { ..._overrides }; }

  // ── Save settings to Firebase ──
  async function save(defaultDay, overrides) {
    _defaultDay = defaultDay;
    _overrides  = overrides;
    if (_db) {
      await _db.collection('settings').doc('payperiod').set({ defaultDay, overrides });
    } else {
      localStorage.setItem('payperiod', JSON.stringify({ defaultDay, overrides }));
    }
  }

  return { init, onChange, currentPeriod, currentPeriodKey, lastNPeriods,
           filterToPeriod, getPeriodStart, getPeriodEnd, getDefaultDay,
           getOverrides, save, toLabel, toYMD };
})();
