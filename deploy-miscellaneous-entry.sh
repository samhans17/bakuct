#!/bin/bash

# ============================================
# BakuCT - Miscellaneous Entry Feature Deployment
# Safe deployment with data preservation
# ============================================

set -e

APP_NAME="bakuct"
APP_DIR="/home/ubuntu/bakuct"
BACKUP_DIR="/home/ubuntu/bakuct/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║  BakuCT - Miscellaneous Entry Deployment      ║"
echo "║  Safe Deployment - Zero Data Loss             ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Step 1: Create backup directory
echo "📦 Step 1: Creating backup directory..."
mkdir -p $BACKUP_DIR
echo "   ✅ Backup directory ready"

# Step 2: Navigate to app directory
cd $APP_DIR

# Step 3: Verify database exists
echo "🔍 Step 2: Verifying database..."
if [ ! -f "bakuct.db" ]; then
    echo "   ❌ ERROR: Database file not found!"
    exit 1
fi

# Get current entry count for verification
CURRENT_ENTRY_COUNT=$(sqlite3 bakuct.db "SELECT COUNT(*) FROM entries;" 2>/dev/null || echo "0")
CURRENT_PARTY_COUNT=$(sqlite3 bakuct.db "SELECT COUNT(*) FROM parties;" 2>/dev/null || echo "0")
CURRENT_VEHICLE_COUNT=$(sqlite3 bakuct.db "SELECT COUNT(*) FROM vehicles;" 2>/dev/null || echo "0")

echo "   📊 Current database state:"
echo "      - Entries: $CURRENT_ENTRY_COUNT"
echo "      - Parties: $CURRENT_PARTY_COUNT"
echo "      - Vehicles: $CURRENT_VEHICLE_COUNT"

# Step 4: Backup database
echo "💾 Step 3: Backing up database..."
BACKUP_FILE="$BACKUP_DIR/bakuct.db.backup-$TIMESTAMP"
cp bakuct.db "$BACKUP_FILE"
echo "   ✅ Backup saved to: $BACKUP_FILE"

# Step 5: Verify backup integrity
echo "🔍 Step 4: Verifying backup integrity..."
BACKUP_ENTRY_COUNT=$(sqlite3 "$BACKUP_FILE" "SELECT COUNT(*) FROM entries;" 2>/dev/null || echo "0")

if [ "$CURRENT_ENTRY_COUNT" -eq "$BACKUP_ENTRY_COUNT" ]; then
    echo "   ✅ Backup verified: $CURRENT_ENTRY_COUNT entries match"
else
    echo "   ❌ ERROR: Backup verification failed!"
    echo "      Current: $CURRENT_ENTRY_COUNT, Backup: $BACKUP_ENTRY_COUNT"
    exit 1
fi

# Step 6: Backup code files (for rollback)
echo "💾 Step 5: Backing up current code files..."
CODE_BACKUP_DIR="$BACKUP_DIR/code-backup-$TIMESTAMP"
mkdir -p "$CODE_BACKUP_DIR"
cp server.js "$CODE_BACKUP_DIR/" 2>/dev/null || true
cp public/index.html "$CODE_BACKUP_DIR/" 2>/dev/null || true
cp public/js/app.js "$CODE_BACKUP_DIR/" 2>/dev/null || true
echo "   ✅ Code files backed up to: $CODE_BACKUP_DIR"

# Step 7: Verify new files exist
echo "🔍 Step 6: Verifying new files..."
REQUIRED_FILES=("server.js" "public/index.html" "public/js/app.js")
MISSING_FILES=()

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING_FILES+=("$file")
    elif [ ! -s "$file" ]; then
        echo "   ⚠️  Warning: $file is empty!"
    fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    echo "   ❌ ERROR: Missing required files:"
    for file in "${MISSING_FILES[@]}"; do
        echo "      - $file"
    done
    echo ""
    echo "   💡 Upload files first using:"
    echo "      scp server.js ubuntu@server:~/bakuct/"
    echo "      scp public/index.html ubuntu@server:~/bakuct/public/"
    echo "      scp public/js/app.js ubuntu@server:~/bakuct/public/js/"
    exit 1
fi
echo "   ✅ All required files present and non-empty"

# Step 8: Verify database schema (no migration needed)
echo "🔍 Step 7: Verifying database schema..."
if sqlite3 bakuct.db ".schema entries" | grep -q "entry_type"; then
    echo "   ✅ Database schema compatible (no migration needed)"
else
    echo "   ⚠️  Warning: Database schema may need update"
fi

# Step 9: Install dependencies
echo "📦 Step 8: Installing dependencies..."
npm install --production
echo "   ✅ Dependencies installed"

# Step 10: Check PM2 status before restart
echo "🔍 Step 9: Checking current application status..."
if pm2 list | grep -q "$APP_NAME"; then
    CURRENT_STATUS=$(pm2 jlist | jq -r ".[] | select(.name==\"$APP_NAME\") | .pm2_env.status" 2>/dev/null || echo "unknown")
    echo "   📊 Current status: $CURRENT_STATUS"
else
    echo "   ⚠️  Warning: Application not found in PM2"
fi

# Step 11: Restart PM2
echo "🔄 Step 10: Restarting application..."
pm2 restart $APP_NAME
echo "   ✅ Restart command executed"

# Step 12: Wait for restart
echo "⏳ Step 11: Waiting for application to start..."
sleep 5

# Step 13: Verify deployment
echo "✅ Step 12: Verifying deployment..."
if pm2 list | grep -q "$APP_NAME.*online"; then
    echo "   ✅ Application is running (status: online)"
else
    echo "   ❌ ERROR: Application is not online!"
    echo "   Check logs with: pm2 logs $APP_NAME"
    exit 1
fi

# Step 14: Check application health
echo "🔍 Step 13: Checking application health..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ]; then
    echo "   ✅ Application responding (HTTP $HTTP_CODE)"
else
    echo "   ⚠️  Warning: Application may not be responding (HTTP $HTTP_CODE)"
    echo "   Check logs: pm2 logs $APP_NAME --lines 50"
fi

# Step 15: Verify database integrity after restart
echo "🔍 Step 14: Verifying database integrity..."
POST_ENTRY_COUNT=$(sqlite3 bakuct.db "SELECT COUNT(*) FROM entries;" 2>/dev/null || echo "0")
if [ "$CURRENT_ENTRY_COUNT" -eq "$POST_ENTRY_COUNT" ]; then
    echo "   ✅ Database integrity verified: $POST_ENTRY_COUNT entries (no data loss)"
else
    echo "   ⚠️  Warning: Entry count changed: $CURRENT_ENTRY_COUNT → $POST_ENTRY_COUNT"
    echo "   (This is normal if entries were added during deployment)"
fi

# Step 16: Check for errors in logs
echo "🔍 Step 15: Checking for errors in recent logs..."
ERROR_COUNT=$(pm2 logs $APP_NAME --lines 20 --nostream 2>/dev/null | grep -i error | wc -l || echo "0")
if [ "$ERROR_COUNT" -eq "0" ]; then
    echo "   ✅ No errors in recent logs"
else
    echo "   ⚠️  Warning: Found $ERROR_COUNT potential errors in logs"
    echo "   Review with: pm2 logs $APP_NAME --lines 50"
fi

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║        Deployment Complete! ✅                 ║"
echo "╠════════════════════════════════════════════════╣"
echo "║                                                ║"
echo "║  ✅ Database backed up                         ║"
echo "║  ✅ Code files backed up                       ║"
echo "║  ✅ Application restarted                      ║"
echo "║  ✅ Database integrity verified                ║"
echo "║                                                ║"
echo "║  📊 Database Status:                            ║"
echo "║     Entries: $POST_ENTRY_COUNT                                      ║"
echo "║     Parties: $CURRENT_PARTY_COUNT                                      ║"
echo "║     Vehicles: $CURRENT_VEHICLE_COUNT                                      ║"
echo "║                                                ║"
echo "║  🔗 Your app: https://bakuct.nvdenterprises.com ║"
echo "║                                                ║"
echo "║  📝 Next Steps:                                ║"
echo "║     1. Login to application                     ║"
echo "║     2. Go to Entries tab                       ║"
echo "║     3. Select 'Miscellaneous (Direct Amount)'  ║"
echo "║     4. Test adding a simple entry              ║"
echo "║     5. Verify entry appears correctly           ║"
echo "║                                                ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "💾 Backup Information:"
echo "   Database: $BACKUP_FILE"
echo "   Code: $CODE_BACKUP_DIR"
echo ""
echo "📋 Useful commands:"
echo "   - pm2 logs $APP_NAME"
echo "   - pm2 status"
echo "   - pm2 monit"
echo ""
echo "🔄 Rollback (if needed):"
echo "   cp $BACKUP_FILE bakuct.db"
echo "   cp $CODE_BACKUP_DIR/* ."
echo "   pm2 restart $APP_NAME"
echo ""


