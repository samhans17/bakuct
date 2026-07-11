/**
 * BakuCT - Database Backup
 *
 * Creates a safe, timestamped backup of bakuct.db into ./backups and then
 * keeps only the most recent KEEP backups (older ones are deleted).
 *
 * Uses better-sqlite3's online backup API, so it is safe to run while the
 * app is live (no risk of copying a half-written database).
 *
 * Run manually:   node backup.js
 * Run weekly:     via cron (see README / setup notes)
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Keep this many most-recent backups. Run weekly => ~2 weeks of history.
const KEEP = 2;

const SRC = path.join(__dirname, 'bakuct.db');
const BACKUP_DIR = path.join(__dirname, 'backups');

function pad(n) { return String(n).padStart(2, '0'); }

function stamp() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function main() {
    if (!fs.existsSync(SRC)) {
        console.error(`[backup] Source database not found: ${SRC}`);
        process.exit(1);
    }

    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const dest = path.join(BACKUP_DIR, `bakuct-${stamp()}.db`);

    const db = new Database(SRC, { readonly: true });
    try {
        await db.backup(dest);
    } finally {
        db.close();
    }
    console.log(`[backup] Created ${dest}`);

    // Rotation: keep only the KEEP most recent backups (by modified time).
    const backups = fs.readdirSync(BACKUP_DIR)
        .filter(f => /^bakuct-.*\.db$/.test(f))
        .map(f => ({ file: f, mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime);

    for (const { file } of backups.slice(KEEP)) {
        fs.unlinkSync(path.join(BACKUP_DIR, file));
        console.log(`[backup] Removed old backup ${file}`);
    }

    console.log(`[backup] Done. ${Math.min(backups.length, KEEP)} backup(s) retained.`);
}

main().catch(err => {
    console.error('[backup] Failed:', err);
    process.exit(1);
});
