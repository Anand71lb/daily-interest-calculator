/* ============================================
   DAILY COMPOUND INTEREST CALCULATOR — calculator.js
   ============================================ */
'use strict';

// ─── State ────────────────────────────────────────────────────────────────────
const State = {
  // FIX #1: This is the compound page — mode is always 'compound'.
  // The old code defaulted to 'simple' and read data-mode from <a> tags that
  // never had that attribute, so the calculator silently ran Simple Interest every time.
  mode: 'compound',
  currency: 'INR',
  locale: 'en-IN',
  // Stores last result for CSV export (FIX #5)
  lastResult: null
};

// ─── DOM References ───────────────────────────────────────────────────────────
const DOM = {};
function initDOM() {
  DOM.calcBtn    = document.getElementById('calc-btn');
  DOM.resetBtn   = document.getElementById('reset-btn');
  DOM.resultsEl  = document.getElementById('results');
  DOM.applyDates = document.getElementById('apply-dates');
  DOM.principal  = document.getElementById('principal');
  DOM.rate       = document.getElementById('rate');
  DOM.days       = document.getElementById('days');
  // FIX #2: was getElementById('freq') but element id was 'rate-period'.
  // HTML has been updated to id='freq' with numeric option values — this now works.
  DOM.freq       = document.getElementById('freq');
  DOM.startDate  = document.getElementById('start-date');
  DOM.endDate    = document.getElementById('end-date');
  DOM.currency   = document.getElementById('currency');
  DOM.currSymbol = document.getElementById('currency-symbol');

  // Result card elements
  DOM.resPrincipal = document.getElementById('res-principal');
  DOM.resInterest  = document.getElementById('res-interest');
  DOM.resTotal     = document.getElementById('res-total');
  // FIX #4: grab the two cards that were never wired up
  DOM.resDays      = document.getElementById('res-days');
  DOM.resRate      = document.getElementById('res-rate');

  DOM.barPrincipal = document.getElementById('bar-principal');
  DOM.barInterest  = document.getElementById('bar-interest');
  DOM.pctPrincipal = document.getElementById('pct-principal');
  DOM.pctInterest  = document.getElementById('pct-interest');

  // FIX #5: schedule + CSV elements
  DOM.scheduleContainer = document.getElementById('detailed-schedule-container');
  DOM.scheduleMeta      = document.getElementById('schedule-meta');
  DOM.scheduleBody      = document.getElementById('schedule-body');
  DOM.downloadCsv       = document.getElementById('download-csv');
}

// ─── Formatters ───────────────────────────────────────────────────────────────
const Formatters = {
  currency(val, decimals = 2) {
    try {
      return val.toLocaleString(State.locale, {
        style: 'currency',
        currency: State.currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    } catch {
      return val.toFixed(decimals);
    }
  },
  percent(val, decimals = 2) {
    return val.toFixed(decimals) + '%';
  }
};

// ─── Calculator ────────────────────────────────────────────────────────────────
const Calculator = {
  // FIX #3: rate period is now read from DOM.freq which has numeric values (365/12).
  // The old compound() always received a hard-coded freq; now it honours the user's
  // selection — yearly rate / 365 for daily compounding, yearly rate / 12 for monthly.
  compound(principal, annualRate, days, freq) {
    const years = days / 365;
    // freq is the compounding periods per year (365 = daily, 12 = monthly)
    const totalAmount   = principal * Math.pow(1 + (annualRate / 100) / freq, freq * years);
    const totalInterest = totalAmount - principal;
    // Average daily interest for display; actual per-day varies (compounding)
    const dailyInterest = totalInterest / days;
    return { totalAmount, totalInterest, dailyInterest };
  },

  // Build the daily schedule row-by-row (used for the table and CSV)
  buildSchedule(principal, annualRate, days, freq) {
    const dailyRate = (annualRate / 100) / freq; // rate per compounding period
    // For daily freq (365), each "period" = 1 day
    // For monthly freq (12), periods don't map 1:1 to days — we approximate daily balance
    const periodsPerDay = freq / 365;
    const rows = [];
    let balance = principal;
    let cumulativeInterest = 0;

    for (let day = 1; day <= days; day++) {
      const dayInterest = balance * dailyRate * periodsPerDay;
      balance += dayInterest;
      cumulativeInterest += dayInterest;
      rows.push({
        day,
        dayInterest,
        cumulativeInterest,
        balance
      });
    }
    return rows;
  },

  run() {
    Validator.clearErrors();

    const principal = parseFloat(DOM.principal.value);
    const rate      = parseFloat(DOM.rate.value);
    const days      = parseInt(DOM.days.value, 10);
    // FIX #2 resolved: DOM.freq now points to the correct element with a numeric value
    const freq      = parseInt(DOM.freq ? DOM.freq.value : '365', 10) || 365;

    if (!Validator.validate({ principal, rate, days })) {
      UI.shake(DOM.calcBtn);
      return;
    }

    UI.setCalculating(true);

    setTimeout(() => {
      let result;
      try {
        // FIX #1: always call compound() — this is the compound calculator page
        result = Calculator.compound(principal, rate, days, freq);
      } catch (err) {
        console.error('Calculation error:', err);
        UI.setCalculating(false);
        return;
      }

      const { totalAmount, totalInterest, dailyInterest } = result;
      const principalPct = (principal / totalAmount) * 100;
      const interestPct  = (totalInterest / totalAmount) * 100;

      // Build schedule rows
      const scheduleRows = Calculator.buildSchedule(principal, rate, days, freq);

      // Store for CSV export
      State.lastResult = { principal, rate, days, freq, scheduleRows, totalAmount, totalInterest };

      UI.renderResults({
        principal, dailyInterest, totalInterest, totalAmount,
        principalPct, interestPct,
        days, rate, scheduleRows
      });

      UI.setCalculating(false);
    }, 0);
  }
};

// ─── Validator ────────────────────────────────────────────────────────────────
const Validator = {
  validate({ principal, rate, days }) {
    let valid = true;
    if (!principal || principal <= 0) {
      this.markError(DOM.principal, 'Enter a valid principal amount.');
      valid = false;
    }
    if (!rate || rate <= 0) {
      this.markError(DOM.rate, 'Enter a valid interest rate.');
      valid = false;
    } else if (rate > 500) {
      this.markError(DOM.rate, 'Rate seems unrealistic. Enter a value up to 500%.');
      valid = false;
    }
    if (!days || days <= 0) {
      this.markError(DOM.days, 'Enter a valid number of days.');
      valid = false;
    } else if (days > 3650) {
      // FIX #7: JS now enforces the same 3650-day max that the HTML input specifies
      this.markError(DOM.days, 'Maximum 3,650 days (10 years) supported.');
      valid = false;
    }
    return valid;
  },

  markError(input, message) {
    const wrap = input ? input.closest('.input-wrap') : null;
    if (wrap) wrap.classList.add('error');
    const errEl = document.getElementById(input.id + '-error');
    if (errEl) errEl.textContent = message;
  },

  clearErrors() {
    document.querySelectorAll('.input-wrap.error').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.error-msg[role="alert"]').forEach(el => { el.textContent = ''; });
  }
};

// ─── UI ───────────────────────────────────────────────────────────────────────
const UI = {
  show(el) { if (el) el.classList.remove('hidden'); },
  hide(el) { if (el) el.classList.add('hidden'); },

  animateValue(el, text) {
    if (!el) return;
    el.classList.remove('animating');
    void el.offsetWidth;
    el.textContent = text;
    el.classList.add('animating');
  },

  shake(el) {
    if (!el) return;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'shake 0.4s ease';
    setTimeout(() => { el.style.animation = ''; }, 400);
  },

  setCalculating(on) {
    if (!DOM.calcBtn) return;
    const span = DOM.calcBtn.querySelector('span');
    if (on) {
      DOM.calcBtn.disabled = true;
      DOM.calcBtn.classList.add('calculating');
      if (span) span.textContent = 'Calculating…';
    } else {
      DOM.calcBtn.disabled = false;
      DOM.calcBtn.classList.remove('calculating');
      if (span) span.textContent = 'Calculate';
    }
  },

  renderResults({ principal, dailyInterest, totalInterest, totalAmount,
                  principalPct, interestPct, days, rate, scheduleRows }) {
    UI.show(DOM.resultsEl);

    UI.animateValue(DOM.resPrincipal, Formatters.currency(principal));
    UI.animateValue(DOM.resInterest,  Formatters.currency(totalInterest));
    UI.animateValue(DOM.resTotal,     Formatters.currency(totalAmount));

    // FIX #4: populate the two result cards that were previously left as '—'
    if (DOM.resDays) UI.animateValue(DOM.resDays, days.toLocaleString() + ' days');
    if (DOM.resRate) UI.animateValue(DOM.resRate, rate.toFixed(2) + '% p.a.');

    setTimeout(() => {
      if (DOM.barPrincipal) {
        DOM.barPrincipal.style.width = principalPct.toFixed(2) + '%';
        DOM.barPrincipal.classList.toggle('full', principalPct >= 99.99);
      }
      if (DOM.barInterest) DOM.barInterest.style.width = interestPct.toFixed(2) + '%';
    }, 100);

    if (DOM.pctPrincipal) DOM.pctPrincipal.textContent = principalPct.toFixed(1) + '% principal';
    if (DOM.pctInterest)  DOM.pctInterest.textContent  = interestPct.toFixed(1)  + '% interest';

    // FIX #5: Build the daily schedule table
    UI.renderSchedule(scheduleRows, days, rate);

    setTimeout(() => {
      if (DOM.resultsEl) DOM.resultsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  },

  renderSchedule(rows, days, rate) {
    if (!DOM.scheduleBody || !DOM.scheduleContainer) return;

    // Update meta line
    if (DOM.scheduleMeta) {
      DOM.scheduleMeta.textContent =
        'Showing ' + rows.length.toLocaleString() + ' days at ' + rate.toFixed(2) + '% annual rate';
    }

    // Build table rows (cap at 3650 rows — already validated)
    const fragment = document.createDocumentFragment();
    rows.forEach(({ day, dayInterest, cumulativeInterest, balance }) => {
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + day + '</td>' +
        '<td>' + Formatters.currency(dayInterest, 4) + '</td>' +
        '<td>' + Formatters.currency(cumulativeInterest) + '</td>' +
        '<td>' + Formatters.currency(balance) + '</td>';
      fragment.appendChild(tr);
    });

    DOM.scheduleBody.innerHTML = '';
    DOM.scheduleBody.appendChild(fragment);

    // Show the container
    DOM.scheduleContainer.classList.remove('hidden');
  }
};

// ─── CSV Export ───────────────────────────────────────────────────────────────
// FIX #5: CSV download was wired in HTML but had zero JS implementation
const CSVExport = {
  download() {
    if (!State.lastResult) return;
    const { principal, rate, scheduleRows } = State.lastResult;
    const sym = State.currency;

    let csv = 'Day,Daily Interest (' + sym + '),Total Interest (' + sym + '),Balance (' + sym + ')\n';
    scheduleRows.forEach(({ day, dayInterest, cumulativeInterest, balance }) => {
      csv += day + ',' +
             dayInterest.toFixed(4) + ',' +
             cumulativeInterest.toFixed(2) + ',' +
             balance.toFixed(2) + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'compound-interest-schedule.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};

// ─── Date Helper ──────────────────────────────────────────────────────────────
const DateHelper = {
  init() {
    try {
      const today = new Date().toISOString().split('T')[0];
      if (DOM.endDate) DOM.endDate.value = today;
      const thirtyAgo = new Date();
      thirtyAgo.setDate(thirtyAgo.getDate() - 30);
      if (DOM.startDate) DOM.startDate.value = thirtyAgo.toISOString().split('T')[0];
    } catch (e) {
      console.warn('Date init failed:', e);
    }
  },

  apply() {
    if (!DOM.startDate.value || !DOM.endDate.value) { UI.shake(DOM.applyDates); return; }
    const start = new Date(DOM.startDate.value);
    const end   = new Date(DOM.endDate.value);
    if (end <= start) { UI.shake(DOM.applyDates); if (DOM.endDate) DOM.endDate.focus(); return; }
    const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000);
    if (DOM.days) {
      DOM.days.value = diffDays;
      DOM.days.dispatchEvent(new Event('input'));
    }
    const btn = DOM.applyDates;
    if (btn) {
      btn.textContent = '✓ Applied';
      setTimeout(() => { btn.textContent = 'Apply'; }, 1500);
    }
  }
};

// ─── Event Bindings ───────────────────────────────────────────────────────────
function bindAll() {

  // Days Input Mode Toggle (Enter Days ↔ Date Range)
  document.querySelectorAll('.days-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.panel;
      document.querySelectorAll('.days-mode-btn').forEach(b => {
        const isActive = b.dataset.panel === target;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      document.querySelectorAll('.days-panel').forEach(panel => {
        panel.classList.toggle('hidden', panel.id !== 'panel-' + target);
      });
    });
  });

  // When date range Apply is clicked → switch back to 'Enter Days' panel
  if (DOM.applyDates) {
    DOM.applyDates.addEventListener('click', () => {
      setTimeout(() => {
        document.querySelectorAll('.days-mode-btn').forEach(b => {
          const isManual = b.dataset.panel === 'manual';
          b.classList.toggle('active', isManual);
          b.setAttribute('aria-selected', isManual ? 'true' : 'false');
        });
        document.querySelectorAll('.days-panel').forEach(p => {
          p.classList.toggle('hidden', p.id !== 'panel-manual');
        });
      }, 200);
    });
  }

  // Currency change
  if (DOM.currency) {
    DOM.currency.addEventListener('change', () => {
      const opt = DOM.currency.options[DOM.currency.selectedIndex];
      State.currency = DOM.currency.value;
      State.locale   = opt.dataset.locale || 'en-IN';
      if (DOM.currSymbol) DOM.currSymbol.textContent = opt.dataset.symbol || '';
      UI.hide(DOM.resultsEl);
      if (DOM.principal && DOM.principal.value) Calculator.run();
    });
  }

  // Calculate button + Enter key
  if (DOM.calcBtn) DOM.calcBtn.addEventListener('click', () => Calculator.run());
  [DOM.principal, DOM.rate, DOM.days].forEach(el => {
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') Calculator.run(); });
  });

  // Reset
  if (DOM.resetBtn) {
    DOM.resetBtn.addEventListener('click', () => {
      [DOM.principal, DOM.rate, DOM.days, DOM.startDate, DOM.endDate].forEach(el => {
        if (el) el.value = '';
      });
      if (DOM.freq) DOM.freq.selectedIndex = DOM.freq.options.length - 1; // reset to Daily
      if (DOM.barPrincipal) DOM.barPrincipal.style.width = '0%';
      if (DOM.barInterest)  DOM.barInterest.style.width  = '0%';
      if (DOM.scheduleBody) DOM.scheduleBody.innerHTML   = '';
      if (DOM.scheduleContainer) DOM.scheduleContainer.classList.add('hidden');
      State.lastResult = null;
      Validator.clearErrors();
      UI.hide(DOM.resultsEl);
      if (DOM.principal) DOM.principal.focus();
    });
  }

  // Date range apply
  if (DOM.applyDates) DOM.applyDates.addEventListener('click', () => DateHelper.apply());

  // FIX #5: CSV download handler — was completely missing
  if (DOM.downloadCsv) DOM.downloadCsv.addEventListener('click', () => CSVExport.download());

  // Live error clear on input
  [DOM.principal, DOM.rate, DOM.days].forEach(el => {
    if (!el) return;
    el.addEventListener('input', () => {
      const wrap = el.closest('.input-wrap');
      if (wrap) wrap.classList.remove('error');
      const errEl = document.getElementById(el.id + '-error');
      if (errEl) errEl.textContent = '';
    });
  });

  // Clear date fields when days is manually typed
  if (DOM.days) {
    DOM.days.addEventListener('input', () => {
      if (DOM.startDate) DOM.startDate.value = '';
      if (DOM.endDate)   DOM.endDate.value   = '';
    });
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initDOM();
  DateHelper.init();
  bindAll();
});
