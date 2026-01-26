#!/bin/bash

# ============================================
# BakuCT - Miscellaneous Entry Feature Deployment
# Simple deployment - no database migration needed
# ============================================

set -e

APP_NAME="bakuct"
APP_DIR="/home/ubuntu/bakuct"
BACKUP_DIR="/home/ubuntu/bakuct/backups"

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║  BakuCT - Miscellaneous Entry Deployment      ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Step 1: Create backup directory
echo "📦 Step 1: Creating backup..."
mkdir -p $BACKUP_DIR

# Step 2: Backup database (safety first)
echo "💾 Step 2: Backing up database..."
BACKUP_FILE="$BACKUP_DIR/bakuct-$(date +%Y%m%d-%H%M%S).db"
cp $APP_DIR/bakuct.db $BACKUP_FILE
echo "   ✅ Backup saved to: $BACKUP_FILE"

# Step 3: Navigate to app directory
cd $APP_DIR

# Step 4: Verify files exist
echo "🔍 Step 3: Verifying files..."
REQUIRED_FILES=("server.js" "public/index.html" "public/js/app.js")
MISSING_FILES=()

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    echo "   ❌ Error: Missing required files:"
    for file in "${MISSING_FILES[@]}"; do
        echo "      - $file"
    done
    exit 1
fi
echo "   ✅ All required files present"

# Step 5: Install dependencies (if package.json changed)
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
    echo "   Check logs with: pm2 logs $APP_NAME"
fi

# Step 9: Check application health
echo "🔍 Step 7: Checking application health..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002 || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ]; then
    echo "   ✅ Application responding (HTTP $HTTP_CODE)"
else
    echo "   ⚠️  Warning: Application may not be responding (HTTP $HTTP_CODE)"
fi

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║        Deployment Complete! ✅                 ║"
echo "╠════════════════════════════════════════════════╣"
echo "║                                                ║"
echo "║  ✅ Database backed up                         ║"
echo "║  ✅ Application restarted                      ║"
echo "║                                                ║"
echo "║  🔗 Your app: https://bakuct.nvdenterprises.com ║"
echo "║                                                ║"
echo "║  📝 Next Steps:                                ║"
echo "║     1. Login to application                     ║"
echo "║     2. Go to Entries tab                       ║"
echo "║     3. Select 'Miscellaneous (Direct Amount)'  ║"
echo "║     4. Test adding a simple entry              ║"
echo "║                                                ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "💾 Backup location: $BACKUP_FILE"
echo ""
echo "📋 Useful commands:"
echo "   - pm2 logs $APP_NAME"
echo "   - pm2 status"
echo "   - pm2 monit"
echo ""

