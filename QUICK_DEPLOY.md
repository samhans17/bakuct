# Quick Deployment Guide - Party System

## 🚀 One-Command Deployment

### On Your EC2 Server:

```bash
cd ~/bakuct
./deploy-party-system.sh
```

That's it! The script will:
1. ✅ Backup your database
2. ✅ Run migration (preserves all data)
3. ✅ Install dependencies
4. ✅ Restart the app
5. ✅ Verify everything works

---

## 📋 Manual Deployment (if needed)

### Step 1: Backup
```bash
cd ~/bakuct
cp bakuct.db bakuct.db.backup-$(date +%Y%m%d-%H%M%S)
```

### Step 2: Upload Files
Upload these files to your server:
- `server.js`
- `migrate-to-parties.js`
- `public/index.html`
- `public/js/app.js`
- `public/css/styles.css`
- `package.json` (if updated)

### Step 3: Run Migration
```bash
cd ~/bakuct
node migrate-to-parties.js
```

### Step 4: Install & Restart
```bash
npm install --production
pm2 restart bakuct
```

### Step 5: Verify
```bash
# Check app is running
pm2 status

# Check parties table
sqlite3 bakuct.db "SELECT * FROM parties;"

# Check entries have party_id
sqlite3 bakuct.db "SELECT COUNT(*) FROM entries WHERE party_id IS NOT NULL;"
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] App loads at https://bakuct.nvdenterprises.com
- [ ] Can login (admin/bakuct2024)
- [ ] "Parties" tab appears in navigation
- [ ] "Cash/General" party exists in Parties tab
- [ ] Existing entries show party name
- [ ] Can add new party
- [ ] Can add entry with party selection
- [ ] Can record payment
- [ ] Dashboard shows Party Accounts table

---

## 🔄 Rollback (if needed)

```bash
cd ~/bakuct
cp bakuct.db.backup-YYYYMMDD-HHMMSS bakuct.db
pm2 restart bakuct
```

---

**Ready to deploy!** 🚀

