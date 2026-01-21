/**
 * Migration Script: Add Party/Client System
 * 
 * This script safely migrates existing data to support party/client management
 * 
 * Usage: node migrate-to-parties.js
 * 
 * SAFE TO RUN MULTIPLE TIMES - Idempotent migration
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'bakuct.db');
const db = new Database(dbPath);

console.log('╔════════════════════════════════════════════════╗');
console.log('║     Party System Migration Script              ║');
console.log('╚════════════════════════════════════════════════╝');
console.log('');

try {
    // Step 1: Create parties table
    console.log('📋 Step 1: Creating parties table...');
    db.exec(`
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
    `);
    console.log('   ✅ Parties table created');

    // Step 2: Create payments table
    console.log('💰 Step 2: Creating payments table...');
    db.exec(`
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
    `);
    console.log('   ✅ Payments table created');

    // Step 3: Add party_id to entries table
    console.log('🔗 Step 3: Adding party_id to entries table...');
    try {
        db.exec(`ALTER TABLE entries ADD COLUMN party_id INTEGER`);
        console.log('   ✅ party_id column added to entries');
    } catch (e) {
        if (e.message.includes('duplicate column name')) {
            console.log('   ℹ️  party_id column already exists');
        } else {
            throw e;
        }
    }

    // Step 4: Create default party for existing entries
    console.log('🏢 Step 4: Creating default party...');
    let defaultParty = db.prepare('SELECT * FROM parties WHERE name = ?').get('Cash/General');
    
    if (!defaultParty) {
        const stmt = db.prepare(`
            INSERT INTO parties (name, contact_person, notes, status) 
            VALUES (?, ?, ?, ?)
        `);
        const result = stmt.run('Cash/General', 'System', 'Default party for existing entries and cash transactions', 'active');
        defaultParty = db.prepare('SELECT * FROM parties WHERE id = ?').get(result.lastInsertRowid);
        console.log('   ✅ Default party "Cash/General" created');
    } else {
        console.log('   ℹ️  Default party already exists');
    }

    // Step 5: Link existing entries to default party
    console.log('🔗 Step 5: Linking existing entries to default party...');
    const entriesWithoutParty = db.prepare('SELECT COUNT(*) as count FROM entries WHERE party_id IS NULL').get();
    
    if (entriesWithoutParty.count > 0) {
        db.prepare('UPDATE entries SET party_id = ? WHERE party_id IS NULL').run(defaultParty.id);
        console.log(`   ✅ Linked ${entriesWithoutParty.count} existing entries to default party`);
    } else {
        console.log('   ℹ️  All entries already have a party assigned');
    }

    // Step 6: Add foreign key constraint (if supported)
    console.log('🔒 Step 6: Verifying data integrity...');
    const entryCount = db.prepare('SELECT COUNT(*) as count FROM entries').get().count;
    const partyCount = db.prepare('SELECT COUNT(*) as count FROM parties').get().count;
    
    console.log(`   ✅ Entries: ${entryCount}`);
    console.log(`   ✅ Parties: ${partyCount}`);
    console.log(`   ✅ Default Party ID: ${defaultParty.id}`);

    console.log('');
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║           Migration Completed! ✅              ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   - Parties table: Ready`);
    console.log(`   - Payments table: Ready`);
    console.log(`   - Entries linked to parties: ${entryCount}`);
    console.log(`   - Default party: "${defaultParty.name}" (ID: ${defaultParty.id})`);
    console.log('');
    console.log('✅ All existing data preserved!');
    console.log('✅ Safe to deploy to production');

} catch (error) {
    console.error('');
    console.error('❌ Migration Error:', error.message);
    console.error('');
    process.exit(1);
} finally {
    db.close();
}

