#!/bin/bash

# ============================================
# BakuCT - Party System Deployment Script
# Safe deployment with data preservation
# ============================================

set -e

APP_NAME="bakuct"
APP_DIR="/home/ubuntu/bakuct"
BACKUP_DIR="/home/ubuntu/bakuct/backups"

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║     BakuCT - Party System Deployment           ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Step 1: Create backup directory
echo "📦 Step 1: Creating backup..."
mkdir -p $BACKUP_DIR

# Step 2: Backup database
echo "💾 Step 2: Backing up database..."
BACKUP_FILE="$BACKUP_DIR/bakuct-$(date +%Y%m%d-%H%M%S).db"
cp $APP_DIR/bakuct.db $BACKUP_FILE
echo "   ✅ Backup saved to: $BACKUP_FILE"

# Step 3: Navigate to app directory
cd $APP_DIR

# Step 4: Run migration
echo "🔄 Step 3: Running migration..."
if [ -f "migrate-to-parties.js" ]; then
    node migrate-to-parties.js
    echo "   ✅ Migration completed"
else
    echo "   ❌ Error: migrate-to-parties.js not found!"
    exit 1
fi

# Step 5: Install dependencies
echo "📦 Step 4: Installing dependencies..."
npm install --production

# Step 6: Restart PM2
echo "🔄 Step 5: Restarting application..."
pm2 restart $APP_NAME

# Step 7: Wait for restart
sleep 3

# Step 8: Verify deployment
echo "✅ Step 6: Verifying deployment..."
if pm2 list | grep -q "$APP_NAME.*online"; then
    echo "   ✅ Application is running"
else
    echo "   ⚠️  Warning: Application status unclear"
fi

# Step 9: Check database
echo "🔍 Step 7: Verifying database..."
PARTY_COUNT=$(sqlite3 bakuct.db "SELECT COUNT(*) FROM parties;" 2>/dev/null || echo "0")
ENTRY_COUNT=$(sqlite3 bakuct.db "SELECT COUNT(*) FROM entries;" 2>/dev/null || echo "0")
ENTRIES_WITH_PARTY=$(sqlite3 bakuct.db "SELECT COUNT(*) FROM entries WHERE party_id IS NOT NULL;" 2>/dev/null || echo "0")

echo "   📊 Parties: $PARTY_COUNT"
echo "   📊 Total Entries: $ENTRY_COUNT"
echo "   📊 Entries with Party: $ENTRIES_WITH_PARTY"

if [ "$ENTRY_COUNT" -gt 0 ] && [ "$ENTRIES_WITH_PARTY" -eq "$ENTRY_COUNT" ]; then
    echo "   ✅ All entries linked to parties"
elif [ "$ENTRY_COUNT" -eq 0 ]; then
    echo "   ℹ️  No entries yet (this is normal for new installations)"
else
    echo "   ⚠️  Warning: Some entries may not be linked"
fi

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║           Deployment Complete! ✅              ║"
echo "╠════════════════════════════════════════════════╣"
echo "║                                                ║"
echo "║  ✅ Database backed up                         ║"
echo "║  ✅ Migration completed                        ║"
echo "║  ✅ Application restarted                      ║"
echo "║                                                ║"
echo "║  📊 Statistics:                                ║"
echo "║     Parties: $PARTY_COUNT                                      ║"
echo "║     Entries: $ENTRY_COUNT                                      ║"
echo "║                                                ║"
echo "║  🔗 Your app: https://bakuct.nvdenterprises.com ║"
echo "║                                                ║"
echo "║  📝 Next Steps:                                ║"
echo "║     1. Login and check Parties tab             ║"
echo "║     2. Verify existing entries show party      ║"
echo "║     3. Test adding new party                   ║"
echo "║     4. Test recording payment                  ║"
echo "║                                                ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "💾 Backup location: $BACKUP_FILE"
echo ""

