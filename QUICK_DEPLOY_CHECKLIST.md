# Quick Deployment Checklist - Miscellaneous Entry Feature

## ⚡ Quick Reference

### Files to Deploy (3 files):
1. `server.js`
2. `public/index.html`
3. `public/js/app.js`

### Risk Level: **LOW** ✅
- No database migration needed
- No schema changes
- Only code updates
- Estimated downtime: < 30 seconds

---

## 🚀 One-Command Deployment

### On Production Server:
```bash
cd ~/bakuct
./deploy-miscellaneous-entry.sh
```

That's it! The script will:
1. ✅ Backup database with verification
2. ✅ Backup current code files
3. ✅ Verify all files present
4. ✅ Install dependencies
5. ✅ Restart application
6. ✅ Verify deployment success
7. ✅ Check database integrity

---

## 📋 Manual Deployment (Step-by-Step)

### Step 1: Backup Database
```bash
cd ~/bakuct
BACKUP_DIR="/home/ubuntu/bakuct/backups"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
cp bakuct.db $BACKUP_DIR/bakuct.db.backup-$TIMESTAMP

# Verify backup
sqlite3 $BACKUP_DIR/bakuct.db.backup-$TIMESTAMP "SELECT COUNT(*) FROM entries;"
```

### Step 2: Upload Files
```bash
# From your local machine:
scp server.js ubuntu@your-server:~/bakuct/
scp public/index.html ubuntu@your-server:~/bakuct/public/
scp public/js/app.js ubuntu@your-server:~/bakuct/public/js/
```

### Step 3: Verify Files on Server
```bash
# On server:
cd ~/bakuct
ls -lh server.js public/index.html public/js/app.js
```

### Step 4: Restart Application
```bash
cd ~/bakuct
pm2 restart bakuct
sleep 3
pm2 status bakuct
```

### Step 5: Verify
```bash
# Check app is running
pm2 status

# Check logs
pm2 logs bakuct --lines 20

# Test in browser
# Visit: https://bakuct.nvdenterprises.com
```

---

## ✅ Post-Deployment Test

1. Login to application
2. Go to "Entries" tab
3. Select "Miscellaneous (Direct Amount)" from dropdown
4. Verify form shows:
   - ✅ Party field (required, visible)
   - ✅ Vehicle field (optional)
   - ✅ Amount field
   - ✅ Date field
   - ✅ Notes field
5. Add test entry:
   - Select a party
   - Enter amount: 6000
   - Select date
   - Click "Add Entry"
6. Verify entry appears with:
   - ✅ "💰 Miscellaneous" tag
   - ✅ Party name displayed
   - ✅ Correct amount

---

## 🔄 Rollback (If Needed)

```bash
cd ~/bakuct

# Find backup
ls -lt backups/bakuct.db.backup-*

# Restore database (replace TIMESTAMP)
cp backups/bakuct.db.backup-TIMESTAMP bakuct.db

# Restore code (replace TIMESTAMP)
cp backups/code-backup-TIMESTAMP/server.js .
cp backups/code-backup-TIMESTAMP/index.html public/
cp backups/code-backup-TIMESTAMP/app.js public/js/

# Restart
pm2 restart bakuct
```

---

## 📊 Verification Commands

```bash
# Check app status
pm2 status bakuct

# Check database
sqlite3 bakuct.db "SELECT COUNT(*) FROM entries;"

# Check logs
pm2 logs bakuct --lines 50

# Test HTTP response
curl -I http://localhost:3002
```

---

## 🎯 Summary

**What Changed:**
- Added "Miscellaneous (Direct Amount)" entry type
- Party selection required for miscellaneous entries
- Simple form: Party, Vehicle (optional), Amount, Date, Notes

**No Data Loss Risk:**
- ✅ No database schema changes
- ✅ All existing data preserved
- ✅ Backward compatible

**Ready to deploy!** 🚀

