# OceanWatch Deployment Guide

This guide explains how to deploy the OceanWatch client application to Render with a simple configuration.

## Why This Approach?

- **Simple setup** - No complex configuration files
- **Manual control** - Direct Render dashboard configuration
- **Aggressive keep-alive** - Pings every second to keep service awake
- **Redis flexibility** - Uses environment variables or falls back to localhost

## Prerequisites

### For Local Development:
1. **Redis** (choose one):
   - Local installation: `brew install redis` (macOS) or `sudo apt-get install redis-server` (Ubuntu)
   - Docker: `docker run -d -p 6379:6379 redis:alpine`

### For Production (Render):
1. **Git repository** with your code (GitHub, GitLab, etc.)
2. **Render account** - Sign up free at [render.com](https://render.com)

## Quick Start

### 1. Development Mode
Start local development with Redis:
```bash
npm run deploy:dev
# or
./deploy.sh --dev
```

### 2. Deploy to Render
Deploy your app:
```bash
npm run deploy
# or
./deploy.sh
```

### 3. Keep Service Alive
Start aggressive keep-alive (pings every second):
```bash
./deploy.sh --keep-alive https://your-app.onrender.com
```

## Detailed Setup

### Step 1: Initialize Your Repository
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repository-url>
git push -u origin main
```

### Step 2: Create Render Web Service
1. **Sign up** at [render.com](https://render.com)
2. **Create Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub/GitLab repository
   - Select your OceanWatch repository

### Step 3: Configure Render Service
In your Render service settings:

**Build & Deploy:**
- **Root Directory**: `client`
- **Build Command**: `npm run build`
- **Start Command**: `npm start`

**Environment Variables:**
- `NODE_ENV` = `production`
- `MONGODB_URI` = `mongodb+srv://johnliu:pword@neptune-main.2w2qohn.mongodb.net/main`
- `MONGODB_DB` = `main`
- `REDIS_URL` = `redis://localhost:6379` *(optional - app falls back to this anyway)*

### Step 4: Deploy
```bash
npm run deploy
```

This pushes your code and triggers deployment on Render.

## Keep Your Service Alive

Render's free tier spins down after ~15 minutes of inactivity. Use aggressive keep-alive:

### Start Keep-Alive (Every Second)
```bash
# Very aggressive - pings every 1 second
./deploy.sh --keep-alive https://your-app.onrender.com

# Check status
npm run keep-alive:status

# Stop when done
npm run keep-alive:stop
```

### What Keep-Alive Does
- **Pings every 1 second** - extremely aggressive
- **Runs in background** - you can close terminal
- **Logs activity** to `.OceanWatch-keepalive.log`
- **Prevents spinning down** completely
- **Simple and fast** - just HTTP pings

### Keep-Alive Commands
```bash
./deploy.sh --keep-alive <url>        # Start 1-second pinging
./deploy.sh --stop-keep-alive         # Stop keep-alive  
./deploy.sh --status-keep-alive       # Show status & logs
npm run keep-alive:status             # Status (npm script)
npm run keep-alive:stop               # Stop (npm script)
```

### Example Workflow
```bash
# 1. Deploy your app
npm run deploy

# 2. Start aggressive keep-alive
./deploy.sh --keep-alive https://OceanWatch-client.onrender.com

# 3. Check logs occasionally  
tail -f .OceanWatch-keepalive.log

# 4. Stop when no longer needed
npm run keep-alive:stop
```

## What the Script Does

### For Development Mode (`--dev`):
1. **Starts Redis locally** on port 6379
2. **Installs dependencies** if needed
3. **Runs Next.js dev server** with local Redis caching

### For Deployments:
1. **Installs dependencies** if needed
2. **Builds the project** for production
3. **Commits and pushes** code to repository
4. **Shows configuration** instructions for Render

### For Keep-Alive:
1. **Pings service every 1 second** - very aggressive
2. **Logs all attempts** with timestamps
3. **Runs in background** until manually stopped
4. **Simple HTTP GET requests** to keep service warm

## Redis Configuration

The app automatically handles Redis connections:

- **Production**: Uses `REDIS_URL` environment variable if set
- **Fallback**: Uses `redis://localhost:6379` (won't work on Render)
- **Caching**: Works if Redis is available, gracefully degrades if not

**Note**: For production, either:
- Use an external Redis service (set `REDIS_URL`)
- Or let the app run without Redis (caching disabled but still works)

## Troubleshooting

### Deployment Issues
```bash
# Check git status
git status

# View recent commits
git log --oneline -5

# Check Render logs in dashboard
```

### Keep-Alive Issues
```bash
# Check if running
npm run keep-alive:status

# View logs
tail -f .OceanWatch-keepalive.log

# Restart if needed
npm run keep-alive:stop
./deploy.sh --keep-alive https://your-app.onrender.com
```

### Build Issues
```bash
# Clear cache and reinstall
npm run clear-cache
rm -rf node_modules package-lock.json
npm install
```

## Script Options

```bash
./deploy.sh [OPTIONS]

Options:
  --dev               Start in development mode (local Redis + dev server)
  --keep-alive <url>  Start keep-alive (pings every 1 second)
  --stop-keep-alive   Stop the running keep-alive process
  --status-keep-alive Show status of the keep-alive process
  --help              Show this help message

Examples:
  ./deploy.sh                    # Deploy to Render
  ./deploy.sh --dev              # Start dev server with Redis
  ./deploy.sh --keep-alive https://OceanWatch-client.onrender.com
  ./deploy.sh --stop-keep-alive  # Stop keep-alive
```

## Benefits of This Approach

- **Simple deployment** - No complex config files
- **Manual control** - Configure directly in Render dashboard
- **Aggressive keep-alive** - Service never spins down
- **Redis flexible** - Works with or without Redis
- **Easy debugging** - Clear logs and status commands

Your OceanWatch app will stay responsive 24/7 with 1-second pings! 🚀 