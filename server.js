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

    -- Product rates table (updated with rate_per_minute)
    CREATE TABLE IF NOT EXISTS rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_name TEXT UNIQUE NOT NULL,
        rate_per_ton REAL,
        rate_per_minute REAL,
        rate_type TEXT DEFAULT 'per_ton',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Entries table (updated with entry_type and minutes)
    CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER,
        product_name TEXT NOT NULL,
        entry_type TEXT DEFAULT 'per_ton',
        weight_kg REAL,
        minutes REAL,
        rate_per_ton REAL,
        rate_per_minute REAL,
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

// Add new columns if they don't exist (migration)
try {
    db.exec(`ALTER TABLE rates ADD COLUMN rate_per_minute REAL`);
} catch (e) { /* column exists */ }
try {
    db.exec(`ALTER TABLE rates ADD COLUMN rate_type TEXT DEFAULT 'per_ton'`);
} catch (e) { /* column exists */ }
try {
    db.exec(`ALTER TABLE entries ADD COLUMN entry_type TEXT DEFAULT 'per_ton'`);
} catch (e) { /* column exists */ }
try {
    db.exec(`ALTER TABLE entries ADD COLUMN minutes REAL`);
} catch (e) { /* column exists */ }
try {
    db.exec(`ALTER TABLE entries ADD COLUMN rate_per_minute REAL`);
} catch (e) { /* column exists */ }

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
    const { product_name, rate_per_ton, rate_per_minute, rate_type } = req.body;
    
    if (!product_name) {
        return res.status(400).json({ error: 'Product name is required' });
    }
    
    if (rate_type === 'per_ton' && !rate_per_ton) {
        return res.status(400).json({ error: 'Rate per ton is required' });
    }
    
    if (rate_type === 'per_minute' && !rate_per_minute) {
        return res.status(400).json({ error: 'Rate per minute is required' });
    }
    
    try {
        const existing = db.prepare('SELECT * FROM rates WHERE product_name = ?').get(product_name);
        
        if (existing) {
            db.prepare('UPDATE rates SET rate_per_ton = ?, rate_per_minute = ?, rate_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                .run(rate_per_ton || null, rate_per_minute || null, rate_type || 'per_ton', existing.id);
            const rate = db.prepare('SELECT * FROM rates WHERE id = ?').get(existing.id);
            res.json(rate);
        } else {
            const stmt = db.prepare('INSERT INTO rates (product_name, rate_per_ton, rate_per_minute, rate_type) VALUES (?, ?, ?, ?)');
            const result = stmt.run(product_name, rate_per_ton || null, rate_per_minute || null, rate_type || 'per_ton');
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
    const { vehicle_id, product_name, entry_type, weight_kg, minutes, rate_per_ton, rate_per_minute, notes } = req.body;
    
    if (!product_name) {
        return res.status(400).json({ error: 'Product name is required' });
    }
    
    let amount = 0;
    
    if (entry_type === 'per_minute') {
        if (!minutes || !rate_per_minute) {
            return res.status(400).json({ error: 'Minutes and rate per minute are required' });
        }
        amount = minutes * rate_per_minute;
    } else {
        if (!weight_kg || !rate_per_ton) {
            return res.status(400).json({ error: 'Weight and rate per ton are required' });
        }
        amount = (weight_kg / 1000) * rate_per_ton;
    }
    
    try {
        const stmt = db.prepare(`
            INSERT INTO entries (vehicle_id, product_name, entry_type, weight_kg, minutes, rate_per_ton, rate_per_minute, amount, notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            vehicle_id || null, 
            product_name, 
            entry_type || 'per_ton',
            weight_kg || null, 
            minutes || null,
            rate_per_ton || null, 
            rate_per_minute || null,
            amount, 
            notes || null
        );
        
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
    const { startDate, endDate } = req.query;
    
    // Build date filters for different tables
    let entriesDateFilter = '';
    let expensesDateFilter = '';
    let entriesParams = [];
    let expensesParams = [];
    
    if (startDate && endDate) {
        entriesDateFilter = "AND date(e.created_at) BETWEEN date(?) AND date(?)";
        expensesDateFilter = "AND date(exp.created_at) BETWEEN date(?) AND date(?)";
        entriesParams = [startDate, endDate];
        expensesParams = [startDate, endDate];
    } else {
        // Default to current month
        entriesDateFilter = "AND strftime('%Y-%m', e.created_at) = strftime('%Y-%m', 'now')";
        expensesDateFilter = "AND strftime('%Y-%m', exp.created_at) = strftime('%Y-%m', 'now')";
    }
    
    try {
        // Filtered income
        const filteredIncome = db.prepare(`
            SELECT COALESCE(SUM(e.amount), 0) as total FROM entries e WHERE 1=1 ${entriesDateFilter}
        `).get(...entriesParams).total;
        
        // Filtered expenses
        const filteredExpenses = db.prepare(`
            SELECT COALESCE(SUM(exp.amount), 0) as total FROM expenses exp WHERE 1=1 ${expensesDateFilter}
        `).get(...expensesParams).total;
        
        // Total vehicles (active)
        const totalVehicles = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'active' OR status IS NULL").get().count;
        
        // Filtered entries count
        const filteredEntriesCount = db.prepare(`
            SELECT COUNT(*) as count FROM entries e WHERE 1=1 ${entriesDateFilter}
        `).get(...entriesParams).count;
        
        // Expenses by type (filtered)
        const expensesByType = db.prepare(`
            SELECT exp.expense_type, SUM(exp.amount) as total 
            FROM expenses exp
            WHERE 1=1 ${expensesDateFilter}
            GROUP BY exp.expense_type 
            ORDER BY total DESC
        `).all(...expensesParams);
        
        // Recent entries (last 5, filtered)
        const recentEntries = db.prepare(`
            SELECT e.*, v.car_number 
            FROM entries e 
            LEFT JOIN vehicles v ON e.vehicle_id = v.id 
            WHERE 1=1 ${entriesDateFilter}
            ORDER BY e.created_at DESC 
            LIMIT 5
        `).all(...entriesParams);
        
        // Recent expenses (last 5, filtered)
        const recentExpenses = db.prepare(`
            SELECT exp.*, v.car_number 
            FROM expenses exp
            LEFT JOIN vehicles v ON exp.vehicle_id = v.id 
            WHERE 1=1 ${expensesDateFilter}
            ORDER BY exp.created_at DESC 
            LIMIT 5
        `).all(...expensesParams);
        
        // Income by product (filtered)
        const incomeByProduct = db.prepare(`
            SELECT e.product_name, e.entry_type, SUM(e.amount) as total, SUM(e.weight_kg) as total_weight, SUM(e.minutes) as total_minutes
            FROM entries e
            WHERE 1=1 ${entriesDateFilter}
            GROUP BY e.product_name 
            ORDER BY total DESC
        `).all(...entriesParams);
        
        // Vehicle-wise summary (no date filter for simplicity)
        const vehicleSummary = db.prepare(`
            SELECT 
                v.id,
                v.car_number,
                v.driver_name,
                COALESCE((SELECT SUM(amount) FROM entries WHERE vehicle_id = v.id), 0) as total_income,
                COALESCE((SELECT SUM(amount) FROM expenses WHERE vehicle_id = v.id), 0) as total_expense
            FROM vehicles v
            ORDER BY total_income DESC
        `).all();
        
        // All-time totals for comparison
        const allTimeIncome = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM entries').get().total;
        const allTimeExpenses = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses').get().total;
        
        res.json({
            summary: {
                filteredIncome,
                filteredExpenses,
                filteredProfit: filteredIncome - filteredExpenses,
                totalVehicles,
                filteredEntriesCount,
                allTimeIncome,
                allTimeExpenses,
                allTimeProfit: allTimeIncome - allTimeExpenses
            },
            expensesByType,
            incomeByProduct,
            vehicleSummary,
            recentEntries,
            recentExpenses,
            dateRange: {
                startDate: startDate || 'current_month_start',
                endDate: endDate || 'current_month_end'
            }
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
