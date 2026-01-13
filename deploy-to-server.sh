#!/bin/bash

# ============================================
# BakuCT - Server Deployment Script
# Domain: bakuct.nvdenterprises.com
# Run this script ON YOUR EC2 SERVER
# ============================================

set -e

APP_NAME="bakuct"
APP_DIR="/home/ubuntu/bakuct"
DOMAIN="bakuct.nvdenterprises.com"
PORT=3002

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║     BakuCT - Server Deployment Script          ║"
echo "║     Domain: $DOMAIN              ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Step 1: Create log directory
echo "📁 Step 1: Creating log directory..."
sudo mkdir -p /var/log/$APP_NAME
sudo chown ubuntu:ubuntu /var/log/$APP_NAME

# Step 2: Navigate to app directory
cd $APP_DIR

# Step 3: Install dependencies
echo "📦 Step 2: Installing dependencies..."
npm install --production

# Step 4: Stop existing PM2 process if running
echo "🔄 Step 3: Configuring PM2..."
pm2 delete $APP_NAME 2>/dev/null || true

# Step 5: Start with PM2
pm2 start ecosystem.config.js --env production

# Step 6: Save PM2 process list
pm2 save

# Step 7: Setup Nginx
echo "🌐 Step 4: Configuring Nginx..."
sudo cp nginx/bakuct.conf /etc/nginx/sites-available/$APP_NAME

# Create symlink if not exists
if [ ! -L /etc/nginx/sites-enabled/$APP_NAME ]; then
    sudo ln -s /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/$APP_NAME
fi

# Step 8: Test Nginx configuration
echo "🔍 Step 5: Testing Nginx configuration..."
sudo nginx -t

# Step 9: Reload Nginx
echo "🔄 Step 6: Reloading Nginx..."
sudo systemctl reload nginx

# Step 10: Setup SSL with Certbot
echo ""
echo "🔐 Step 7: Setting up SSL with Let's Encrypt..."
echo ""
echo "Running: sudo certbot --nginx -d $DOMAIN"
echo ""

sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@nvdenterprises.com --redirect

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║              Deployment Complete! ✅                   ║"
echo "╠════════════════════════════════════════════════════════╣"
echo "║                                                        ║"
echo "║  🌐 URL: https://$DOMAIN             ║"
echo "║  🔐 SSL: Enabled (Let's Encrypt)                       ║"
echo "║  🚀 Port: $PORT                                         ║"
echo "║  📊 PM2: $APP_NAME                                     ║"
echo "║                                                        ║"
echo "║  📝 Login Credentials:                                 ║"
echo "║     Username: admin                                    ║"
echo "║     Password: bakuct2024                               ║"
echo "║                                                        ║"
echo "╠════════════════════════════════════════════════════════╣"
echo "║  Useful Commands:                                      ║"
echo "║  - pm2 logs $APP_NAME                                  ║"
echo "║  - pm2 restart $APP_NAME                               ║"
echo "║  - pm2 monit                                           ║"
echo "║  - sudo certbot renew --dry-run                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
