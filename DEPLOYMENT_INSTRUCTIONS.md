# Party System Deployment Instructions

## ✅ Safe Migration - Preserves All Existing Data

### Step 1: Backup Database (IMPORTANT!)

```bash
cd ~/bakuct
cp bakuct.db bakuct.db.backup-$(date +%Y%m%d-%H%M%S)
```

### Step 2: Run Migration Script

```bash
# Upload migrate-to-parties.js to your server
# Then run:
node migrate-to-parties.js
```

This will:
- ✅ Create `parties` table
- ✅ Create `payments` table  
- ✅ Add `party_id` column to `entries` table
- ✅ Create default "Cash/General" party
- ✅ Link all existing entries to default party
- ✅ **NO DATA LOSS** - All existing entries preserved

### Step 3: Deploy New Code

```bash
# Pull/upload new code
git pull
# OR upload new files

# Install dependencies (if any new ones)
npm install --production

# Restart application
pm2 restart bakuct

# Check logs
pm2 logs bakuct --lines 50
```

### Step 4: Verify Migration

```bash
# Check parties table
sqlite3 bakuct.db "SELECT * FROM parties;"

# Check entries have party_id
sqlite3 bakuct.db "SELECT COUNT(*) FROM entries WHERE party_id IS NOT NULL;"

# Check your existing entries count
sqlite3 bakuct.db "SELECT COUNT(*) FROM entries;"
```

## What Changed

### New Features:
1. **Parties Tab** - Add/manage clients/parties
2. **Party Selection** - Required when adding entries
3. **Payments Tracking** - Record payments received from parties
4. **Party Accounts** - View billed amount, paid amount, and balance per party
5. **Dashboard** - Party-wise summary table

### Database Changes:
- New table: `parties`
- New table: `payments`
- New column: `entries.party_id` (nullable, defaults to "Cash/General")

### Existing Data:
- ✅ All existing entries automatically linked to "Cash/General" party
- ✅ No data loss
- ✅ Backward compatible

## Rollback (if needed)

```bash
# Restore backup
cp bakuct.db.backup-YYYYMMDD-HHMMSS bakuct.db

# Restart
pm2 restart bakuct
```

## Testing After Deployment

1. ✅ Login to application
2. ✅ Check "Parties" tab - should see "Cash/General" party
3. ✅ Check existing entries - should show party name
4. ✅ Add new party
5. ✅ Add entry with new party
6. ✅ Record payment for party
7. ✅ Check dashboard - should show party summary

---

**All existing data is safe!** The migration is idempotent (safe to run multiple times).



