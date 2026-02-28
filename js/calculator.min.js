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
  DOM.modeBtns = document.querySelectorAll('.mode-btn');
  DOM.compoundOnly = document.querySelectorAll('.compound-only');
  DOM.calcBtn = document.getElementById('calc-btn');
  DOM.resetBtn = document.getElementById('reset-btn');
  DOM.resultsEl = document.getElementById('results');
  DOM.applyDates = document.getElementById('apply-dates');
  DOM.principal = document.getElementById('principal');
  DOM.rate = document.getElementById('rate');
  DOM.days = document.getElementById('days');
  DOM.freq = document.getElementById('freq');
  DOM.startDate = document.getElementById('start-date');
  DOM.endDate = document.getElementById('end-date');
  DOM.currency = document.getElementById('currency');
  DOM.currSymbol = document.getElementById('currency-symbol');
  DOM.resPrincipal = document.getElementById('res-principal');
  DOM.resInterest = document.getElementById('res-interest');
  DOM.resTotal = document.getElementById('res-total');
  DOM.barPrincipal = document.getElementById('bar-principal');
  DOM.barInterest = document.getElementById('bar-interest');
  DOM.pctPrincipal = document.getElementById('pct-principal');
  DOM.pctInterest = document.getElementById('pct-interest');
  DOM.bvDay = document.getElementById('bv-day');
  DOM.bvWeek = document.getElementById('bv-week');
  DOM.bvMonth = document.getElementById('bv-month');
  DOM.bvYear = document.getElementById('bv-year');
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
  percent(val, decimals = 4) {
    return val.toFixed(decimals) + '%';
  }
};

// ─── Calculator ────────────────────────────────────────────────────────────────
const Calculator = {
  simple(principal, rate, days) {
    const years = days / 365;
    const totalInterest = principal * (rate / 100) * years;
    const totalAmount = principal + totalInterest;
    const dailyInterest = totalInterest / days;
    return { totalAmount, totalInterest, dailyInterest };
  },

  compound(principal, rate, days, freq) {
    const years = days / 365;
    const totalAmount = principal * Math.pow(1 + (rate / 100) / freq, freq * years);
    const totalInterest = totalAmount - principal;
    const dailyInterest = totalInterest / days;
    return { totalAmount, totalInterest, dailyInterest };
  },

  run() {
    Validator.clearErrors();

    const principal = parseFloat(DOM.principal.value);
    const rate = parseFloat(DOM.rate.value);
    const days = parseInt(DOM.days.value, 10);
    const freq = parseInt(DOM.freq.value, 10);

    if (!Validator.validate({ principal, rate, days })) {
      UI.shake(DOM.calcBtn);
      return;
    }

    // Issue 9: Show calculating state
    UI.setCalculating(true);

    // Defer calculation one tick so the UI update renders first
    setTimeout(() => {
      let result;
      try {
        result = State.mode === 'simple'
          ? Calculator.simple(principal, rate, days)
          : Calculator.compound(principal, rate, days, freq);
      } catch (err) {
        console.error('Calculation error:', err);
        UI.setCalculating(false);
        return;
      }

      const { totalAmount, totalInterest, dailyInterest } = result;
      const effectiveDailyRate = (dailyInterest / principal) * 100;
      const principalPct = (principal / totalAmount) * 100;
      const interestPct = (totalInterest / totalAmount) * 100;

      UI.renderResults({
        principal, dailyInterest, totalInterest, totalAmount,
        principalPct, interestPct
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
    document.querySelectorAll('.input-wrap.error').forEach(el => {
      el.classList.remove('error');
    });
    document.querySelectorAll('.error-msg[role="alert"]').forEach(el => {
      el.textContent = '';
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

  // Issue 9: Button calculating state
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

  renderResults({ principal, dailyInterest, totalInterest, totalAmount, principalPct, interestPct }) {
    UI.show(DOM.resultsEl);

    UI.animateValue(DOM.resPrincipal, Formatters.currency(principal));
    UI.animateValue(DOM.resInterest, Formatters.currency(totalInterest));
    UI.animateValue(DOM.resTotal, Formatters.currency(totalAmount));

    setTimeout(() => {
      if (DOM.barPrincipal) {
        DOM.barPrincipal.style.width = principalPct.toFixed(2) + '%';
        DOM.barPrincipal.classList.toggle('full', principalPct >= 99.99);
      }
      if (DOM.barInterest) DOM.barInterest.style.width = interestPct.toFixed(2) + '%';
    }, 100);

    if (DOM.pctPrincipal) DOM.pctPrincipal.textContent = principalPct.toFixed(1) + '% principal';
    if (DOM.pctInterest) DOM.pctInterest.textContent = interestPct.toFixed(1) + '% interest';

    if (DOM.bvDay) DOM.bvDay.textContent = Formatters.currency(dailyInterest, 4);
    if (DOM.bvWeek) DOM.bvWeek.textContent = Formatters.currency(dailyInterest * 7);
    if (DOM.bvMonth) DOM.bvMonth.textContent = Formatters.currency(dailyInterest * 30);
    if (DOM.bvYear) DOM.bvYear.textContent = Formatters.currency(dailyInterest * 365);

    setTimeout(() => {
      if (DOM.resultsEl) DOM.resultsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
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
    if (!DOM.startDate.value || !DOM.endDate.value) {
      UI.shake(DOM.applyDates);
      return;
    }
    const start = new Date(DOM.startDate.value);
    const end = new Date(DOM.endDate.value);
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
    const btn = DOM.applyDates;
    if (btn) {
      btn.textContent = '✓ Applied';
      setTimeout(() => { btn.textContent = 'Apply'; }, 1500);
    }
  }
};

// ─── Slider Sync (Removed - Replaced by plain input) ────────────

// ─── Event Bindings ───────────────────────────────────────────────────────────
function bindAll() {
  // Mode toggle (Simple/Compound)
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.mode = btn.dataset.mode;
      document.querySelectorAll('.compound-only').forEach(el => {
        el.classList.toggle('hidden', State.mode !== 'compound');
      });
      UI.hide(DOM.resultsEl);
    });
  });

  // ── Days Input Mode Toggle (Enter Days ↔ Date Range) ──
  document.querySelectorAll('.days-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.panel;
      // Update button states
      document.querySelectorAll('.days-mode-btn').forEach(b => {
        const isActive = b.dataset.panel === target;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      // Show/hide panels
      document.querySelectorAll('.days-panel').forEach(panel => {
        panel.classList.toggle('hidden', panel.id !== 'panel-' + target);
      });
    });
  });

  // When date range Apply is clicked → switch back to 'Enter Days' panel
  const origApply = DOM.applyDates;
  if (origApply) {
    origApply.addEventListener('click', () => {
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
      State.locale = opt.dataset.locale || 'en-IN';
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
      if (DOM.freq) {
        DOM.freq.value = '365';
        // Visually reset to 'Daily' — find the option with value 365 and select it
        for (let i = 0; i < DOM.freq.options.length; i++) {
          if (DOM.freq.options[i].value === '365') {
            DOM.freq.selectedIndex = i;
            break;
          }
        }
      }
      if (DOM.barPrincipal) DOM.barPrincipal.style.width = '0%';
      if (DOM.barInterest) DOM.barInterest.style.width = '0%';
      if (DOM.days) DOM.days.value = '365';

      const datePreset = document.getElementById('date-preset');
      const customRow = document.getElementById('date-custom-row');
      if (datePreset) datePreset.selectedIndex = 0;
      if (customRow) customRow.classList.add('hidden');

      Validator.clearErrors();
      UI.hide(DOM.resultsEl);
      if (DOM.principal) DOM.principal.focus();
    });
  }

  // Date range apply (custom mode)
  if (DOM.applyDates) DOM.applyDates.addEventListener('click', () => DateHelper.apply());

  // Date-range preset dropdown
  const datePreset = document.getElementById('date-preset');
  const customRow = document.getElementById('date-custom-row');
  if (datePreset) {
    datePreset.addEventListener('change', () => {
      const val = datePreset.value;
      if (val === 'custom') {
        // Show the manual date pickers
        if (customRow) customRow.classList.remove('hidden');
      } else {
        // Hide custom pickers, set days directly
        if (customRow) customRow.classList.add('hidden');
        const days = parseInt(val, 10);
        if (!isNaN(days) && days > 0) {
          // Compute actual start/end dates for reference (stores in DOM)
          const end = new Date();
          const start = new Date();
          start.setDate(start.getDate() - days);
          if (DOM.endDate) DOM.endDate.value = end.toISOString().split('T')[0];
          if (DOM.startDate) DOM.startDate.value = start.toISOString().split('T')[0];
          // Set days field and slider
          if (DOM.days) {
            DOM.days.value = days;
            DOM.days.dispatchEvent(new Event('input'));
          }
          // Switch back to 'Enter Days' panel so user sees the updated value
          setTimeout(() => {
            document.querySelectorAll('.days-mode-btn').forEach(b => {
              const isManual = b.dataset.panel === 'manual';
              b.classList.toggle('active', isManual);
              b.setAttribute('aria-selected', isManual ? 'true' : 'false');
            });
            document.querySelectorAll('.days-panel').forEach(p => {
              p.classList.toggle('hidden', p.id !== 'panel-manual');
            });
            // Reset the dropdown back to placeholder so it's ready for next pick
            datePreset.selectedIndex = 0;
          }, 150);
        }
      }
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

  // Issue 8: Clear date fields when days is manually typed
  if (DOM.days) {
    DOM.days.addEventListener('input', () => {
      if (DOM.startDate) DOM.startDate.value = '';
      if (DOM.endDate) DOM.endDate.value = '';
    });
  }

  // Breakdown tabs
  document.querySelectorAll('.btab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.btab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const period = tab.dataset.period;
      document.querySelectorAll('.bval').forEach(bv => { bv.style.opacity = '0.5'; });
      const target = document.getElementById('bv-' + period);
      if (target) {
        const card = target.closest('.bval');
        if (card) {
          card.style.opacity = '1';
          card.style.outline = '1px solid var(--accent)';
          setTimeout(() => {
            card.style.outline = '';
            document.querySelectorAll('.bval').forEach(bv => { bv.style.opacity = '1'; });
          }, 800);
        }
      }
    });
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initDOM();
  DateHelper.init();
  bindAll();
});