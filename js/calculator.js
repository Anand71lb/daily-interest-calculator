/* ============================================
   DAILY INTEREST CALCULATOR — calculator.js
   Modular, accessible, error-handled
   ============================================ */
'use strict';

// ─── State ────────────────────────────────────────────────────────────────────
const State = {
  mode: 'simple',
  currency: 'INR',
  locale: 'en-IN'
};

// ─── DOM References ───────────────────────────────────────────────────────────
const DOM = {};
function initDOM() {
  DOM.calcBtn            = document.getElementById('calc-btn');
  DOM.resetBtn           = document.getElementById('reset-btn');
  DOM.resultsEl          = document.getElementById('results');
  DOM.principal          = document.getElementById('principal');
  DOM.rate               = document.getElementById('rate');
  DOM.days               = document.getElementById('days');
  DOM.currency           = document.getElementById('currency');
  DOM.currSymbol         = document.getElementById('currency-symbol');
  DOM.resPrincipal       = document.getElementById('res-principal');
  DOM.resInterest        = document.getElementById('res-interest');
  DOM.resTotal           = document.getElementById('res-total');
  DOM.resDays            = document.getElementById('res-days');
  DOM.resRate            = document.getElementById('res-rate');
  DOM.barPrincipal       = document.getElementById('bar-principal');
  DOM.barInterest        = document.getElementById('bar-interest');
  DOM.pctPrincipal       = document.getElementById('pct-principal');
  DOM.pctInterest        = document.getElementById('pct-interest');
  DOM.scheduleContainer  = document.getElementById('detailed-schedule-container');
  DOM.scheduleBody       = document.getElementById('schedule-body');
  DOM.scheduleMeta       = document.getElementById('schedule-meta');
  DOM.downloadCsvBtn     = document.getElementById('download-csv');
  // BUG FIX 2 & 5: grab date range DOM refs that were missing
  DOM.startDate          = document.getElementById('start-date');
  DOM.endDate            = document.getElementById('end-date');
  DOM.applyDates         = document.getElementById('apply-dates');
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
  simple(principal, rate, days) {
    const years         = days / 365;
    const totalInterest = principal * (rate / 100) * years;
    const totalAmount   = principal + totalInterest;
    const dailyInterest = totalInterest / days;
    return { totalAmount, totalInterest, dailyInterest };
  },

  compound(principal, rate, days, freq) {
    const years         = days / 365;
    const totalAmount   = principal * Math.pow(1 + (rate / 100) / freq, freq * years);
    const totalInterest = totalAmount - principal;
    const dailyInterest = totalInterest / days;
    return { totalAmount, totalInterest, dailyInterest };
  },

  run() {
    Validator.clearErrors();

    const principal = parseFloat(DOM.principal.value);
    const rate      = parseFloat(DOM.rate.value);
    const days      = parseInt(DOM.days.value, 10);
    const freq      = 365; // Simple interest page — freq not used; kept for compound compatibility

    if (!Validator.validate({ principal, rate, days })) {
      UI.shake(DOM.calcBtn);
      return;
    }

    UI.setCalculating(true);

    setTimeout(() => {
      let result;
      try {
        result = Calculator.simple(principal, rate, days);
      } catch (err) {
        console.error('Calculation error:', err);
        UI.setCalculating(false);
        return;
      }

      const { totalAmount, totalInterest, dailyInterest } = result;
      const principalPct = (principal / totalAmount) * 100;
      const interestPct  = (totalInterest / totalAmount) * 100;
      const schedule     = Calculator.generateSchedule(principal, rate, days, 'simple');

      UI.renderResults({
        principal, dailyInterest, totalInterest, totalAmount,
        principalPct, interestPct, schedule, rate, days
      });

      UI.setCalculating(false);
    }, 0);
  },

  generateSchedule(principal, annualRate, totalDays, mode) {
    const data      = [];
    const dailyRate = (annualRate / 100) / 365;
    let balance     = principal;

    // Adaptive granularity: daily ≤60 days, weekly ≤365, monthly otherwise
    let interval = 1;
    if (totalDays > 60)  interval = 7;
    if (totalDays > 365) interval = 30;

    let periodInterest = 0;

    for (let d = 1; d <= totalDays; d++) {
      const dailyInterest = mode === 'simple'
        ? principal * dailyRate
        : balance   * dailyRate;

      balance        += dailyInterest;
      periodInterest += dailyInterest;

      if (d % interval === 0 || d === totalDays) {
        data.push({
          day:           d,
          interest:      periodInterest,
          totalInterest: balance - principal,
          balance:       balance
        });
        periodInterest = 0;
      }
    }
    return data;
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
    // BUG FIX 6: enforce JS max to match HTML max attribute
    } else if (days > 3650) {
      this.markError(DOM.days, 'Maximum supported duration is 3,650 days (10 years).');
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

// ─── DateHelper ───────────────────────────────────────────────────────────────
// BUG FIX 3: DateHelper was referenced but never defined — now implemented
const DateHelper = {
  init() {
    try {
      const today    = new Date().toISOString().split('T')[0];
      const thirtyAgo = new Date();
      thirtyAgo.setDate(thirtyAgo.getDate() - 30);
      if (DOM.endDate)   DOM.endDate.value   = today;
      if (DOM.startDate) DOM.startDate.value = thirtyAgo.toISOString().split('T')[0];
    } catch (e) {
      console.warn('DateHelper.init failed:', e);
    }
  },

  apply() {
    if (!DOM.startDate || !DOM.endDate) return;
    if (!DOM.startDate.value || !DOM.endDate.value) {
      UI.shake(DOM.applyDates);
      return;
    }
    const start = new Date(DOM.startDate.value);
    const end   = new Date(DOM.endDate.value);
    if (end <= start) {
      UI.shake(DOM.applyDates);
      if (DOM.endDate) DOM.endDate.focus();
      return;
    }
    const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000);
    if (DOM.days) {
      DOM.days.value = diffDays;
      DOM.days.dispatchEvent(new Event('input'));
    }
    // Switch back to manual panel so user sees the populated days value
    DaysPanelToggle.activate('manual');

    const btn = DOM.applyDates;
    if (btn) {
      btn.textContent = '✓ Applied';
      setTimeout(() => { btn.textContent = 'Apply'; }, 1500);
    }
  }
};

// ─── Days Panel Toggle ────────────────────────────────────────────────────────
const DaysPanelToggle = {
  activate(panelId) {
    document.querySelectorAll('.days-mode-btn').forEach(b => {
      const isTarget = b.dataset.panel === panelId;
      b.classList.toggle('active', isTarget);
      b.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });
    document.querySelectorAll('.days-panel').forEach(p => {
      p.classList.toggle('hidden', p.id !== 'panel-' + panelId);
    });
  }
};

// ─── UI ───────────────────────────────────────────────────────────────────────
const UI = {
  show(el) { if (el) el.classList.remove('hidden'); },
  hide(el) { if (el) el.classList.add('hidden'); },

  animateValue(el, text) {
    if (!el) return;
    el.classList.remove('animating');
    void el.offsetWidth; // trigger reflow
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

  renderResults({ principal, dailyInterest, totalInterest, totalAmount, principalPct, interestPct, schedule, rate, days }) {
    UI.show(DOM.resultsEl);

    UI.animateValue(DOM.resPrincipal, Formatters.currency(principal));
    UI.animateValue(DOM.resInterest,  Formatters.currency(totalInterest));
    UI.animateValue(DOM.resTotal,     Formatters.currency(totalAmount));
    if (DOM.resDays) UI.animateValue(DOM.resDays, days + ' days');
    if (DOM.resRate) UI.animateValue(DOM.resRate, Formatters.percent(rate) + ' p.a.');

    setTimeout(() => {
      if (DOM.barPrincipal) {
        DOM.barPrincipal.style.width = principalPct.toFixed(2) + '%';
        DOM.barPrincipal.classList.toggle('full', principalPct >= 99.99);
      }
      if (DOM.barInterest) DOM.barInterest.style.width = interestPct.toFixed(2) + '%';
    }, 100);

    if (DOM.pctPrincipal) DOM.pctPrincipal.textContent = principalPct.toFixed(1) + '% principal';
    if (DOM.pctInterest)  DOM.pctInterest.textContent  = interestPct.toFixed(1) + '% interest';

    // Populate Detailed Schedule
    if (schedule && DOM.scheduleBody) {
      UI.show(DOM.scheduleContainer);

      const sumOfInterest    = schedule.reduce((sum, row) => sum + row.interest, 0);
      const lastTotalInterest = schedule.length ? schedule[schedule.length - 1].totalInterest : 0;
      const lastBalance       = schedule.length ? schedule[schedule.length - 1].balance : 0;

      DOM.scheduleBody.innerHTML = schedule.map(row => `
        <tr>
          <td>Day ${row.day}</td>
          <td>${Formatters.currency(row.interest)}</td>
          <td>${Formatters.currency(row.totalInterest)}</td>
          <td>${Formatters.currency(row.balance)}</td>
        </tr>
      `).join('') + `
        <tr style="font-weight:600; background:var(--surface2);">
          <td>Total</td>
          <td>${Formatters.currency(sumOfInterest)}</td>
          <td>${Formatters.currency(lastTotalInterest)}</td>
          <td>${Formatters.currency(lastBalance)}</td>
        </tr>
      `;

      if (DOM.scheduleMeta) {
        const lastDay = schedule.length ? schedule[schedule.length - 1].day : 0;
        DOM.scheduleMeta.textContent = `Showing ${schedule.length} data points over ${lastDay} days`;
      }

      // CSV download
      if (DOM.downloadCsvBtn) {
        DOM.downloadCsvBtn.onclick = () => {
          const headers    = ['Day', 'Interest', 'Total Interest', 'Balance'];
          const csvContent = [
            headers.join(','),
            ...schedule.map(row =>
              `${row.day},${row.interest.toFixed(2)},${row.totalInterest.toFixed(2)},${row.balance.toFixed(2)}`
            ),
            `Total,${sumOfInterest.toFixed(2)},${lastTotalInterest.toFixed(2)},${lastBalance.toFixed(2)}`
          ].join('\n');

          const blob = new Blob([csvContent], { type: 'text/csv' });
          const url  = window.URL.createObjectURL(blob);
          const a    = document.createElement('a');
          a.setAttribute('hidden', '');
          a.setAttribute('href', url);
          a.setAttribute('download', `interest_schedule_${Date.now()}.csv`);
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        };
      }
    }

    setTimeout(() => {
      if (DOM.resultsEl) DOM.resultsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }
};

// ─── Event Bindings ───────────────────────────────────────────────────────────
function bindAll() {
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

  // Calculate button + Enter key on inputs
  if (DOM.calcBtn) DOM.calcBtn.addEventListener('click', () => Calculator.run());
  [DOM.principal, DOM.rate, DOM.days].forEach(el => {
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') Calculator.run(); });
  });

  // BUG FIX 4: days-mode-btn tab toggle — was completely missing from bindAll
  document.querySelectorAll('.days-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => DaysPanelToggle.activate(btn.dataset.panel));
  });

  // Keyboard nav for tablist (ArrowLeft / ArrowRight)
  const tabList = document.querySelector('.days-mode-toggle');
  if (tabList) {
    tabList.addEventListener('keydown', e => {
      const tabs = [...tabList.querySelectorAll('.days-mode-btn')];
      const idx  = tabs.indexOf(document.activeElement);
      if (idx === -1) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const next = tabs[(idx + 1) % tabs.length];
        DaysPanelToggle.activate(next.dataset.panel);
        next.focus();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
        DaysPanelToggle.activate(prev.dataset.panel);
        prev.focus();
      }
    });
  }

  // BUG FIX 2 & 3: date range Apply button — was never bound, DateHelper was never defined
  if (DOM.applyDates) {
    DOM.applyDates.addEventListener('click', () => DateHelper.apply());
  }

  // Reset
  // BUG FIX 1: was clearing days then immediately setting it back to '365'
  // Now clears all inputs cleanly and leaves days blank
  if (DOM.resetBtn) {
    DOM.resetBtn.addEventListener('click', () => {
      if (DOM.principal) DOM.principal.value = '';
      if (DOM.rate)      DOM.rate.value      = '';
      if (DOM.days)      DOM.days.value      = '';
      if (DOM.startDate) DOM.startDate.value = '';
      if (DOM.endDate)   DOM.endDate.value   = '';

      if (DOM.barPrincipal) DOM.barPrincipal.style.width = '0%';
      if (DOM.barInterest)  DOM.barInterest.style.width  = '0%';

      DaysPanelToggle.activate('manual');
      Validator.clearErrors();
      UI.hide(DOM.resultsEl);
      if (DOM.principal) DOM.principal.focus();
    });
  }

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
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initDOM();
  DateHelper.init();
  bindAll();
});
