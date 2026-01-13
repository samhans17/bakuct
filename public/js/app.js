/**
 * BakuCT - Transport Management System
 * Frontend Application with API Integration
 */

// ===== Configuration =====
const API_BASE = '/api';

// ===== Application State =====
let state = {
    vehicles: [],
    rates: [],
    entries: [],
    expenses: [],
    dashboard: null,
    currentActivityTab: 'entries'
};

// ===== DOM Elements =====
const DOM = {};

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
    initializeDOM();
    initializeEventListeners();
    checkAuth();
});

function initializeDOM() {
    // Login elements
    DOM.loginScreen = document.getElementById('loginScreen');
    DOM.loginForm = document.getElementById('loginForm');
    DOM.loginError = document.getElementById('loginError');
    DOM.usernameInput = document.getElementById('username');
    DOM.passwordInput = document.getElementById('password');

    // App elements
    DOM.appContainer = document.getElementById('appContainer');
    DOM.logoutBtn = document.getElementById('logoutBtn');

    // Header stats
    DOM.headerIncome = document.getElementById('headerIncome');
    DOM.headerExpense = document.getElementById('headerExpense');
    DOM.headerProfit = document.getElementById('headerProfit');

    // Tab elements
    DOM.tabBtns = document.querySelectorAll('.tab-btn');
    DOM.tabPanels = document.querySelectorAll('.tab-panel');

    // Forms
    DOM.entryForm = document.getElementById('entryForm');
    DOM.expenseForm = document.getElementById('expenseForm');
    DOM.vehicleForm = document.getElementById('vehicleForm');
    DOM.rateForm = document.getElementById('rateForm');

    // Entry form fields
    DOM.entryVehicle = document.getElementById('entryVehicle');
    DOM.entryProduct = document.getElementById('entryProduct');
    DOM.entryWeight = document.getElementById('entryWeight');
    DOM.entryRate = document.getElementById('entryRate');
    DOM.entryAmount = document.getElementById('entryAmount');
    DOM.entryNotes = document.getElementById('entryNotes');

    // Expense form fields
    DOM.expenseVehicle = document.getElementById('expenseVehicle');
    DOM.expenseType = document.getElementById('expenseType');
    DOM.fuelFields = document.getElementById('fuelFields');
    DOM.fuelLiters = document.getElementById('fuelLiters');
    DOM.fuelRate = document.getElementById('fuelRate');
    DOM.expenseAmount = document.getElementById('expenseAmount');
    DOM.expenseDescription = document.getElementById('expenseDescription');

    // Vehicle form fields
    DOM.carNumber = document.getElementById('carNumber');
    DOM.driverName = document.getElementById('driverName');
    DOM.vehicleType = document.getElementById('vehicleType');

    // Rate form fields
    DOM.productName = document.getElementById('productName');
    DOM.productRate = document.getElementById('productRate');

    // Lists
    DOM.entriesList = document.getElementById('entriesList');
    DOM.expensesList = document.getElementById('expensesList');
    DOM.vehiclesList = document.getElementById('vehiclesList');
    DOM.ratesList = document.getElementById('ratesList');

    // Dashboard elements
    DOM.dashTotalIncome = document.getElementById('dashTotalIncome');
    DOM.dashTotalExpenses = document.getElementById('dashTotalExpenses');
    DOM.dashNetProfit = document.getElementById('dashNetProfit');
    DOM.dashTotalVehicles = document.getElementById('dashTotalVehicles');
    DOM.monthIncome = document.getElementById('monthIncome');
    DOM.monthExpenses = document.getElementById('monthExpenses');
    DOM.monthProfit = document.getElementById('monthProfit');
    DOM.expensesByType = document.getElementById('expensesByType');
    DOM.incomeByProduct = document.getElementById('incomeByProduct');
    DOM.vehicleSummary = document.getElementById('vehicleSummary');
    DOM.recentActivity = document.getElementById('recentActivity');

    // Activity tabs
    DOM.activityTabs = document.querySelectorAll('.activity-tab');
}

function initializeEventListeners() {
    // Login form
    DOM.loginForm.addEventListener('submit', handleLogin);

    // Logout
    DOM.logoutBtn.addEventListener('click', logout);

    // Tab navigation
    DOM.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Forms
    DOM.entryForm.addEventListener('submit', handleAddEntry);
    DOM.expenseForm.addEventListener('submit', handleAddExpense);
    DOM.vehicleForm.addEventListener('submit', handleAddVehicle);
    DOM.rateForm.addEventListener('submit', handleAddRate);

    // Entry form - product selection
    DOM.entryProduct.addEventListener('change', handleProductChange);
    DOM.entryWeight.addEventListener('input', calculateEntryAmount);

    // Expense form - type selection
    DOM.expenseType.addEventListener('change', handleExpenseTypeChange);
    DOM.fuelLiters.addEventListener('input', calculateFuelAmount);
    DOM.fuelRate.addEventListener('input', calculateFuelAmount);

    // Activity tabs
    DOM.activityTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            DOM.activityTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.currentActivityTab = tab.dataset.activity;
            renderRecentActivity();
        });
    });
}

// ===== API Functions =====
async function api(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.message || 'API Error');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ===== Authentication =====
function checkAuth() {
    const isLoggedIn = sessionStorage.getItem('bakuctLoggedIn');
    if (isLoggedIn === 'true') {
        showApp();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const username = DOM.usernameInput.value;
    const password = DOM.passwordInput.value;

    try {
        await api('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        sessionStorage.setItem('bakuctLoggedIn', 'true');
        DOM.loginError.classList.add('hidden');
        showApp();
    } catch (error) {
        DOM.loginError.classList.remove('hidden');
    }
}

function logout() {
    sessionStorage.removeItem('bakuctLoggedIn');
    DOM.loginScreen.classList.remove('hidden');
    DOM.appContainer.classList.add('hidden');
    DOM.usernameInput.value = '';
    DOM.passwordInput.value = '';
}

async function showApp() {
    DOM.loginScreen.classList.add('hidden');
    DOM.appContainer.classList.remove('hidden');
    await loadAllData();
}

// ===== Data Loading =====
async function loadAllData() {
    try {
        const [vehicles, rates, entries, expenses, dashboard] = await Promise.all([
            api('/vehicles'),
            api('/rates'),
            api('/entries'),
            api('/expenses'),
            api('/dashboard')
        ]);

        state.vehicles = vehicles;
        state.rates = rates;
        state.entries = entries;
        state.expenses = expenses;
        state.dashboard = dashboard;

        renderAll();
    } catch (error) {
        console.error('Failed to load data:', error);
        alert('Failed to load data. Please refresh the page.');
    }
}

// ===== Tab Navigation =====
function switchTab(tabId) {
    DOM.tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    DOM.tabPanels.forEach(panel => {
        panel.classList.toggle('active', panel.id === `${tabId}-panel`);
    });

    // Refresh dashboard when switching to it
    if (tabId === 'dashboard') {
        loadDashboard();
    }
}

// ===== Utility Functions =====
function formatCurrency(amount) {
    return 'Rs. ' + Number(amount || 0).toLocaleString('en-PK', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PK', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatShortDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PK', {
        day: '2-digit',
        month: 'short'
    });
}

function getExpenseTypeLabel(type) {
    const labels = {
        fuel: 'Fuel',
        maintenance: 'Maintenance',
        wages: 'Driver Wages',
        oil: 'Oil Change',
        challan: 'Traffic Challan',
        labour: 'Labour',
        other: 'Other'
    };
    return labels[type] || type;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Vehicles =====
async function handleAddVehicle(e) {
    e.preventDefault();

    const vehicleData = {
        car_number: DOM.carNumber.value.trim(),
        driver_name: DOM.driverName.value.trim(),
        vehicle_type: DOM.vehicleType.value
    };

    try {
        const vehicle = await api('/vehicles', {
            method: 'POST',
            body: JSON.stringify(vehicleData)
        });

        state.vehicles.unshift(vehicle);
        renderVehicles();
        updateVehicleDropdowns();

        // Reset form
        DOM.vehicleForm.reset();
    } catch (error) {
        alert(error.message || 'Failed to add vehicle');
    }
}

async function deleteVehicle(id) {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;

    try {
        await api(`/vehicles/${id}`, { method: 'DELETE' });
        state.vehicles = state.vehicles.filter(v => v.id !== id);
        renderVehicles();
        updateVehicleDropdowns();
    } catch (error) {
        alert(error.message || 'Failed to delete vehicle');
    }
}

function renderVehicles() {
    if (state.vehicles.length === 0) {
        DOM.vehiclesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🚗</div>
                <p>No vehicles yet. Add your first vehicle above.</p>
            </div>
        `;
        return;
    }

    DOM.vehiclesList.innerHTML = state.vehicles.map(vehicle => `
        <div class="vehicle-card">
            <div class="vehicle-card-header">
                <span class="vehicle-card-number">${escapeHtml(vehicle.car_number)}</span>
                <button class="delete-btn" onclick="deleteVehicle(${vehicle.id})" title="Delete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
            <div class="vehicle-card-details">
                ${vehicle.vehicle_type ? `<span class="vehicle-tag type">${escapeHtml(vehicle.vehicle_type)}</span>` : ''}
                ${vehicle.driver_name ? `<span class="vehicle-tag driver">👤 ${escapeHtml(vehicle.driver_name)}</span>` : ''}
            </div>
        </div>
    `).join('');
}

function updateVehicleDropdowns() {
    const options = '<option value="">Select vehicle (optional)...</option>' +
        state.vehicles.map(v => `<option value="${v.id}">${escapeHtml(v.car_number)}</option>`).join('');

    DOM.entryVehicle.innerHTML = options;
    DOM.expenseVehicle.innerHTML = options;
}

// ===== Rates =====
async function handleAddRate(e) {
    e.preventDefault();

    const rateData = {
        product_name: DOM.productName.value.trim(),
        rate_per_ton: parseFloat(DOM.productRate.value)
    };

    try {
        const rate = await api('/rates', {
            method: 'POST',
            body: JSON.stringify(rateData)
        });

        // Update or add to state
        const existingIndex = state.rates.findIndex(r => r.id === rate.id);
        if (existingIndex >= 0) {
            state.rates[existingIndex] = rate;
        } else {
            state.rates.push(rate);
        }

        renderRates();
        updateProductDropdown();

        // Reset form
        DOM.rateForm.reset();
    } catch (error) {
        alert(error.message || 'Failed to add rate');
    }
}

async function deleteRate(id) {
    if (!confirm('Are you sure you want to delete this rate?')) return;

    try {
        await api(`/rates/${id}`, { method: 'DELETE' });
        state.rates = state.rates.filter(r => r.id !== id);
        renderRates();
        updateProductDropdown();
    } catch (error) {
        alert(error.message || 'Failed to delete rate');
    }
}

function renderRates() {
    if (state.rates.length === 0) {
        DOM.ratesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💰</div>
                <p>No rates defined. Add product rates above.</p>
            </div>
        `;
        return;
    }

    DOM.ratesList.innerHTML = state.rates.map(rate => `
        <div class="rate-card">
            <div class="rate-card-header">
                <span class="rate-card-name">${escapeHtml(rate.product_name)}</span>
                <button class="delete-btn" onclick="deleteRate(${rate.id})" title="Delete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
            <div class="rate-card-value">${formatCurrency(rate.rate_per_ton)}</div>
            <div class="rate-card-unit">per Ton</div>
        </div>
    `).join('');
}

function updateProductDropdown() {
    DOM.entryProduct.innerHTML = '<option value="">Select product...</option>' +
        state.rates.map(r => `<option value="${r.product_name}" data-rate="${r.rate_per_ton}">${escapeHtml(r.product_name)} (${formatCurrency(r.rate_per_ton)}/ton)</option>`).join('');
}

// ===== Entries =====
function handleProductChange() {
    const selected = DOM.entryProduct.selectedOptions[0];
    if (selected && selected.dataset.rate) {
        DOM.entryRate.value = formatCurrency(selected.dataset.rate);
        calculateEntryAmount();
    } else {
        DOM.entryRate.value = '';
        DOM.entryAmount.value = '';
    }
}

function calculateEntryAmount() {
    const selected = DOM.entryProduct.selectedOptions[0];
    const weight = parseFloat(DOM.entryWeight.value) || 0;

    if (selected && selected.dataset.rate && weight > 0) {
        const rate = parseFloat(selected.dataset.rate);
        const tons = weight / 1000;
        const amount = tons * rate;
        DOM.entryAmount.value = formatCurrency(amount);
    } else {
        DOM.entryAmount.value = '';
    }
}

async function handleAddEntry(e) {
    e.preventDefault();

    const selected = DOM.entryProduct.selectedOptions[0];
    if (!selected || !selected.dataset.rate) {
        alert('Please select a product');
        return;
    }

    const entryData = {
        vehicle_id: DOM.entryVehicle.value || null,
        product_name: DOM.entryProduct.value,
        weight_kg: parseFloat(DOM.entryWeight.value),
        rate_per_ton: parseFloat(selected.dataset.rate),
        notes: DOM.entryNotes.value.trim()
    };

    try {
        const entry = await api('/entries', {
            method: 'POST',
            body: JSON.stringify(entryData)
        });

        state.entries.unshift(entry);
        renderEntries();
        updateHeaderStats();

        // Reset form
        DOM.entryForm.reset();
        DOM.entryRate.value = '';
        DOM.entryAmount.value = '';
    } catch (error) {
        alert(error.message || 'Failed to add entry');
    }
}

async function deleteEntry(id) {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
        await api(`/entries/${id}`, { method: 'DELETE' });
        state.entries = state.entries.filter(e => e.id !== id);
        renderEntries();
        updateHeaderStats();
    } catch (error) {
        alert(error.message || 'Failed to delete entry');
    }
}

function renderEntries() {
    if (state.entries.length === 0) {
        DOM.entriesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <p>No entries yet. Add your first entry above.</p>
            </div>
        `;
        return;
    }

    DOM.entriesList.innerHTML = state.entries.map(entry => `
        <div class="list-item">
            <div class="list-item-header">
                <span class="list-item-title">${escapeHtml(entry.product_name)}</span>
                <span class="list-item-date">${formatDate(entry.created_at)}</span>
            </div>
            <div class="list-item-details">
                ${entry.car_number ? `<span class="detail-tag">🚗 ${escapeHtml(entry.car_number)}</span>` : ''}
                <span class="detail-tag">${entry.weight_kg.toLocaleString()} KG</span>
                <span class="detail-tag">${(entry.weight_kg / 1000).toFixed(3)} Tons</span>
                <span class="detail-tag">@ ${formatCurrency(entry.rate_per_ton)}/ton</span>
            </div>
            ${entry.notes ? `<div class="list-item-details"><span class="detail-tag">📝 ${escapeHtml(entry.notes)}</span></div>` : ''}
            <div class="list-item-footer">
                <span class="list-item-amount amount-positive">+${formatCurrency(entry.amount)}</span>
                <button class="delete-btn" onclick="deleteEntry(${entry.id})" title="Delete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

// ===== Expenses =====
function handleExpenseTypeChange() {
    if (DOM.expenseType.value === 'fuel') {
        DOM.fuelFields.style.display = 'grid';
    } else {
        DOM.fuelFields.style.display = 'none';
        DOM.fuelLiters.value = '';
        DOM.fuelRate.value = '';
    }
}

function calculateFuelAmount() {
    const liters = parseFloat(DOM.fuelLiters.value) || 0;
    const rate = parseFloat(DOM.fuelRate.value) || 0;

    if (liters > 0 && rate > 0) {
        DOM.expenseAmount.value = (liters * rate).toFixed(2);
    }
}

async function handleAddExpense(e) {
    e.preventDefault();

    const expenseData = {
        vehicle_id: DOM.expenseVehicle.value || null,
        expense_type: DOM.expenseType.value,
        amount: parseFloat(DOM.expenseAmount.value),
        liters: parseFloat(DOM.fuelLiters.value) || null,
        fuel_rate: parseFloat(DOM.fuelRate.value) || null,
        description: DOM.expenseDescription.value.trim()
    };

    try {
        const expense = await api('/expenses', {
            method: 'POST',
            body: JSON.stringify(expenseData)
        });

        state.expenses.unshift(expense);
        renderExpenses();
        updateHeaderStats();

        // Reset form
        DOM.expenseForm.reset();
        handleExpenseTypeChange();
    } catch (error) {
        alert(error.message || 'Failed to add expense');
    }
}

async function deleteExpense(id) {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
        await api(`/expenses/${id}`, { method: 'DELETE' });
        state.expenses = state.expenses.filter(e => e.id !== id);
        renderExpenses();
        updateHeaderStats();
    } catch (error) {
        alert(error.message || 'Failed to delete expense');
    }
}

function renderExpenses() {
    if (state.expenses.length === 0) {
        DOM.expensesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💸</div>
                <p>No expenses yet. Add your first expense above.</p>
            </div>
        `;
        return;
    }

    DOM.expensesList.innerHTML = state.expenses.map(expense => {
        let details = [];
        if (expense.car_number) details.push(`🚗 ${expense.car_number}`);
        if (expense.expense_type === 'fuel' && expense.liters) {
            details.push(`${expense.liters} Liters`);
            if (expense.fuel_rate) details.push(`@ Rs. ${expense.fuel_rate}/L`);
        }
        if (expense.description) details.push(`📝 ${expense.description}`);

        return `
            <div class="list-item">
                <div class="list-item-header">
                    <span class="expense-type expense-${expense.expense_type}">${getExpenseTypeLabel(expense.expense_type)}</span>
                    <span class="list-item-date">${formatDate(expense.created_at)}</span>
                </div>
                ${details.length > 0 ? `
                    <div class="list-item-details">
                        ${details.map(d => `<span class="detail-tag">${escapeHtml(d)}</span>`).join('')}
                    </div>
                ` : ''}
                <div class="list-item-footer">
                    <span class="list-item-amount amount-negative">-${formatCurrency(expense.amount)}</span>
                    <button class="delete-btn" onclick="deleteExpense(${expense.id})" title="Delete">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== Dashboard =====
async function loadDashboard() {
    try {
        state.dashboard = await api('/dashboard');
        renderDashboard();
    } catch (error) {
        console.error('Failed to load dashboard:', error);
    }
}

function renderDashboard() {
    if (!state.dashboard) return;

    const { summary, expensesByType, incomeByProduct, vehicleSummary, recentEntries, recentExpenses } = state.dashboard;

    // Summary cards
    DOM.dashTotalIncome.textContent = formatCurrency(summary.totalIncome);
    DOM.dashTotalExpenses.textContent = formatCurrency(summary.totalExpenses);
    DOM.dashNetProfit.textContent = formatCurrency(summary.netProfit);
    DOM.dashTotalVehicles.textContent = summary.totalVehicles;

    // Monthly stats
    DOM.monthIncome.textContent = formatCurrency(summary.currentMonthIncome);
    DOM.monthExpenses.textContent = formatCurrency(summary.currentMonthExpenses);
    DOM.monthProfit.textContent = formatCurrency(summary.currentMonthProfit);

    // Expenses by type chart
    renderExpensesByTypeChart(expensesByType, summary.totalExpenses);

    // Income by product chart
    renderIncomeByProductChart(incomeByProduct, summary.totalIncome);

    // Vehicle summary
    renderVehicleSummaryTable(vehicleSummary);

    // Recent activity
    state.dashboard.recentEntries = recentEntries;
    state.dashboard.recentExpenses = recentExpenses;
    renderRecentActivity();
}

function renderExpensesByTypeChart(data, total) {
    if (!data || data.length === 0) {
        DOM.expensesByType.innerHTML = '<div class="empty-state"><p>No expense data yet</p></div>';
        return;
    }

    const colors = {
        fuel: '#ff6b35',
        maintenance: '#a78bfa',
        wages: '#60a5fa',
        oil: '#f472b6',
        challan: '#fbbf24',
        labour: '#2dd4bf',
        other: '#94a3b8'
    };

    DOM.expensesByType.innerHTML = data.map(item => {
        const percentage = total > 0 ? (item.total / total) * 100 : 0;
        const color = colors[item.expense_type] || '#94a3b8';

        return `
            <div class="chart-bar">
                <span class="chart-bar-label">${getExpenseTypeLabel(item.expense_type)}</span>
                <div class="chart-bar-track">
                    <div class="chart-bar-fill" style="width: ${percentage}%; background: ${color}">
                        ${formatCurrency(item.total)}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderIncomeByProductChart(data, total) {
    if (!data || data.length === 0) {
        DOM.incomeByProduct.innerHTML = '<div class="empty-state"><p>No income data yet</p></div>';
        return;
    }

    const colors = ['#00d9ff', '#4ade80', '#fbbf24', '#f472b6', '#a78bfa', '#60a5fa'];

    DOM.incomeByProduct.innerHTML = data.map((item, index) => {
        const percentage = total > 0 ? (item.total / total) * 100 : 0;
        const color = colors[index % colors.length];

        return `
            <div class="chart-bar">
                <span class="chart-bar-label">${escapeHtml(item.product_name)}</span>
                <div class="chart-bar-track">
                    <div class="chart-bar-fill" style="width: ${percentage}%; background: ${color}">
                        ${formatCurrency(item.total)}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderVehicleSummaryTable(data) {
    if (!data || data.length === 0) {
        DOM.vehicleSummary.innerHTML = '<div class="empty-state"><p>No vehicle data yet</p></div>';
        return;
    }

    DOM.vehicleSummary.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Vehicle</th>
                    <th>Driver</th>
                    <th>Income</th>
                    <th>Expense</th>
                    <th>Profit</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(v => `
                    <tr>
                        <td><strong>${escapeHtml(v.car_number)}</strong></td>
                        <td>${escapeHtml(v.driver_name) || '-'}</td>
                        <td style="color: var(--accent-success)">${formatCurrency(v.total_income)}</td>
                        <td style="color: var(--accent-danger)">${formatCurrency(v.total_expense)}</td>
                        <td style="color: var(--accent-primary)">${formatCurrency(v.total_income - v.total_expense)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderRecentActivity() {
    if (!state.dashboard) return;

    const isEntries = state.currentActivityTab === 'entries';
    const data = isEntries ? state.dashboard.recentEntries : state.dashboard.recentExpenses;

    if (!data || data.length === 0) {
        DOM.recentActivity.innerHTML = `<div class="empty-state"><p>No recent ${state.currentActivityTab}</p></div>`;
        return;
    }

    if (isEntries) {
        DOM.recentActivity.innerHTML = data.map(item => `
            <div class="activity-item">
                <div class="activity-info">
                    <span class="activity-title">${escapeHtml(item.product_name)}</span>
                    <span class="activity-meta">${item.car_number ? item.car_number + ' • ' : ''}${formatShortDate(item.created_at)}</span>
                </div>
                <span class="activity-amount income">+${formatCurrency(item.amount)}</span>
            </div>
        `).join('');
    } else {
        DOM.recentActivity.innerHTML = data.map(item => `
            <div class="activity-item">
                <div class="activity-info">
                    <span class="activity-title">${getExpenseTypeLabel(item.expense_type)}</span>
                    <span class="activity-meta">${item.car_number ? item.car_number + ' • ' : ''}${formatShortDate(item.created_at)}</span>
                </div>
                <span class="activity-amount expense">-${formatCurrency(item.amount)}</span>
            </div>
        `).join('');
    }
}

// ===== Header Stats =====
function updateHeaderStats() {
    const totalIncome = state.entries.reduce((sum, e) => sum + e.amount, 0);
    const totalExpense = state.expenses.reduce((sum, e) => sum + e.amount, 0);
    const profit = totalIncome - totalExpense;

    DOM.headerIncome.textContent = `Income: ${formatCurrency(totalIncome)}`;
    DOM.headerExpense.textContent = `Expense: ${formatCurrency(totalExpense)}`;
    DOM.headerProfit.textContent = `Profit: ${formatCurrency(profit)}`;
}

// ===== Render All =====
function renderAll() {
    renderVehicles();
    renderRates();
    renderEntries();
    renderExpenses();
    updateVehicleDropdowns();
    updateProductDropdown();
    updateHeaderStats();
    renderDashboard();
}

// ===== Global Functions for onclick handlers =====
window.deleteVehicle = deleteVehicle;
window.deleteRate = deleteRate;
window.deleteEntry = deleteEntry;
window.deleteExpense = deleteExpense;

