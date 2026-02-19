/* ============================================
   DAILY INTEREST CALCULATOR — script.js
   ============================================ */

// ─── State ───────────────────────────────────────────────────────────────────
let mode = 'simple'; // 'simple' | 'compound'
let currentCurrency = 'INR';
let currentLocale = 'en-IN';

// ─── Elements ────────────────────────────────────────────────────────────────
const modeBtns = document.querySelectorAll('.mode-btn');
const compoundOnly = document.querySelectorAll('.compound-only');
const calcBtn = document.getElementById('calc-btn');
const resetBtn = document.getElementById('reset-btn');
const resultsEl = document.getElementById('results');
const applyDates = document.getElementById('apply-dates');

const inputPrincipal = document.getElementById('principal');
const inputRate = document.getElementById('rate');
const inputDays = document.getElementById('days');
const inputFreq = document.getElementById('freq');
const inputStart = document.getElementById('start-date');
const inputCurrency = document.getElementById('currency');
const currencySymbol = document.getElementById('currency-symbol');
const inputEnd = document.getElementById('end-date');

// Result elements
const resDaily = document.getElementById('res-daily');
const resInterest = document.getElementById('res-interest');
const resTotal = document.getElementById('res-total');
const resEffRate = document.getElementById('res-eff-rate');
const barPrincipal = document.getElementById('bar-principal');
const barInterest = document.getElementById('bar-interest');
const pctPrincipal = document.getElementById('pct-principal');
const pctInterest = document.getElementById('pct-interest');
const bvDay = document.getElementById('bv-day');
const bvWeek = document.getElementById('bv-week');
const bvMonth = document.getElementById('bv-month');
const bvYear = document.getElementById('bv-year');

// ─── Formatters ───────────────────────────────────────────────────────────────
function formatCurrency(val, decimals = 2) {
  return val.toLocaleString(currentLocale, {
    style: 'currency',
    currency: currentCurrency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

// ─── Currency Selection ────────────────────────────────────────────────────────
inputCurrency.addEventListener('change', () => {
  const selectedOption = inputCurrency.options[inputCurrency.selectedIndex];
  currentCurrency = inputCurrency.value;
  currentLocale = selectedOption.dataset.locale;
  currencySymbol.textContent = selectedOption.dataset.symbol;

  // Clear results and refocus principal for new input style
  hideResults();
  if (inputPrincipal.value) calculate(); // Recalculate if values exist
});

function formatPct(val, decimals = 4) {
  return val.toFixed(decimals) + '%';
}

// ─── Mode Toggle ─────────────────────────────────────────────────────────────
modeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    modeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    mode = btn.dataset.mode;

    compoundOnly.forEach(el => {
      el.classList.toggle('hidden', mode !== 'compound');
    });

    // Clear results when mode changes
    hideResults();
  });
});

// ─── Date Range Apply ─────────────────────────────────────────────────────────
applyDates.addEventListener('click', () => {
  const start = new Date(inputStart.value);
  const end = new Date(inputEnd.value);

  if (!inputStart.value || !inputEnd.value) {
    shakeElement(applyDates);
    return;
  }

  if (end <= start) {
    shakeElement(applyDates);
    inputEnd.focus();
    return;
  }

  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  inputDays.value = diffDays;
  inputDays.dispatchEvent(new Event('input'));

  // Flash feedback
  applyDates.textContent = '✓ Applied';
  setTimeout(() => { applyDates.textContent = 'Apply'; }, 1500);
});

// ─── Calculate ────────────────────────────────────────────────────────────────
calcBtn.addEventListener('click', calculate);

// Also calculate on Enter key
[inputPrincipal, inputRate, inputDays].forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') calculate(); });
});

function calculate() {
  clearErrors();

  const principal = parseFloat(inputPrincipal.value);
  const rate = parseFloat(inputRate.value);
  const days = parseInt(inputDays.value, 10);
  const freq = parseInt(inputFreq.value, 10); // compounding periods/year

  // Validate
  let valid = true;
  if (!principal || principal <= 0) { markError(inputPrincipal); valid = false; }
  if (!rate || rate <= 0) { markError(inputRate); valid = false; }
  if (!days || days <= 0) { markError(inputDays); valid = false; }

  if (!valid) {
    shakeElement(calcBtn);
    return;
  }

  // ─── Core Math ──────────────────────────────────────────────────────────────
  let totalAmount, totalInterest, dailyInterest;

  if (mode === 'simple') {
    // Simple Interest: I = P × r × t   (t in years = days/365)
    const years = days / 365;
    totalInterest = principal * (rate / 100) * years;
    totalAmount = principal + totalInterest;
    dailyInterest = totalInterest / days;

  } else {
    // Compound Interest: A = P × (1 + r/n)^(n×t)
    const years = days / 365;
    totalAmount = principal * Math.pow(1 + (rate / 100) / freq, freq * years);
    totalInterest = totalAmount - principal;
    dailyInterest = totalInterest / days;
  }

  // Effective daily rate
  const effectiveDailyRate = (dailyInterest / principal) * 100;

  // ─── Proportions ────────────────────────────────────────────────────────────
  const principalPct = (principal / totalAmount) * 100;
  const interestPct = (totalInterest / totalAmount) * 100;

  // ─── Render ─────────────────────────────────────────────────────────────────
  showResults();

  animateValue(resDaily, formatCurrency(dailyInterest, 4));
  animateValue(resInterest, formatCurrency(totalInterest));
  animateValue(resTotal, formatCurrency(totalAmount));
  animateValue(resEffRate, formatPct(effectiveDailyRate, 6));

  // Bar
  setTimeout(() => {
    barPrincipal.style.width = principalPct.toFixed(2) + '%';
    barInterest.style.width = interestPct.toFixed(2) + '%';
  }, 100);

  pctPrincipal.textContent = principalPct.toFixed(1) + '% principal';
  pctInterest.textContent = interestPct.toFixed(1) + '% interest';

  // Breakdown
  bvDay.textContent = formatCurrency(dailyInterest, 4);
  bvWeek.textContent = formatCurrency(dailyInterest * 7);
  bvMonth.textContent = formatCurrency(dailyInterest * 30);
  bvYear.textContent = formatCurrency(dailyInterest * 365);

  // Scroll into view
  setTimeout(() => {
    resultsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 100);
}

// ─── Reset ────────────────────────────────────────────────────────────────────
resetBtn.addEventListener('click', () => {
  inputPrincipal.value = '';
  inputRate.value = '';
  inputDays.value = '';
  inputStart.value = '';
  inputEnd.value = '';
  inputFreq.value = '365';

  barPrincipal.style.width = '0%';
  barInterest.style.width = '0%';

  clearErrors();
  hideResults();
  inputPrincipal.focus();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function showResults() {
  resultsEl.classList.remove('hidden');
}

function hideResults() {
  resultsEl.classList.add('hidden');
}

function animateValue(el, newText) {
  el.classList.remove('animating');
  void el.offsetWidth; // reflow
  el.textContent = newText;
  el.classList.add('animating');
}

function markError(input) {
  const wrap = input.closest('.input-wrap');
  if (wrap) wrap.classList.add('error');
}

function clearErrors() {
  document.querySelectorAll('.input-wrap.error').forEach(el => {
    el.classList.remove('error');
  });
}

function shakeElement(el) {
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = 'shake 0.4s ease';
  setTimeout(() => { el.style.animation = ''; }, 400);
}

// ─── Shake animation (injected dynamically) ───────────────────────────────────
const style = document.createElement('style');
style.textContent = `
@keyframes shake {
  0%,100% { transform: translateX(0); }
  20%      { transform: translateX(-8px); }
  40%      { transform: translateX(8px); }
  60%      { transform: translateX(-6px); }
  80%      { transform: translateX(6px); }
}
`;
document.head.appendChild(style);

// ─── Live input: remove error on change ──────────────────────────────────────
[inputPrincipal, inputRate, inputDays].forEach(el => {
  el.addEventListener('input', () => {
    const wrap = el.closest('.input-wrap');
    if (wrap) wrap.classList.remove('error');
  });
});

// ─── Breakdown tabs (visual only — values already shown) ─────────────────────
document.querySelectorAll('.btab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.btab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    // Highlight the matching bval
    const period = tab.dataset.period;
    document.querySelectorAll('.bval').forEach(bv => bv.style.opacity = '0.5');
    const target = document.getElementById('bv-' + period);
    if (target) {
      target.closest('.bval').style.opacity = '1';
      target.closest('.bval').style.outline = '1px solid var(--accent)';
      setTimeout(() => {
        target.closest('.bval').style.outline = '';
        document.querySelectorAll('.bval').forEach(bv => bv.style.opacity = '1');
      }, 800);
    }
  });
});

// ─── Set today's date as default for end date ─────────────────────────────────
(function initDates() {
  const today = new Date().toISOString().split('T')[0];
  inputEnd.value = today;

  // Set start to 30 days ago by default
  const thirtyAgo = new Date();
  thirtyAgo.setDate(thirtyAgo.getDate() - 30);
  inputStart.value = thirtyAgo.toISOString().split('T')[0];
})();