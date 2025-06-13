# Smart SDLC Platform - AWS EC2 Deployment Guide

## EC2 Instance Setup

### 1. Launch EC2 Instance
```bash
# AWS Console > EC2 > Launch Instance
Instance Type: t3.medium (2 vCPU, 4 GB RAM - minimum)
AMI: Ubuntu Server 22.04 LTS
Storage: 20 GB gp3
Security Group: Allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS), 5000 (App)
Key Pair: Create or select existing key pair
```

### 2. Connect to EC2 Instance
```bash
# From your local machine
ssh -i "your-key.pem" ubuntu@your-ec2-public-ip

# Update system packages
sudo apt update && sudo apt upgrade -y
```

### 3. Install Node.js 20
```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### 4. Install Git and Essential Tools
```bash
sudo apt install -y git curl wget unzip build-essential
```

## Application Deployment

### 1. Clone Repository
```bash
# Create application directory
sudo mkdir -p /opt/smart-sdlc
sudo chown ubuntu:ubuntu /opt/smart-sdlc
cd /opt/smart-sdlc

# Clone repository
git clone <repository-url> .
```

### 2. Install Dependencies
```bash
# Install application dependencies
npm install --production

# Verify installation
npm list --depth=0
```

### 3. Configure Environment Variables
```bash
# Create environment file
sudo nano /opt/smart-sdlc/.env

# Add the following content:
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=us-east-1
NODE_ENV=production
PORT=5000
```

### 4. Setup PM2 Process Manager
```bash
# Install PM2 globally
sudo npm install -g pm2

# Create PM2 ecosystem file
nano ecosystem.config.js
```

**ecosystem.config.js content:**
```javascript
module.exports = {
  apps: [{
    name: 'smart-sdlc',
    script: 'server/index.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/smart-sdlc/err.log',
    out_file: '/var/log/smart-sdlc/out.log',
    log_file: '/var/log/smart-sdlc/combined.log',
    time: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

### 5. Create Log Directory
```bash
sudo mkdir -p /var/log/smart-sdlc
sudo chown ubuntu:ubuntu /var/log/smart-sdlc
```

### 6. Start Application with PM2
```bash
# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
# Follow the command output instructions
```

## Nginx Reverse Proxy Setup

### 1. Install Nginx
```bash
sudo apt install -y nginx
```

### 2. Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/smart-sdlc
```

**Nginx configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or EC2 public IP

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Handle static files
    location /assets/ {
        proxy_pass http://localhost:5000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 3. Enable Nginx Site
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/smart-sdlc /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## SSL Certificate (Optional but Recommended)

### 1. Install Certbot
```bash
sudo apt install -y snapd
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

### 2. Obtain SSL Certificate
```bash
# For domain-based setup
sudo certbot --nginx -d your-domain.com

# Follow prompts to configure SSL
```

## Security Configuration

### 1. Configure UFW Firewall
```bash
# Enable firewall
sudo ufw enable

# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

### 2. Secure SSH
```bash
sudo nano /etc/ssh/sshd_config

# Add/modify these lines:
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes

# Restart SSH
sudo systemctl restart ssh
```

## Monitoring and Maintenance

### 1. PM2 Monitoring
```bash
# Check application status
pm2 status

# View logs
pm2 logs smart-sdlc

# Restart application
pm2 restart smart-sdlc

# Monitor resources
pm2 monit
```

### 2. System Monitoring
```bash
# Check disk usage
df -h

# Check memory usage
free -h

# Check CPU usage
top

# Check Nginx status
sudo systemctl status nginx
```

### 3. Application Health Check
```bash
# Test application endpoint
curl -I http://localhost:5000

# Test through Nginx
curl -I http://your-domain.com
```

## Backup Strategy

### 1. Database Backup (if using external DB)
```bash
# Create backup script
nano /opt/smart-sdlc/backup.sh

#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf /opt/backups/smart-sdlc-$DATE.tar.gz /opt/smart-sdlc/data/
find /opt/backups/ -name "smart-sdlc-*.tar.gz" -mtime +7 -delete
```

### 2. Setup Cron Job
```bash
# Create backup directory
sudo mkdir -p /opt/backups
sudo chown ubuntu:ubuntu /opt/backups

# Add to crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /opt/smart-sdlc/backup.sh
```

## Troubleshooting

### Application Not Starting
```bash
# Check PM2 logs
pm2 logs smart-sdlc

# Check system resources
free -h && df -h

# Restart application
pm2 restart smart-sdlc
```

### Nginx Issues
```bash
# Check Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

### Port Issues
```bash
# Check what's using port 5000
sudo netstat -tulpn | grep :5000

# Check if application is running
curl http://localhost:5000
```

## Performance Optimization

### 1. Node.js Optimization
```bash
# Increase Node.js memory limit in ecosystem.config.js
node_args: '--max-old-space-size=2048'
```

### 2. Nginx Optimization
```bash
# Add to nginx.conf
worker_processes auto;
worker_connections 1024;
keepalive_timeout 65;
client_max_body_size 50M;
```

## Success Verification
1. Access http://your-ec2-ip or https://your-domain.com
2. Login with johndoe/password123
3. Create EMIR project (should be fast)
4. Test role switching and approval workflow
5. Check PM2 status shows healthy processes
6. Verify SSL certificate (if configured)

## Production Checklist
- [ ] EC2 instance properly sized
- [ ] Security groups configured
- [ ] Environment variables set
- [ ] PM2 running with cluster mode
- [ ] Nginx reverse proxy configured
- [ ] SSL certificate installed
- [ ] Firewall rules applied
- [ ] Monitoring setup
- [ ] Backup strategy implemented
- [ ] Health checks passing