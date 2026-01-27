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

    -- Parties table (clients/customers)
    CREATE TABLE IF NOT EXISTS parties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        contact_person TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        status TEXT DEFAULT 'active',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Entries table (updated with entry_type, minutes, and party_id)
    CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        party_id INTEGER,
        vehicle_id INTEGER,
        product_name TEXT NOT NULL,
        entry_type TEXT DEFAULT 'per_ton',
        weight_kg REAL,
        minutes REAL,
        rate_per_ton REAL,
        rate_per_minute REAL,
        amount REAL NOT NULL,
        notes TEXT,
        entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (party_id) REFERENCES parties(id),
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
        expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    );

    -- Payments table (payments received from parties)
    CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        party_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        payment_date DATE NOT NULL,
        payment_method TEXT DEFAULT 'cash',
        reference_number TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (party_id) REFERENCES parties(id)
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
try {
    db.exec(`ALTER TABLE entries ADD COLUMN party_id INTEGER`);
} catch (e) { /* column exists */ }
try {
    db.exec(`ALTER TABLE entries ADD COLUMN entry_date DATE DEFAULT CURRENT_DATE`);
} catch (e) { /* column exists */ }
try {
    db.exec(`ALTER TABLE expenses ADD COLUMN expense_date DATE DEFAULT CURRENT_DATE`);
} catch (e) { /* column exists */ }

// Create default party and link existing entries
try {
    let defaultParty = db.prepare('SELECT * FROM parties WHERE name = ?').get('Cash/General');
    
    if (!defaultParty) {
        const stmt = db.prepare(`
            INSERT INTO parties (name, contact_person, notes, status) 
            VALUES (?, ?, ?, ?)
        `);
        const result = stmt.run('Cash/General', 'System', 'Default party for existing entries and cash transactions', 'active');
        defaultParty = db.prepare('SELECT * FROM parties WHERE id = ?').get(result.lastInsertRowid);
    }
    
    // Link existing entries without party to default party
    db.prepare('UPDATE entries SET party_id = ? WHERE party_id IS NULL').run(defaultParty.id);
} catch (e) {
    console.error('Migration error:', e.message);
}

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

// ============ PARTIES ROUTES ============
app.get('/api/parties', (req, res) => {
    const parties = db.prepare('SELECT * FROM parties ORDER BY name').all();
    res.json(parties);
});

app.post('/api/parties', (req, res) => {
    const { name, contact_person, phone, email, address, notes } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: 'Party name is required' });
    }
    
    try {
        const stmt = db.prepare(`
            INSERT INTO parties (name, contact_person, phone, email, address, notes) 
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            name, 
            contact_person || null, 
            phone || null, 
            email || null, 
            address || null, 
            notes || null
        );
        
        const party = db.prepare('SELECT * FROM parties WHERE id = ?').get(result.lastInsertRowid);
        res.json(party);
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            res.status(400).json({ error: 'Party with this name already exists' });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

app.put('/api/parties/:id', (req, res) => {
    const { id } = req.params;
    const { name, contact_person, phone, email, address, status, notes } = req.body;
    
    try {
        db.prepare(`
            UPDATE parties 
            SET name = ?, contact_person = ?, phone = ?, email = ?, address = ?, status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `).run(name, contact_person, phone, email, address, status, notes, id);
        
        const party = db.prepare('SELECT * FROM parties WHERE id = ?').get(id);
        res.json(party);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/parties/:id', (req, res) => {
    const { id } = req.params;
    
    // Check if party has entries
    const entryCount = db.prepare('SELECT COUNT(*) as count FROM entries WHERE party_id = ?').get(id).count;
    
    if (entryCount > 0) {
        return res.status(400).json({ error: `Cannot delete party. It has ${entryCount} entries. Please reassign entries first.` });
    }
    
    try {
        db.prepare('DELETE FROM parties WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get party summary (total billed, total paid, balance)
app.get('/api/parties/:id/summary', (req, res) => {
    const { id } = req.params;
    
    try {
        const totalBilled = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM entries WHERE party_id = ?').get(id).total;
        const totalPaid = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE party_id = ?').get(id).total;
        const balance = totalBilled - totalPaid;
        
        const party = db.prepare('SELECT * FROM parties WHERE id = ?').get(id);
        
        res.json({
            party,
            totalBilled,
            totalPaid,
            balance
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ PAYMENTS ROUTES ============
app.get('/api/payments', (req, res) => {
    const { party_id } = req.query;
    
    let query = `
        SELECT p.*, pt.name as party_name 
        FROM payments p 
        LEFT JOIN parties pt ON p.party_id = pt.id
    `;
    
    if (party_id) {
        query += ' WHERE p.party_id = ?';
        const payments = db.prepare(query + ' ORDER BY p.payment_date DESC').all(party_id);
        res.json(payments);
    } else {
        const payments = db.prepare(query + ' ORDER BY p.payment_date DESC').all();
        res.json(payments);
    }
});

app.post('/api/payments', (req, res) => {
    const { party_id, amount, payment_date, payment_method, reference_number, notes } = req.body;
    
    if (!party_id || !amount || !payment_date) {
        return res.status(400).json({ error: 'Party, amount, and payment date are required' });
    }
    
    try {
        const stmt = db.prepare(`
            INSERT INTO payments (party_id, amount, payment_date, payment_method, reference_number, notes) 
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            party_id, 
            amount, 
            payment_date, 
            payment_method || 'cash', 
            reference_number || null, 
            notes || null
        );
        
        const payment = db.prepare(`
            SELECT p.*, pt.name as party_name 
            FROM payments p 
            LEFT JOIN parties pt ON p.party_id = pt.id 
            WHERE p.id = ?
        `).get(result.lastInsertRowid);
        res.json(payment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/payments/:id', (req, res) => {
    const { id } = req.params;
    
    try {
        db.prepare('DELETE FROM payments WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ ENTRIES ROUTES ============
app.get('/api/entries', (req, res) => {
    const { party_id } = req.query;
    
    let query = `
        SELECT e.*, v.car_number, pt.name as party_name 
        FROM entries e 
        LEFT JOIN vehicles v ON e.vehicle_id = v.id 
        LEFT JOIN parties pt ON e.party_id = pt.id
    `;
    
    if (party_id) {
        query += ' WHERE e.party_id = ?';
        const entries = db.prepare(query + ' ORDER BY COALESCE(e.entry_date, e.created_at) DESC').all(party_id);
        res.json(entries);
    } else {
        const entries = db.prepare(query + ' ORDER BY COALESCE(e.entry_date, e.created_at) DESC').all();
        res.json(entries);
    }
});

app.post('/api/entries', (req, res) => {
    const { party_id, vehicle_id, product_name, entry_type, weight_kg, minutes, rate_per_ton, rate_per_minute, amount, notes, entry_date } = req.body;
    
    let finalProductName = product_name || 'Miscellaneous';
    let finalPartyId = party_id;
    let finalAmount = amount || 0;
    
    // Handle miscellaneous entries (direct amount entry)
    if (entry_type === 'miscellaneous') {
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Amount is required for miscellaneous entries' });
        }
        if (!party_id) {
            return res.status(400).json({ error: 'Party is required for miscellaneous entries' });
        }
        finalProductName = 'Miscellaneous';
        finalPartyId = party_id;
    } else {
        // Regular entries require product name
        if (!finalProductName) {
            return res.status(400).json({ error: 'Product name is required' });
        }
        
        // Get default party if not provided
        if (!finalPartyId) {
            const defaultParty = db.prepare('SELECT * FROM parties WHERE name = ?').get('Cash/General');
            if (defaultParty) {
                finalPartyId = defaultParty.id;
            }
        }
        
        // Calculate amount based on entry type
        if (entry_type === 'per_minute') {
            if (!minutes || !rate_per_minute) {
                return res.status(400).json({ error: 'Minutes and rate per minute are required' });
            }
            finalAmount = minutes * rate_per_minute;
        } else {
            if (!weight_kg || !rate_per_ton) {
                return res.status(400).json({ error: 'Weight and rate per ton are required' });
            }
            finalAmount = (weight_kg / 1000) * rate_per_ton;
        }
    }
    
    try {
        const stmt = db.prepare(`
            INSERT INTO entries (party_id, vehicle_id, product_name, entry_type, weight_kg, minutes, rate_per_ton, rate_per_minute, amount, notes, entry_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            finalPartyId || null,
            vehicle_id || null, 
            finalProductName, 
            entry_type || 'per_ton',
            weight_kg || null, 
            minutes || null,
            rate_per_ton || null, 
            rate_per_minute || null,
            finalAmount, 
            notes || null,
            entry_date || new Date().toISOString().split('T')[0]
        );
        
        const entry = db.prepare(`
            SELECT e.*, v.car_number, pt.name as party_name 
            FROM entries e 
            LEFT JOIN vehicles v ON e.vehicle_id = v.id 
            LEFT JOIN parties pt ON e.party_id = pt.id
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
        ORDER BY COALESCE(e.expense_date, e.created_at) DESC
    `).all();
    res.json(expenses);
});

app.post('/api/expenses', (req, res) => {
    const { vehicle_id, expense_type, amount, liters, fuel_rate, description, expense_date } = req.body;
    
    if (!expense_type || !amount) {
        return res.status(400).json({ error: 'Expense type and amount are required' });
    }
    
    try {
        const stmt = db.prepare('INSERT INTO expenses (vehicle_id, expense_type, amount, liters, fuel_rate, description, expense_date) VALUES (?, ?, ?, ?, ?, ?, ?)');
        const result = stmt.run(vehicle_id || null, expense_type, amount, liters || null, fuel_rate || null, description || null, expense_date || new Date().toISOString().split('T')[0]);
        
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
        entriesDateFilter = "AND date(COALESCE(e.entry_date, e.created_at)) BETWEEN date(?) AND date(?)";
        expensesDateFilter = "AND date(COALESCE(exp.expense_date, exp.created_at)) BETWEEN date(?) AND date(?)";
        entriesParams = [startDate, endDate];
        expensesParams = [startDate, endDate];
    } else {
        // Default to current month
        entriesDateFilter = "AND strftime('%Y-%m', COALESCE(e.entry_date, e.created_at)) = strftime('%Y-%m', 'now')";
        expensesDateFilter = "AND strftime('%Y-%m', COALESCE(exp.expense_date, exp.created_at)) = strftime('%Y-%m', 'now')";
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
            SELECT e.*, v.car_number, pt.name as party_name 
            FROM entries e 
            LEFT JOIN vehicles v ON e.vehicle_id = v.id 
            LEFT JOIN parties pt ON e.party_id = pt.id
            WHERE 1=1 ${entriesDateFilter}
            ORDER BY COALESCE(e.entry_date, e.created_at) DESC 
            LIMIT 5
        `).all(...entriesParams);
        
        // Party-wise summary
        let partySummaryQuery = `
            SELECT 
                pt.id,
                pt.name,
                pt.contact_person,
                pt.phone,
                COALESCE(SUM(e.amount), 0) as total_billed,
                COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.party_id = pt.id), 0) as total_paid
            FROM parties pt
            LEFT JOIN entries e ON pt.id = e.party_id ${entriesDateFilter}
            WHERE (pt.status = 'active' OR pt.status IS NULL)
            GROUP BY pt.id
            HAVING total_billed > 0 OR total_paid > 0
            ORDER BY total_billed DESC
        `;
        const partySummary = db.prepare(partySummaryQuery).all(...entriesParams);
        
        // Recent expenses (last 5, filtered)
        const recentExpenses = db.prepare(`
            SELECT exp.*, v.car_number 
            FROM expenses exp
            LEFT JOIN vehicles v ON exp.vehicle_id = v.id 
            WHERE 1=1 ${expensesDateFilter}
            ORDER BY COALESCE(exp.expense_date, exp.created_at) DESC 
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
            partySummary,
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
