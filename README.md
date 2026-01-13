# BakuCT - Transport Management System

A full-stack web application for managing transport business operations including product entries, expenses, vehicle management, and comprehensive dashboard analytics.

## Features

### 📊 Dashboard
- Real-time summary of income, expenses, and profit
- Monthly statistics
- Expense breakdown by type
- Income breakdown by product
- Vehicle performance summary
- Recent activity feed

### 📦 Product Entries
- Track product loads with automatic amount calculation
- Weight input in KG with automatic conversion to tons
- Link entries to specific vehicles
- Rate-based pricing per ton

### 💸 Expense Management
- **Fuel** - Track liters and rate per liter
- **Maintenance** - General maintenance costs
- **Driver Wages** - Salary payments
- **Oil Change** - Oil change expenses
- **Traffic Challan** - Traffic fines
- **Labour** - Loading/unloading payments
- Link expenses to specific vehicles

### 🚗 Vehicle Management
- Add and manage fleet vehicles
- Track car numbers and driver assignments
- Vehicle type categorization
- Per-vehicle income and expense tracking

### 💰 Product Rates
- Define rates per ton for different products
- Easy rate updates
- Automatic calculation in entries

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Database**: SQLite (better-sqlite3)

## Project Structure

```
bakuct/
├── server.js           # Express server with API routes
├── package.json        # Node.js dependencies
├── bakuct.db          # SQLite database (auto-created)
├── public/            # Static frontend files
│   ├── index.html     # Main HTML with tabs layout
│   ├── css/
│   │   └── styles.css # All styles
│   └── js/
│       └── app.js     # Frontend application logic
└── README.md          # This file
```

## Login Credentials

- **Username**: `admin`
- **Password**: `bakuct2024`

## Local Development

### Prerequisites
- Node.js 16+ installed

### Installation

```bash
# Clone or navigate to project
cd bakuct

# Install dependencies
npm install

# Start server
npm start
```

The application will be available at: **http://localhost:3000**

---

## AWS Deployment Guide

### Option 1: AWS EC2 (Recommended for Full-Stack)

Since this application uses SQLite, the easiest deployment is on an EC2 instance.

#### Step 1: Launch EC2 Instance

1. Go to AWS EC2 Console
2. Launch a new instance:
   - **AMI**: Amazon Linux 2023 or Ubuntu 22.04
   - **Instance type**: t2.micro (free tier) or t3.small
   - **Security group**: Allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS)

#### Step 2: Connect to Instance

```bash
ssh -i your-key.pem ec2-user@your-instance-ip
```

#### Step 3: Install Node.js

```bash
# Amazon Linux
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Ubuntu
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Step 4: Deploy Application

```bash
# Create app directory
sudo mkdir -p /var/www/bakuct
cd /var/www/bakuct

# Upload your files (using scp from local machine)
# scp -i your-key.pem -r ./* ec2-user@your-instance-ip:/var/www/bakuct/

# Install dependencies
npm install --production

# Install PM2 for process management
sudo npm install -g pm2

# Start application
pm2 start server.js --name bakuct

# Setup PM2 to start on boot
pm2 startup
pm2 save
```

#### Step 5: Setup Nginx (Optional, for port 80)

```bash
sudo yum install nginx  # Amazon Linux
sudo apt install nginx  # Ubuntu

# Create nginx config
sudo nano /etc/nginx/conf.d/bakuct.conf
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

### Option 2: AWS Elastic Beanstalk (Easy Deployment)

#### Step 1: Install EB CLI

```bash
pip install awsebcli
```

#### Step 2: Initialize and Deploy

```bash
cd bakuct
eb init -p node.js bakuct-app
eb create bakuct-env
eb deploy
```

---

### Option 3: AWS Lightsail (Simplest)

1. Go to AWS Lightsail Console
2. Create instance → Node.js blueprint
3. Connect via SSH
4. Upload files and run:

```bash
cd /opt/bitnami/projects
git clone your-repo or upload files
cd bakuct
npm install
pm2 start server.js
```

---

## Environment Variables

For production, you can configure:

```bash
PORT=3000              # Server port
NODE_ENV=production    # Environment
```

## Database

The application uses SQLite stored in `bakuct.db`. This file is auto-created on first run.

### Backup Database

```bash
# On EC2
cp /var/www/bakuct/bakuct.db /backup/bakuct-$(date +%Y%m%d).db

# Download to local
scp -i key.pem ec2-user@ip:/var/www/bakuct/bakuct.db ./backup/
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/login | Authenticate user |
| GET | /api/dashboard | Get dashboard statistics |
| GET/POST/DELETE | /api/vehicles | Manage vehicles |
| GET/POST/DELETE | /api/rates | Manage product rates |
| GET/POST/DELETE | /api/entries | Manage entries |
| GET/POST/DELETE | /api/expenses | Manage expenses |

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

Private - For internal use only.
# bakuct
