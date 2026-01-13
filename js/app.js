/**
 * BakuCT - Transport Management System
 * Main Application JavaScript
 */

// ===== Configuration =====
const CONFIG = {
    STORAGE_KEY: 'bakuctData',
    SESSION_KEY: 'bakuctLoggedIn',
    CREDENTIALS: {
        username: 'admin',
        password: 'bakuct2024'
    }
};

// ===== Application State =====
let appData = {
    entries: [],
    expenses: [],
    rates: []
};

// ===== DOM Elements Cache =====
const DOM = {
    // Login elements
    loginScreen: null,
    loginForm: null,
    loginError: null,
    usernameInput: null,
    passwordInput: null,
    
    // App elements
    appContainer: null,
    logoutBtn: null,
    
    // Summary elements
    totalIncome: null,
    totalExpense: null,
    netProfit: null,
    
    // Entry elements
    entryProduct: null,
    entryWeight: null,
    entryRate: null,
    entryAmount: null,
    addEntryBtn: null,
    entriesList: null,
    
    // Expense elements
    expenseType: null,
    fuelFields: null,
    fuelLiters: null,
    fuelRate: null,
    expenseAmount: null,
    expenseDescription: null,
    addExpenseBtn: null,
    expensesList: null,
    
    // Rate elements
    productName: null,
    productRate: null,
    addRateBtn: null,
    ratesList: null
};

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', function() {
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
    
    // Summary elements
    DOM.totalIncome = document.getElementById('totalIncome');
    DOM.totalExpense = document.getElementById('totalExpense');
    DOM.netProfit = document.getElementById('netProfit');
    
    // Entry elements
    DOM.entryProduct = document.getElementById('entryProduct');
    DOM.entryWeight = document.getElementById('entryWeight');
    DOM.entryRate = document.getElementById('entryRate');
    DOM.entryAmount = document.getElementById('entryAmount');
    DOM.addEntryBtn = document.getElementById('addEntryBtn');
    DOM.entriesList = document.getElementById('entriesList');
    
    // Expense elements
    DOM.expenseType = document.getElementById('expenseType');
    DOM.fuelFields = document.getElementById('fuelFields');
    DOM.fuelLiters = document.getElementById('fuelLiters');
    DOM.fuelRate = document.getElementById('fuelRate');
    DOM.expenseAmount = document.getElementById('expenseAmount');
    DOM.expenseDescription = document.getElementById('expenseDescription');
    DOM.addExpenseBtn = document.getElementById('addExpenseBtn');
    DOM.expensesList = document.getElementById('expensesList');
    
    // Rate elements
    DOM.productName = document.getElementById('productName');
    DOM.productRate = document.getElementById('productRate');
    DOM.addRateBtn = document.getElementById('addRateBtn');
    DOM.ratesList = document.getElementById('ratesList');
}

function initializeEventListeners() {
    // Login form
    DOM.loginForm.addEventListener('submit', handleLogin);
    
    // Logout
    DOM.logoutBtn.addEventListener('click', logout);
    
    // Add buttons
    DOM.addRateBtn.addEventListener('click', addRate);
    DOM.addEntryBtn.addEventListener('click', addEntry);
    DOM.addExpenseBtn.addEventListener('click', addExpense);
    
    // Product selection - auto-fill rate
    DOM.entryProduct.addEventListener('change', handleProductChange);
    
    // Weight change - calculate amount
    DOM.entryWeight.addEventListener('input', calculateEntryAmount);
    
    // Expense type change - show/hide fuel fields
    DOM.expenseType.addEventListener('change', handleExpenseTypeChange);
    
    // Fuel calculation
    DOM.fuelLiters.addEventListener('input', calculateFuelAmount);
    DOM.fuelRate.addEventListener('input', calculateFuelAmount);
}

// ===== Authentication Functions =====
function checkAuth() {
    const isLoggedIn = sessionStorage.getItem(CONFIG.SESSION_KEY);
    if (isLoggedIn === 'true') {
        showApp();
    }
}

function handleLogin(e) {
    e.preventDefault();
    const username = DOM.usernameInput.value;
    const password = DOM.passwordInput.value;
    
    if (username === CONFIG.CREDENTIALS.username && password === CONFIG.CREDENTIALS.password) {
        sessionStorage.setItem(CONFIG.SESSION_KEY, 'true');
        DOM.loginError.classList.add('hidden');
        showApp();
    } else {
        DOM.loginError.classList.remove('hidden');
    }
}

function logout() {
    sessionStorage.removeItem(CONFIG.SESSION_KEY);
    DOM.loginScreen.classList.remove('hidden');
    DOM.appContainer.style.display = 'none';
    DOM.usernameInput.value = '';
    DOM.passwordInput.value = '';
}

function showApp() {
    DOM.loginScreen.classList.add('hidden');
    DOM.appContainer.style.display = 'block';
    loadData();
    renderAll();
}

// ===== Data Persistence =====
function loadData() {
    try {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (saved) {
            appData = JSON.parse(saved);
        }
    } catch (error) {
        console.error('Error loading data:', error);
        appData = { entries: [], expenses: [], rates: [] };
    }
}

function saveData() {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(appData));
    } catch (error) {
        console.error('Error saving data:', error);
        alert('Error saving data. Please check your browser storage settings.');
    }
}

// ===== Utility Functions =====
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatCurrency(amount) {
    return 'Rs. ' + Number(amount).toLocaleString('en-PK', {
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

function getExpenseTypeLabel(type) {
    const labels = {
        fuel: 'Fuel',
        maintenance: 'Maintenance',
        wages: 'Driver Wages',
        oil: 'Oil Change',
        challan: 'Traffic Challan',
        labour: 'Labour'
    };
    return labels[type] || type;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Rates Functions =====
function addRate() {
    const name = DOM.productName.value.trim();
    const rate = parseFloat(DOM.productRate.value);

    if (!name) {
        alert('Please enter a product name.');
        return;
    }

    if (isNaN(rate) || rate <= 0) {
        alert('Please enter a valid rate.');
        return;
    }

    // Check if product already exists
    const existingIndex = appData.rates.findIndex(r => 
        r.name.toLowerCase() === name.toLowerCase()
    );
    
    if (existingIndex !== -1) {
        appData.rates[existingIndex].rate = rate;
        appData.rates[existingIndex].updatedAt = new Date().toISOString();
    } else {
        appData.rates.push({
            id: generateId(),
            name: name,
            rate: rate,
            createdAt: new Date().toISOString()
        });
    }

    saveData();
    renderRates();
    updateProductDropdown();
    
    // Reset form
    DOM.productName.value = '';
    DOM.productRate.value = '';
    DOM.productName.focus();
}

function deleteRate(id) {
    if (confirm('Are you sure you want to delete this rate?')) {
        appData.rates = appData.rates.filter(r => r.id !== id);
        saveData();
        renderRates();
        updateProductDropdown();
    }
}

function renderRates() {
    if (appData.rates.length === 0) {
        DOM.ratesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <p>No rates defined. Add product rates above.</p>
            </div>
        `;
        return;
    }

    DOM.ratesList.innerHTML = appData.rates.map(rate => `
        <div class="rate-card">
            <div class="rate-card-header">
                <span class="rate-card-name">${escapeHtml(rate.name)}</span>
                <button class="delete-btn" onclick="deleteRate('${rate.id}')" title="Delete rate">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
            <div class="rate-card-value">${formatCurrency(rate.rate)}</div>
            <div class="rate-card-unit">per Ton</div>
        </div>
    `).join('');
}

function updateProductDropdown() {
    DOM.entryProduct.innerHTML = '<option value="">Select product...</option>';
    
    appData.rates.forEach(rate => {
        const option = document.createElement('option');
        option.value = rate.id;
        option.textContent = `${rate.name} (${formatCurrency(rate.rate)}/ton)`;
        DOM.entryProduct.appendChild(option);
    });
}

// ===== Entries Functions =====
function handleProductChange() {
    const productId = DOM.entryProduct.value;
    const product = appData.rates.find(r => r.id === productId);
    
    if (product) {
        DOM.entryRate.value = formatCurrency(product.rate);
        calculateEntryAmount();
    } else {
        DOM.entryRate.value = '';
        DOM.entryAmount.value = '';
    }
}

function calculateEntryAmount() {
    const productId = DOM.entryProduct.value;
    const weight = parseFloat(DOM.entryWeight.value) || 0;
    const product = appData.rates.find(r => r.id === productId);

    if (product && weight > 0) {
        const tons = weight / 1000;
        const amount = tons * product.rate;
        DOM.entryAmount.value = formatCurrency(amount);
    } else {
        DOM.entryAmount.value = '';
    }
}

function addEntry() {
    const productId = DOM.entryProduct.value;
    const weight = parseFloat(DOM.entryWeight.value);

    if (!productId) {
        alert('Please select a product.');
        return;
    }

    if (isNaN(weight) || weight <= 0) {
        alert('Please enter a valid weight in KG.');
        return;
    }

    const product = appData.rates.find(r => r.id === productId);
    if (!product) {
        alert('Product not found. Please select a valid product.');
        return;
    }

    // Calculate amount: weight (kg) / 1000 * rate (per ton)
    const tons = weight / 1000;
    const amount = tons * product.rate;

    appData.entries.push({
        id: generateId(),
        productId: productId,
        productName: product.name,
        weight: weight,
        rate: product.rate,
        amount: amount,
        createdAt: new Date().toISOString()
    });

    saveData();
    renderEntries();
    updateSummary();

    // Reset form
    DOM.entryProduct.value = '';
    DOM.entryWeight.value = '';
    DOM.entryRate.value = '';
    DOM.entryAmount.value = '';
}

function deleteEntry(id) {
    if (confirm('Are you sure you want to delete this entry?')) {
        appData.entries = appData.entries.filter(e => e.id !== id);
        saveData();
        renderEntries();
        updateSummary();
    }
}

function renderEntries() {
    if (appData.entries.length === 0) {
        DOM.entriesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <p>No entries yet. Add your first entry above.</p>
            </div>
        `;
        return;
    }

    // Sort by date (newest first)
    const sorted = [...appData.entries].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );

    DOM.entriesList.innerHTML = sorted.map(entry => `
        <div class="list-item">
            <div class="list-item-header">
                <span class="list-item-title">${escapeHtml(entry.productName)}</span>
                <span class="list-item-date">${formatDate(entry.createdAt)}</span>
            </div>
            <div class="list-item-details">
                <span class="detail-tag">${entry.weight.toLocaleString()} KG</span>
                <span class="detail-tag">${(entry.weight / 1000).toFixed(3)} Tons</span>
                <span class="detail-tag">@ ${formatCurrency(entry.rate)}/ton</span>
            </div>
            <div class="list-item-footer">
                <span class="list-item-amount amount-positive">+${formatCurrency(entry.amount)}</span>
                <button class="delete-btn" onclick="deleteEntry('${entry.id}')" title="Delete entry">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

// ===== Expenses Functions =====
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

function addExpense() {
    const type = DOM.expenseType.value;
    const amount = parseFloat(DOM.expenseAmount.value);
    const description = DOM.expenseDescription.value.trim();

    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount.');
        return;
    }

    const expense = {
        id: generateId(),
        type: type,
        amount: amount,
        description: description,
        createdAt: new Date().toISOString()
    };

    // Add fuel-specific data
    if (type === 'fuel') {
        const liters = parseFloat(DOM.fuelLiters.value) || 0;
        const fuelRate = parseFloat(DOM.fuelRate.value) || 0;
        expense.liters = liters;
        expense.fuelRate = fuelRate;
    }

    appData.expenses.push(expense);
    saveData();
    renderExpenses();
    updateSummary();

    // Reset form
    DOM.expenseAmount.value = '';
    DOM.expenseDescription.value = '';
    DOM.fuelLiters.value = '';
    DOM.fuelRate.value = '';
}

function deleteExpense(id) {
    if (confirm('Are you sure you want to delete this expense?')) {
        appData.expenses = appData.expenses.filter(e => e.id !== id);
        saveData();
        renderExpenses();
        updateSummary();
    }
}

function renderExpenses() {
    if (appData.expenses.length === 0) {
        DOM.expensesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💸</div>
                <p>No expenses yet. Add your first expense above.</p>
            </div>
        `;
        return;
    }

    // Sort by date (newest first)
    const sorted = [...appData.expenses].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );

    DOM.expensesList.innerHTML = sorted.map(expense => {
        let details = [];
        if (expense.type === 'fuel' && expense.liters) {
            details.push(`${expense.liters} Liters`);
            if (expense.fuelRate) {
                details.push(`@ Rs. ${expense.fuelRate}/L`);
            }
        }
        if (expense.description) {
            details.push(escapeHtml(expense.description));
        }

        return `
            <div class="list-item">
                <div class="list-item-header">
                    <span class="expense-type expense-${expense.type}">${getExpenseTypeLabel(expense.type)}</span>
                    <span class="list-item-date">${formatDate(expense.createdAt)}</span>
                </div>
                ${details.length > 0 ? `
                    <div class="list-item-details">
                        ${details.map(d => `<span class="detail-tag">${d}</span>`).join('')}
                    </div>
                ` : ''}
                <div class="list-item-footer">
                    <span class="list-item-amount amount-negative">-${formatCurrency(expense.amount)}</span>
                    <button class="delete-btn" onclick="deleteExpense('${expense.id}')" title="Delete expense">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== Summary Functions =====
function updateSummary() {
    const totalIncome = appData.entries.reduce((sum, e) => sum + e.amount, 0);
    const totalExpense = appData.expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalIncome - totalExpense;

    DOM.totalIncome.textContent = `Income: ${formatCurrency(totalIncome)}`;
    DOM.totalExpense.textContent = `Expense: ${formatCurrency(totalExpense)}`;
    DOM.netProfit.textContent = `Profit: ${formatCurrency(netProfit)}`;
}

// ===== Render All =====
function renderAll() {
    renderRates();
    renderEntries();
    renderExpenses();
    updateProductDropdown();
    updateSummary();
}

// ===== Export functions for global access (used by onclick handlers) =====
window.deleteRate = deleteRate;
window.deleteEntry = deleteEntry;
window.deleteExpense = deleteExpense;
