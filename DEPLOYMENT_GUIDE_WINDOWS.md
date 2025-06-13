# Smart SDLC Platform - Windows Deployment Guide

## Prerequisites

### 1. Install Node.js
```bash
# Download and install Node.js 20 LTS from https://nodejs.org/
# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### 2. Install Git
```bash
# Download from https://git-scm.com/download/win
# Verify installation
git --version
```

## Deployment Steps

### 1. Clone the Repository
```bash
# Open Command Prompt or PowerShell as Administrator
git clone <repository-url>
cd smart-sdlc-platform
```

### 2. Install Dependencies
```bash
# Install all project dependencies
npm install

# Verify installation completed successfully
npm list --depth=0
```

### 3. Configure Environment Variables
```bash
# Create .env file in project root
echo AWS_ACCESS_KEY_ID=your_access_key_id > .env
echo AWS_SECRET_ACCESS_KEY=your_secret_access_key >> .env
echo AWS_REGION=us-east-1 >> .env
echo NODE_ENV=development >> .env
```

**Alternative: Set via Windows Environment Variables**
```bash
# Via Command Prompt
setx AWS_ACCESS_KEY_ID "your_access_key_id"
setx AWS_SECRET_ACCESS_KEY "your_secret_access_key"
setx AWS_REGION "us-east-1"
setx NODE_ENV "development"

# Restart Command Prompt after setting environment variables
```

### 4. Start the Application
```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

### 5. Access the Application
```
http://localhost:5000
```

## Default Login Credentials
- **Username:** johndoe
- **Password:** password123

## Troubleshooting Windows Issues

### Port 5000 Already in Use
```bash
# Check what's using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Alternative: Use different port
set PORT=3000
npm run dev
```

### PowerShell Execution Policy
```powershell
# If you get execution policy errors
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Windows Firewall
```bash
# Allow Node.js through Windows Firewall
# Go to Windows Firewall > Allow an app through firewall
# Add Node.js executable
```

## Performance Optimization (Windows)

### 1. Disable Windows Defender Real-time Scanning for Project Folder
```
Windows Security > Virus & threat protection > 
Virus & threat protection settings > Add exclusions > 
Add your project folder
```

### 2. Use Windows Terminal (Recommended)
```bash
# Install Windows Terminal from Microsoft Store
# Better performance than Command Prompt
```

### 3. Enable Developer Mode
```
Settings > Update & Security > For developers > Developer mode
```

## File Structure Verification
```
smart-sdlc-platform/
├── client/
├── server/
├── shared/
├── data/
├── package.json
├── .env
└── README.md
```

## Success Verification
1. Open browser to http://localhost:5000
2. Login with johndoe/password123
3. Create an EMIR project (should take <3 seconds)
4. Switch roles and test approval workflow
5. Check browser console for no errors

## Common Windows-Specific Issues

### Issue: npm install fails
**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rmdir /s node_modules
npm install
```

### Issue: Port permission denied
**Solution:**
```bash
# Run Command Prompt as Administrator
# Or use port > 1024
set PORT=8080
npm run dev
```

### Issue: Path too long error
**Solution:**
```bash
# Enable long paths in Windows
# Run as Administrator in PowerShell:
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```