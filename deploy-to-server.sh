#!/bin/bash

# ============================================
# BakuCT - Server Deployment Script
# Run this script ON YOUR EC2 SERVER
# ============================================

set -e

APP_NAME="bakuct"
APP_DIR="/home/ubuntu/bakuct"
PORT=3002

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║     BakuCT - Server Deployment Script          ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Step 1: Create log directory
echo "📁 Creating log directory..."
sudo mkdir -p /var/log/$APP_NAME
sudo chown ubuntu:ubuntu /var/log/$APP_NAME

# Step 2: Navigate to app directory
cd $APP_DIR

# Step 3: Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Step 4: Stop existing PM2 process if running
echo "🔄 Configuring PM2..."
pm2 delete $APP_NAME 2>/dev/null || true

# Step 5: Start with PM2
pm2 start ecosystem.config.js --env production

# Step 6: Save PM2 process list
pm2 save

# Step 7: Setup Nginx
echo "🌐 Configuring Nginx..."
sudo cp nginx/bakuct.conf /etc/nginx/sites-available/$APP_NAME

# Create symlink if not exists
if [ ! -L /etc/nginx/sites-enabled/$APP_NAME ]; then
    sudo ln -s /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/$APP_NAME
fi

# Step 8: Test Nginx configuration
echo "🔍 Testing Nginx configuration..."
sudo nginx -t

# Step 9: Reload Nginx
echo "🔄 Reloading Nginx..."
sudo systemctl reload nginx

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║           Deployment Complete! ✅              ║"
echo "╠════════════════════════════════════════════════╣"
echo "║  App running on port: $PORT                     ║"
echo "║  PM2 process: $APP_NAME                        ║"
echo "║                                                ║"
echo "║  Useful commands:                              ║"
echo "║  - pm2 logs $APP_NAME                          ║"
echo "║  - pm2 restart $APP_NAME                       ║"
echo "║  - pm2 monit                                   ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "🔗 Don't forget to:"
echo "   1. Update server_name in nginx config with your domain"
echo "   2. Run: sudo certbot --nginx -d yourdomain.com"
echo ""

