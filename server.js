/**
 * BakuCT - Transport Management System
 * Backend Server with SQLite Database
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SQLite Database
const db = new Database('bakuct.db');

// Create tables
db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Vehicles table
    CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        car_number TEXT UNIQUE NOT NULL,
        driver_name TEXT,
        vehicle_type TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Product rates table
    CREATE TABLE IF NOT EXISTS rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_name TEXT UNIQUE NOT NULL,
        rate_per_ton REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Entries table (product loads)
    CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER,
        product_name TEXT NOT NULL,
        weight_kg REAL NOT NULL,
        rate_per_ton REAL NOT NULL,
        amount REAL NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    );

    -- Expenses table
    CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER,
        expense_type TEXT NOT NULL,
        amount REAL NOT NULL,
        liters REAL,
        fuel_rate REAL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    );

    -- Insert default admin user if not exists
    INSERT OR IGNORE INTO users (username, password) VALUES ('admin', 'bakuct2024');
`);

// ============ AUTH ROUTES ============
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password);
    
    if (user) {
        res.json({ success: true, message: 'Login successful' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// ============ VEHICLES ROUTES ============
app.get('/api/vehicles', (req, res) => {
    const vehicles = db.prepare('SELECT * FROM vehicles ORDER BY created_at DESC').all();
    res.json(vehicles);
});

app.post('/api/vehicles', (req, res) => {
    const { car_number, driver_name, vehicle_type } = req.body;
    
    if (!car_number) {
        return res.status(400).json({ error: 'Car number is required' });
    }
    
    try {
        const stmt = db.prepare('INSERT INTO vehicles (car_number, driver_name, vehicle_type) VALUES (?, ?, ?)');
        const result = stmt.run(car_number, driver_name || null, vehicle_type || null);
        
        const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(result.lastInsertRowid);
        res.json(vehicle);
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            res.status(400).json({ error: 'Vehicle with this car number already exists' });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

app.put('/api/vehicles/:id', (req, res) => {
    const { id } = req.params;
    const { car_number, driver_name, vehicle_type, status } = req.body;
    
    try {
        const stmt = db.prepare('UPDATE vehicles SET car_number = ?, driver_name = ?, vehicle_type = ?, status = ? WHERE id = ?');
        stmt.run(car_number, driver_name, vehicle_type, status, id);
        
        const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id);
        res.json(vehicle);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/vehicles/:id', (req, res) => {
    const { id } = req.params;
    
    try {
        db.prepare('DELETE FROM vehicles WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ RATES ROUTES ============
app.get('/api/rates', (req, res) => {
    const rates = db.prepare('SELECT * FROM rates ORDER BY product_name').all();
    res.json(rates);
});

app.post('/api/rates', (req, res) => {
    const { product_name, rate_per_ton } = req.body;
    
    if (!product_name || !rate_per_ton) {
        return res.status(400).json({ error: 'Product name and rate are required' });
    }
    
    try {
        // Upsert - update if exists, insert if not
        const existing = db.prepare('SELECT * FROM rates WHERE product_name = ?').get(product_name);
        
        if (existing) {
            db.prepare('UPDATE rates SET rate_per_ton = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(rate_per_ton, existing.id);
            const rate = db.prepare('SELECT * FROM rates WHERE id = ?').get(existing.id);
            res.json(rate);
        } else {
            const stmt = db.prepare('INSERT INTO rates (product_name, rate_per_ton) VALUES (?, ?)');
            const result = stmt.run(product_name, rate_per_ton);
            const rate = db.prepare('SELECT * FROM rates WHERE id = ?').get(result.lastInsertRowid);
            res.json(rate);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/rates/:id', (req, res) => {
    const { id } = req.params;
    
    try {
        db.prepare('DELETE FROM rates WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ ENTRIES ROUTES ============
app.get('/api/entries', (req, res) => {
    const entries = db.prepare(`
        SELECT e.*, v.car_number 
        FROM entries e 
        LEFT JOIN vehicles v ON e.vehicle_id = v.id 
        ORDER BY e.created_at DESC
    `).all();
    res.json(entries);
});

app.post('/api/entries', (req, res) => {
    const { vehicle_id, product_name, weight_kg, rate_per_ton, notes } = req.body;
    
    if (!product_name || !weight_kg || !rate_per_ton) {
        return res.status(400).json({ error: 'Product name, weight, and rate are required' });
    }
    
    const amount = (weight_kg / 1000) * rate_per_ton;
    
    try {
        const stmt = db.prepare('INSERT INTO entries (vehicle_id, product_name, weight_kg, rate_per_ton, amount, notes) VALUES (?, ?, ?, ?, ?, ?)');
        const result = stmt.run(vehicle_id || null, product_name, weight_kg, rate_per_ton, amount, notes || null);
        
        const entry = db.prepare(`
            SELECT e.*, v.car_number 
            FROM entries e 
            LEFT JOIN vehicles v ON e.vehicle_id = v.id 
            WHERE e.id = ?
        `).get(result.lastInsertRowid);
        res.json(entry);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/entries/:id', (req, res) => {
    const { id } = req.params;
    
    try {
        db.prepare('DELETE FROM entries WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ EXPENSES ROUTES ============
app.get('/api/expenses', (req, res) => {
    const expenses = db.prepare(`
        SELECT e.*, v.car_number 
        FROM expenses e 
        LEFT JOIN vehicles v ON e.vehicle_id = v.id 
        ORDER BY e.created_at DESC
    `).all();
    res.json(expenses);
});

app.post('/api/expenses', (req, res) => {
    const { vehicle_id, expense_type, amount, liters, fuel_rate, description } = req.body;
    
    if (!expense_type || !amount) {
        return res.status(400).json({ error: 'Expense type and amount are required' });
    }
    
    try {
        const stmt = db.prepare('INSERT INTO expenses (vehicle_id, expense_type, amount, liters, fuel_rate, description) VALUES (?, ?, ?, ?, ?, ?)');
        const result = stmt.run(vehicle_id || null, expense_type, amount, liters || null, fuel_rate || null, description || null);
        
        const expense = db.prepare(`
            SELECT e.*, v.car_number 
            FROM expenses e 
            LEFT JOIN vehicles v ON e.vehicle_id = v.id 
            WHERE e.id = ?
        `).get(result.lastInsertRowid);
        res.json(expense);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/expenses/:id', (req, res) => {
    const { id } = req.params;
    
    try {
        db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ DASHBOARD ROUTES ============
app.get('/api/dashboard', (req, res) => {
    try {
        // Total income
        const totalIncome = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM entries').get().total;
        
        // Total expenses
        const totalExpenses = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses').get().total;
        
        // Total vehicles
        const totalVehicles = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'active'").get().count;
        
        // Total entries
        const totalEntries = db.prepare('SELECT COUNT(*) as count FROM entries').get().count;
        
        // Expenses by type
        const expensesByType = db.prepare(`
            SELECT expense_type, SUM(amount) as total 
            FROM expenses 
            GROUP BY expense_type 
            ORDER BY total DESC
        `).all();
        
        // Recent entries (last 5)
        const recentEntries = db.prepare(`
            SELECT e.*, v.car_number 
            FROM entries e 
            LEFT JOIN vehicles v ON e.vehicle_id = v.id 
            ORDER BY e.created_at DESC 
            LIMIT 5
        `).all();
        
        // Recent expenses (last 5)
        const recentExpenses = db.prepare(`
            SELECT e.*, v.car_number 
            FROM expenses e 
            LEFT JOIN vehicles v ON e.vehicle_id = v.id 
            ORDER BY e.created_at DESC 
            LIMIT 5
        `).all();
        
        // Income by product
        const incomeByProduct = db.prepare(`
            SELECT product_name, SUM(amount) as total, SUM(weight_kg) as total_weight
            FROM entries 
            GROUP BY product_name 
            ORDER BY total DESC
        `).all();
        
        // Vehicle-wise summary
        const vehicleSummary = db.prepare(`
            SELECT 
                v.id,
                v.car_number,
                v.driver_name,
                COALESCE(SUM(e.amount), 0) as total_income,
                COALESCE((SELECT SUM(amount) FROM expenses WHERE vehicle_id = v.id), 0) as total_expense
            FROM vehicles v
            LEFT JOIN entries e ON v.id = e.vehicle_id
            GROUP BY v.id
            ORDER BY total_income DESC
        `).all();
        
        // Monthly summary (current month)
        const currentMonthIncome = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM entries 
            WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
        `).get().total;
        
        const currentMonthExpenses = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM expenses 
            WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
        `).get().total;
        
        res.json({
            summary: {
                totalIncome,
                totalExpenses,
                netProfit: totalIncome - totalExpenses,
                totalVehicles,
                totalEntries,
                currentMonthIncome,
                currentMonthExpenses,
                currentMonthProfit: currentMonthIncome - currentMonthExpenses
            },
            expensesByType,
            incomeByProduct,
            vehicleSummary,
            recentEntries,
            recentExpenses
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════╗
║     BakuCT - Transport Management System       ║
╠════════════════════════════════════════════════╣
║  Server running at: http://localhost:${PORT}       ║
║  Login: admin / bakuct2024                     ║
╚════════════════════════════════════════════════╝
    `);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    db.close();
    process.exit();
});

