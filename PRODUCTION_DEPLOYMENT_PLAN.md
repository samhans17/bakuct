# Production Deployment Plan - Miscellaneous Entry Feature

## 🎯 Objective
Deploy the miscellaneous entry feature to production **without losing any data**.

---

## ✅ Pre-Deployment Checklist

### 1. Verify Current Production State
```bash
# On production server, check:
cd ~/bakuct

# Check current app status
pm2 status bakuct

# Check database exists and is accessible
sqlite3 bakuct.db "SELECT COUNT(*) FROM entries;"
sqlite3 bakuct.db "SELECT COUNT(*) FROM parties;"
sqlite3 bakuct.db "SELECT COUNT(*) FROM vehicles;"

# Check current version/files
ls -la server.js public/index.html public/js/app.js
```

### 2. Create Complete Backup
```bash
# On production server:
cd ~/bakuct

# Create backup directory with timestamp
BACKUP_DIR="/home/ubuntu/bakuct/backups"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Backup database
cp bakuct.db $BACKUP_DIR/bakuct.db.backup-$TIMESTAMP

# Backup current code files (in case we need to rollback)
mkdir -p $BACKUP_DIR/code-backup-$TIMESTAMP
cp server.js $BACKUP_DIR/code-backup-$TIMESTAMP/
cp public/index.html $BACKUP_DIR/code-backup-$TIMESTAMP/
cp public/js/app.js $BACKUP_DIR/code-backup-$TIMESTAMP/

# Verify backup
ls -lh $BACKUP_DIR/bakuct.db.backup-$TIMESTAMP
echo "✅ Backup created: $BACKUP_DIR/bakuct.db.backup-$TIMESTAMP"
```

### 3. Verify Backup Integrity
```bash
# Check backup database is valid
sqlite3 $BACKUP_DIR/bakuct.db.backup-$TIMESTAMP "SELECT COUNT(*) FROM entries;"

# Compare record counts
CURRENT_COUNT=$(sqlite3 bakuct.db "SELECT COUNT(*) FROM entries;")
BACKUP_COUNT=$(sqlite3 $BACKUP_DIR/bakuct.db.backup-$TIMESTAMP "SELECT COUNT(*) FROM entries;")

if [ "$CURRENT_COUNT" -eq "$BACKUP_COUNT" ]; then
    echo "✅ Backup verified: $CURRENT_COUNT entries match"
else
    echo "❌ ERROR: Backup mismatch! Current: $CURRENT_COUNT, Backup: $BACKUP_COUNT"
    exit 1
fi
```

---

## 📦 Deployment Steps

### Step 1: Prepare Files Locally

**On your local machine, verify these files are ready:**
- ✅ `server.js` (updated with miscellaneous entry support)
- ✅ `public/index.html` (updated with miscellaneous entry UI)
- ✅ `public/js/app.js` (updated with miscellaneous entry logic)

**Verify file sizes are reasonable:**
```bash
# On local machine
ls -lh server.js public/index.html public/js/app.js
```

### Step 2: Upload Files to Production

**Option A: Using SCP (Secure Copy)**
```bash
# On your local machine:
# Replace 'your-server-ip' with actual server IP or domain

# Upload files
scp server.js ubuntu@your-server-ip:~/bakuct/
scp public/index.html ubuntu@your-server-ip:~/bakuct/public/
scp public/js/app.js ubuntu@your-server-ip:~/bakuct/public/js/

# Verify upload
ssh ubuntu@your-server-ip "cd ~/bakuct && ls -lh server.js public/index.html public/js/app.js"
```

**Option B: Using Git (if using version control)**
```bash
# On production server:
cd ~/bakuct
git pull origin main  # or your branch name
```

**Option C: Using SFTP/FTP Client**
- Upload the 3 files to their respective locations
- Verify file permissions are correct

### Step 3: Verify Files on Server

**On production server:**
```bash
cd ~/bakuct

# Check files exist and have content
if [ -f "server.js" ] && [ -f "public/index.html" ] && [ -f "public/js/app.js" ]; then
    echo "✅ All files present"
    
    # Check file sizes (should not be 0)
    if [ -s "server.js" ] && [ -s "public/index.html" ] && [ -s "public/js/app.js" ]; then
        echo "✅ All files have content"
    else
        echo "❌ ERROR: One or more files are empty!"
        exit 1
    fi
else
    echo "❌ ERROR: Missing required files!"
    exit 1
fi

# Verify file permissions
chmod 644 server.js public/index.html public/js/app.js
```

### Step 4: Install Dependencies (if needed)

```bash
cd ~/bakuct

# Check if package.json changed
# If no changes, skip this step
npm install --production
```

### Step 5: Test Database Schema (No Migration Needed)

```bash
# Verify database structure is intact
sqlite3 bakuct.db ".schema entries"

# Check existing entries
sqlite3 bakuct.db "SELECT COUNT(*) as total FROM entries;"
sqlite3 bakuct.db "SELECT COUNT(*) as with_party FROM entries WHERE party_id IS NOT NULL;"

# Verify parties table exists
sqlite3 bakuct.db "SELECT COUNT(*) FROM parties;"
```

**Note:** No database migration needed - we're only using existing columns.

### Step 6: Restart Application

```bash
cd ~/bakuct

# Restart PM2 process
pm2 restart bakuct

# Wait for restart
sleep 5

# Check status
pm2 status bakuct

# Check logs for errors
pm2 logs bakuct --lines 30 --nostream
```

### Step 7: Verify Application is Running

```bash
# Check PM2 status
pm2 status bakuct

# Should show: "online" status

# Check if app responds
curl -I http://localhost:3002

# Check recent logs for errors
pm2 logs bakuct --lines 50 --nostream | grep -i error
```

---

## 🧪 Post-Deployment Testing

### Test 1: Application Accessibility
```bash
# From your browser or using curl:
# Visit: https://bakuct.nvdenterprises.com

# Should see login page
```

### Test 2: Login and Basic Functionality
- [ ] Login with credentials (admin/bakuct2024)
- [ ] Dashboard loads correctly
- [ ] Existing entries are visible
- [ ] Existing parties are visible
- [ ] No errors in browser console (F12)

### Test 3: Test Miscellaneous Entry Feature
- [ ] Navigate to "Entries" tab
- [ ] Select "Miscellaneous (Direct Amount)" from Entry Type dropdown
- [ ] Verify form shows:
  - [ ] Party field (required, visible)
  - [ ] Vehicle field (optional)
  - [ ] Amount field (required)
  - [ ] Date field (required)
  - [ ] Notes field (optional)
  - [ ] Product field is hidden
  - [ ] Weight/Minutes fields are hidden
- [ ] Select a party from dropdown
- [ ] Enter amount: 6000
- [ ] Select today's date
- [ ] Add note: "Test miscellaneous entry"
- [ ] Click "Add Entry"
- [ ] Verify entry appears in list with:
  - [ ] "💰 Miscellaneous" tag
  - [ ] Party name displayed
  - [ ] Correct amount (Rs. 6,000)
  - [ ] Correct date

### Test 4: Verify Data Integrity
```bash
# On server, check database:
sqlite3 bakuct.db "SELECT COUNT(*) FROM entries;"

# Compare with pre-deployment count
# Should be same or higher (if you added test entry)
```

### Test 5: Verify Existing Data Still Works
- [ ] View existing entries (should all display correctly)
- [ ] Add a regular entry (per ton or per minute)
- [ ] Verify dashboard calculations are correct
- [ ] Check party summaries still work

---

## 🔄 Rollback Plan (If Something Goes Wrong)

### Quick Rollback Steps

**Step 1: Stop Application**
```bash
pm2 stop bakuct
```

**Step 2: Restore Database (if needed)**
```bash
cd ~/bakuct
# Find your backup file
ls -lt backups/bakuct.db.backup-*

# Restore (replace TIMESTAMP with actual timestamp)
cp backups/bakuct.db.backup-TIMESTAMP bakuct.db

# Verify restore
sqlite3 bakuct.db "SELECT COUNT(*) FROM entries;"
```

**Step 3: Restore Code Files (if needed)**
```bash
cd ~/bakuct
# Find your code backup
ls -lt backups/code-backup-*

# Restore files (replace TIMESTAMP with actual timestamp)
cp backups/code-backup-TIMESTAMP/server.js .
cp backups/code-backup-TIMESTAMP/index.html public/
cp backups/code-backup-TIMESTAMP/app.js public/js/
```

**Step 4: Restart Application**
```bash
pm2 restart bakuct
pm2 logs bakuct --lines 30
```

---

## 📊 Deployment Verification Checklist

After deployment, verify:

- [ ] ✅ Database backup created and verified
- [ ] ✅ All 3 files uploaded successfully
- [ ] ✅ Application restarted without errors
- [ ] ✅ Application accessible via browser
- [ ] ✅ Can login successfully
- [ ] ✅ Existing entries display correctly
- [ ] ✅ Miscellaneous entry option appears in dropdown
- [ ] ✅ Can create miscellaneous entry successfully
- [ ] ✅ Miscellaneous entry displays correctly in list
- [ ] ✅ Party selection works for miscellaneous entries
- [ ] ✅ Dashboard calculations are correct
- [ ] ✅ No errors in browser console
- [ ] ✅ No errors in server logs

---

## 🚨 Emergency Contacts & Info

**Server Details:**
- Domain: bakuct.nvdenterprises.com
- App Directory: `/home/ubuntu/bakuct`
- Database: `bakuct.db`
- PM2 Process: `bakuct`
- Port: `3002`

**Backup Location:**
- `/home/ubuntu/bakuct/backups/`

**Useful Commands:**
```bash
# View logs
pm2 logs bakuct

# Check status
pm2 status

# Restart app
pm2 restart bakuct

# Check database
sqlite3 bakuct.db "SELECT COUNT(*) FROM entries;"

# Check recent entries
sqlite3 bakuct.db "SELECT * FROM entries ORDER BY created_at DESC LIMIT 5;"
```

---

## 📝 Deployment Log Template

**Date:** _______________
**Deployed by:** _______________
**Backup file:** _______________
**Pre-deployment entry count:** _______________
**Post-deployment entry count:** _______________
**Issues encountered:** _______________
**Rollback needed:** Yes / No
**Notes:** _______________

---

## ✅ Final Checklist Before Deployment

- [ ] All code changes tested locally
- [ ] Backup strategy confirmed
- [ ] Rollback plan understood
- [ ] Server access verified
- [ ] Deployment window scheduled (if needed)
- [ ] Team notified (if applicable)
- [ ] Monitoring ready

---

## 🎯 Summary

**Files to Deploy:**
1. `server.js`
2. `public/index.html`
3. `public/js/app.js`

**No Database Changes Required** ✅

**Risk Level:** LOW (no schema changes, only code updates)

**Estimated Downtime:** < 30 seconds (PM2 restart)

**Ready to deploy!** 🚀

