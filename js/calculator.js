/**
 * Daily Interest Calculator
 * - Daily Deposit Calculator (Average Days Method)
 */

(function () {
    'use strict';

    // Configuration
    const CONFIG = {
        daysInYear: 365,
        maxDailyAmount: 1000000,
        maxPrincipal: 100000000,
        maxRate: 100,
        maxDays: 36500,
        maxYears: 100,
        decimalPlaces: 2
    };

    // DOM Elements for Daily Deposit Calculator
    const ddElements = {
        dailyInput: null,
        daysInput: null,
        rateInput: null,
        calculateBtn: null,
        depositedDisplay: null,
        interestDisplay: null,
        totalDisplay: null,
        // Breakdown elements
        valDaily: null,
        valDays: null,
        valRate: null,
        valTotalDep: null,
        valTotalDays: null,
        valTotalInt: null,
        valMaturity: null,
        // Date elements
        startInput: null,
        endInput: null,
        // Tab elements
        modeRadios: null,
        sectionDates: null,
        sectionDays: null
    };



    // Panel elements
    const panelElements = {
        ddPanel: null,
        ddBreakdown: null
    };

    /**
     * Initialize all calculators
     */
    function init() {
        try {
            cacheDOMElements();

            if (!validateCriticalElements()) {
                console.error('Critical calculator elements not found');
                return;
            }

            attachEventListeners();
            setDefaultDates();

            // Initial calculations
            calculateDailyDeposit();

            console.log('Multi-Calculator initialized successfully');
        } catch (error) {
            console.error('Initialization error:', error);
        }
    }

    /**
     * Cache all DOM elements
     */
    function cacheDOMElements() {
        // Daily Deposit Calculator Elements
        ddElements.dailyInput = document.getElementById('principal');
        ddElements.daysInput = document.getElementById('days');
        ddElements.rateInput = document.getElementById('rate');
        ddElements.calculateBtn = document.getElementById('calculate-btn');
        ddElements.depositedDisplay = document.getElementById('deposited-value');
        ddElements.interestDisplay = document.getElementById('interest-value');
        ddElements.totalDisplay = document.getElementById('total-value');
        ddElements.startInput = document.getElementById('start-date');
        ddElements.endInput = document.getElementById('end-date');
        ddElements.modeRadios = document.querySelectorAll('input[name="input-mode"]');
        ddElements.calculateBtn = document.getElementById('calculate-btn');
        ddElements.scheduleSection = document.getElementById('schedule-section');
        ddElements.scheduleBody = document.getElementById('schedule-body');
        ddElements.exportBtn = document.getElementById('export-csv-btn');
        ddElements.pdfBtn = document.getElementById('export-pdf-btn');
        ddElements.sectionDates = document.getElementById('section-dates');

        // Panel Elements
        panelElements.ddPanel = document.getElementById('interest-form');
    }

    /**
     * Validate critical elements exist
     */
    function validateCriticalElements() {
        // Check at least one calculator has required elements
        const ddValid = ddElements.dailyInput && ddElements.daysInput && ddElements.rateInput;

        return ddValid;
    }

    /**
     * Attach all event listeners
     */
    function attachEventListeners() {
        // Daily Deposit Calculator
        attachDailyDepositListeners();
    }

    /**
     * Attach Daily Deposit calculator listeners
     */
    function attachDailyDepositListeners() {
        const inputs = [ddElements.dailyInput, ddElements.daysInput, ddElements.rateInput];

        inputs.forEach(input => {
            if (input) {
                input.addEventListener('input', debounce(calculateDailyDeposit, 100));
                input.addEventListener('keypress', handleKeyPress);
                input.addEventListener('blur', function () {
                    if (this.value && parseFloat(this.value) < 0) {
                        this.value = 0;
                        calculateDailyDeposit();
                    }
                });
            }
        });

        if (ddElements.calculateBtn) {
            ddElements.calculateBtn.addEventListener('click', calculateDailyDeposit);
        }

        if (ddElements.startInput && ddElements.endInput) {
            ddElements.startInput.addEventListener('change', () => updateDaysFromDates('dd'));
            ddElements.endInput.addEventListener('change', () => updateDaysFromDates('dd'));
        }

        if (ddElements.modeRadios) {
            ddElements.modeRadios.forEach(radio => {
                radio.addEventListener('change', () => handleModeChange('dd', radio.value));
            });
        }

        if (ddElements.exportBtn) {
            ddElements.exportBtn.addEventListener('click', handleExport);
        }

        if (ddElements.pdfBtn) {
            ddElements.pdfBtn.addEventListener('click', () => window.print());
        }
    }



    /**
     * Set default dates (today to 1 year from today)
     */
    function setDefaultDates() {
        const today = new Date();
        const oneYearLater = new Date();
        oneYearLater.setFullYear(today.getFullYear() + 1);

        // Format dates as YYYY-MM-DD for input[type="date"]
        const todayStr = formatDateForInput(today);
        const laterStr = formatDateForInput(oneYearLater);

        // Daily Deposit
        if (ddElements.startInput) ddElements.startInput.value = todayStr;
        if (ddElements.endInput) ddElements.endInput.value = laterStr;
    }

    /**
     * Format date for input[type="date"] (YYYY-MM-DD)
     */
    function formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }


    /**
     * Handle CSV Export
     */
    function handleExport() {
        const dailyAmount = sanitizeValue(ddElements.dailyInput.value);
        const totalDays = sanitizeValue(ddElements.daysInput.value);
        const annualRate = sanitizeValue(ddElements.rateInput.value);

        if (!dailyAmount || !totalDays) return;

        exportToCSV(dailyAmount, totalDays, annualRate);
    }



    /**
     * Handle input mode change (Dates vs Days)
     */
    function handleModeChange(type, mode) {
        const elements = getElementsByType(type);

        if (!elements) return;

        if (mode === 'dates') {
            if (elements.sectionDays) elements.sectionDays.classList.remove('active');
            if (elements.sectionDates) elements.sectionDates.classList.add('active');
            updateDaysFromDates(type);
        } else {
            if (elements.sectionDates) elements.sectionDates.classList.remove('active');
            if (elements.sectionDays) elements.sectionDays.classList.add('active');
        }

        // Trigger recalculation
        calculateDailyDeposit();
    }

    /**
     * Get elements object by type
     */
    function getElementsByType(type) {
        switch (type) {
            case 'dd': return ddElements;
            default: return null;
        }
    }

    /**
     * Update days input from date range
     */
    function updateDaysFromDates(type) {
        const elements = getElementsByType(type);
        if (!elements || !elements.startInput || !elements.endInput) return;

        const startValue = elements.startInput.value;
        const endValue = elements.endInput.value;

        if (!startValue || !endValue) return;

        const startDate = new Date(startValue);
        const endDate = new Date(endValue);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return;

        // Calculate difference in days
        const diffTime = endDate - startDate;
        const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        // Update the time input
        const timeInput = elements.daysInput;
        if (timeInput) {
            timeInput.value = diffDays;
        }
    }

    /**
     * Calculate Daily Deposit using Average Days Method
     */
    function calculateDailyDeposit() {
        try {
            if (!ddElements.dailyInput || !ddElements.daysInput || !ddElements.rateInput) {
                return;
            }

            const dailyAmount = sanitizeValue(ddElements.dailyInput.value, CONFIG.maxDailyAmount);
            const totalDays = sanitizeValue(ddElements.daysInput.value, CONFIG.maxDays);
            const annualRate = sanitizeValue(ddElements.rateInput.value, CONFIG.maxRate);

            // Total Deposited Amount
            const totalDeposited = dailyAmount * totalDays;

            // Average Days Method: (Total Days + 1) / 2
            const averageDays = (totalDays + 1) / 2;

            // Interest = Total Deposited × (Rate / 100) × (Avg Days / 365)
            const totalInterest = totalDeposited * (annualRate / 100) * (averageDays / CONFIG.daysInYear);

            // Maturity Amount
            const maturityAmount = totalDeposited + totalInterest;

            updateDailyDepositDisplay(totalDeposited, totalInterest, maturityAmount);

            // Generate Daily Schedule
            updateDailySchedule(dailyAmount, totalDays, annualRate);

        } catch (error) {
            console.error('Daily Deposit calculation error:', error);
            displayError('dd');
        }
    }



    /**
     * Update Daily Deposit display
     */
    function updateDailyDepositDisplay(deposited, interest, total) {
        if (ddElements.depositedDisplay) {
            ddElements.depositedDisplay.textContent = formatCurrency(deposited);
        }
        if (ddElements.interestDisplay) {
            if (interest < 0) interest = 0;
            ddElements.interestDisplay.textContent = formatCurrency(interest);
        }
        if (ddElements.totalDisplay) {
            if (total < 0) total = 0;
            ddElements.totalDisplay.textContent = formatCurrency(total);
        }

        // Show schedule section
        if (ddElements.scheduleSection) {
            ddElements.scheduleSection.style.display = 'block';
        }
    }

    /**
     * Update Daily Growth Schedule Table
     */
    function updateDailySchedule(dailyAmount, totalDays, annualRate) {
        if (!ddElements.scheduleBody) return;

        let html = '';
        let cumulativePrincipal = 0;
        let cumulativeInterest = 0;
        const dailyRate = (annualRate / 100) / CONFIG.daysInYear;

        // Limit chart to 1000 days to prevent browser lag
        const displayDays = Math.min(totalDays, 1000);

        for (let day = 1; day <= displayDays; day++) {
            cumulativePrincipal += dailyAmount;
            // Interest for the current day based on current principal
            const interestToday = cumulativePrincipal * dailyRate;
            cumulativeInterest += interestToday;
            const currentBalance = cumulativePrincipal + cumulativeInterest;

            html += `
                <tr>
                    <td>Day ${day}</td>
                    <td>${formatCurrency(cumulativePrincipal)}</td>
                    <td>+${formatCurrency(interestToday)}</td>
                    <td>${formatCurrency(currentBalance)}</td>
                </tr>
            `;
        }

        if (totalDays > 1000) {
            html += `
                <tr>
                    <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">
                        Showing first 1,000 days. Full calculation of ${totalDays} days reflected in totals above.
                    </td>
                </tr>
            `;
        }

        const totalDeposited = dailyAmount * totalDays;
        const totalInterest = totalDeposited * (annualRate / 100) * ((totalDays + 1) / 2 / CONFIG.daysInYear);
        const maturityAmount = totalDeposited + totalInterest;

        html += `
            <tr class="summary-row">
                <td colspan="4">
                    SUMMARY: ${formatCurrency(totalDeposited)} (Deposited) + 
                    ${formatCurrency(totalInterest)} (Interest) = 
                    ${formatCurrency(maturityAmount)} (Total)
                </td>
            </tr>
        `;

        ddElements.scheduleBody.innerHTML = html;
    }

    /**
     * Export data to CSV
     */
    function exportToCSV(dailyAmount, totalDays, annualRate) {
        let csv = 'Day,Daily Principal,Interest Added,Total Balance\n';
        let cumulativePrincipal = 0;
        let cumulativeInterest = 0;
        const dailyRate = (annualRate / 100) / CONFIG.daysInYear;

        for (let day = 1; day <= totalDays; day++) {
            cumulativePrincipal += dailyAmount;
            const interestToday = cumulativePrincipal * dailyRate;
            cumulativeInterest += interestToday;
            const currentBalance = cumulativePrincipal + cumulativeInterest;

            csv += `${day},${cumulativePrincipal.toFixed(2)},${interestToday.toFixed(2)},${currentBalance.toFixed(2)}\n`;
        }

        // Add Summary Row to CSV
        csv += `\nSUMMARY,${cumulativePrincipal.toFixed(2)},${cumulativeInterest.toFixed(2)},${(cumulativePrincipal + cumulativeInterest).toFixed(2)}\n`;
        csv += `TOTAL EQUATION,${formatCurrency(cumulativePrincipal)} + ${formatCurrency(cumulativeInterest)} = ${formatCurrency(cumulativePrincipal + cumulativeInterest)}\n`;

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `daily_growth_breakdown_${totalDays}_days.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }



    /**
     * Display error state
     */
    function displayError(type) {
        const errorValue = '₹--';

        switch (type) {
            case 'dd':
                if (ddElements.depositedDisplay) ddElements.depositedDisplay.textContent = errorValue;
                if (ddElements.interestDisplay) ddElements.interestDisplay.textContent = errorValue;
                if (ddElements.totalDisplay) ddElements.totalDisplay.textContent = errorValue;
                break;
        }
    }

    /**
     * Format number as Indian currency
     */
    function formatCurrency(amount) {
        if (isNaN(amount) || !isFinite(amount)) {
            return '₹0.00';
        }
        return '₹' + amount.toLocaleString('en-IN', {
            minimumFractionDigits: CONFIG.decimalPlaces,
            maximumFractionDigits: CONFIG.decimalPlaces
        });
    }

    /**
     * Sanitize and validate input value
     */
    function sanitizeValue(value, max = Infinity) {
        let num = parseFloat(value) || 0;
        num = Math.max(0, num);
        if (max !== Infinity) {
            num = Math.min(num, max);
        }
        return num;
    }

    /**
     * Handle keypress for numeric inputs
     */
    function handleKeyPress(event) {
        const key = event.key;
        const value = event.target.value;

        // Allow control keys
        if (event.ctrlKey || event.metaKey ||
            ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(key)) {
            return;
        }

        // Allow one decimal point
        if (key === '.' && !value.includes('.')) {
            return;
        }

        // Allow digits
        if (/^\d$/.test(key)) {
            return;
        }

        // Block everything else
        event.preventDefault();
    }

    /**
     * Debounce function
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose public API for testing
    window.MultiCalculator = {
        calculateDailyDeposit,
        formatCurrency
    };

})();