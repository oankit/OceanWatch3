#!/bin/bash

# OceanWatch Client Deployment Script
# Simple deployment with keep-alive functionality

set -e  # Exit on any error

echo "🚀 OceanWatch Deployment Script"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Redis is already running
check_redis() {
    # First try local redis-cli
    if command -v redis-cli &> /dev/null && redis-cli ping > /dev/null 2>&1; then
        print_success "Redis is already running (local)"
        return 0
    # Check if Redis process is running on port 6379
    elif netstat -an 2>/dev/null | grep -q ":6379.*LISTEN" || ss -ln 2>/dev/null | grep -q ":6379"; then
        # Check if it's actually a redis-server process
        if ps aux 2>/dev/null | grep -q "[r]edis-server" || tasklist 2>/dev/null | grep -q "redis-server"; then
            print_success "Redis is already running (local redis-server)"
            return 0
        fi
        # Try to connect to Redis on port 6379 to verify it's actually Redis
        if command -v redis-cli &> /dev/null && redis-cli -p 6379 ping > /dev/null 2>&1; then
            print_success "Redis is already running on port 6379 (verified via redis-cli)"
            return 0
        elif command -v docker &> /dev/null && docker run --rm redis:alpine redis-cli -h host.docker.internal -p 6379 ping > /dev/null 2>&1; then
            print_success "Redis is already running on port 6379 (verified via Docker)"
            return 0
        fi
    # Then try Docker Redis
    elif command -v docker &> /dev/null; then
        # Find running Redis container by image name
        REDIS_CONTAINER=$(docker ps --format "{{.Names}}\t{{.Image}}" | grep redis | cut -f1 | head -n 1)
        if [ ! -z "$REDIS_CONTAINER" ] && docker exec "$REDIS_CONTAINER" redis-cli ping > /dev/null 2>&1; then
            print_success "Redis is already running (Docker container: $REDIS_CONTAINER)"
            return 0
        fi
    fi
    return 1
}

# Start Redis locally
start_redis() {
    print_status "Starting Redis server..."
    
    # Try to start local Redis first
    if command -v redis-server &> /dev/null; then
        print_status "Starting local Redis server in background..."
        redis-server --daemonize yes --port 6379 2>/dev/null || true
        sleep 2
        print_success "Redis server started (or already running)"
        return 0
    fi
    
    # Fall back to Docker if local Redis is not available
    if command -v docker &> /dev/null; then
        print_status "Starting Redis using Docker..."
        
        docker run -d --name OceanWatch-redis -p 6379:6379 redis:alpine > /dev/null 2>&1 || true
        sleep 3
        
        print_success "Redis Docker container started (or already running)"
        return 0
    fi
    
    # If neither local nor Docker Redis can be started
    print_error "Redis is not available. Please install Redis first:"
    echo "  macOS: brew install redis"
    echo "  Ubuntu: sudo apt-get install redis-server"
    echo "  Or use Docker: docker run -d -p 6379:6379 redis:alpine"
    exit 1
}

# Install dependencies if needed
install_deps() {
    if [ ! -d "node_modules" ]; then
        print_status "Installing dependencies..."
        npm install
        print_success "Dependencies installed"
    else
        print_status "Dependencies already installed"
    fi
}

# Build the project
build_project() {
    print_status "Building the project..."
    npm run build
    print_success "Build completed"
}

# Deploy to Render (simplified)
deploy_to_render() {
    print_status "Deploying to Render..."
    
    # Check if git is configured
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not a git repository. Please initialize git first:"
        echo "  git init"
        echo "  git add ."
        echo "  git commit -m 'Initial commit'"
        echo "  git remote add origin <your-repo-url>"
        exit 1
    fi
    
    # Check if we have uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        print_warning "You have uncommitted changes. Committing them now..."
        git add .
        git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')"
    fi
    
    # Push to main/master branch
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    print_status "Pushing to $CURRENT_BRANCH branch..."
    git push origin $CURRENT_BRANCH
    
    print_success "Code pushed to repository!"
    print_status "Make sure your Render service is configured with:"
    echo "  Build Command: npm run build"
    echo "  Start Command: npm start"
    echo "  Environment Variables:"
    echo "    - MONGODB_URI (your MongoDB connection)"
    echo "    - MONGODB_DB (usually 'main')"
    echo "    - REDIS_URL (optional - uses redis://localhost:6379 if not set)"
}

# Simple keep-alive functionality (1 second intervals)
start_keep_alive() {
    local service_url="$1"
    
    if [ -z "$service_url" ]; then
        print_error "Service URL is required for keep-alive"
        echo "Usage: ./deploy.sh --keep-alive <service-url>"
        echo "Example: ./deploy.sh --keep-alive https://OceanWatch-client.onrender.com"
        exit 1
    fi
    
    # Check if keep-alive is already running
    if [ -f ".OceanWatch-keepalive.pid" ]; then
        local existing_pid=$(cat .OceanWatch-keepalive.pid)
        if ps -p $existing_pid > /dev/null 2>&1; then
            print_warning "Keep-alive is already running (PID: $existing_pid)"
            print_status "To stop: ./deploy.sh --stop-keep-alive"
            exit 0
        else
            # Clean up stale PID file
            rm -f .OceanWatch-keepalive.pid
        fi
    fi
    
    print_status "Starting keep-alive service for $service_url"
    print_status "Ping interval: 1 second (very aggressive)"
    
    # Create simple keep-alive script
    cat > .OceanWatch-keepalive.sh << EOF
#!/bin/bash
SERVICE_URL="$service_url"
LOG_FILE=".OceanWatch-keepalive.log"

echo "\$(date): Keep-alive started for \$SERVICE_URL (1 second intervals)" >> \$LOG_FILE

while true; do
    if curl -s --max-time 10 "\$SERVICE_URL" > /dev/null 2>&1; then
        echo "\$(date): ✓ Ping successful" >> \$LOG_FILE
    else
        echo "\$(date): ✗ Ping failed" >> \$LOG_FILE
    fi
    
    sleep 1
done
EOF
    
    chmod +x .OceanWatch-keepalive.sh
    
    # Start keep-alive in background
    nohup ./.OceanWatch-keepalive.sh > /dev/null 2>&1 &
    local keepalive_pid=$!
    
    echo $keepalive_pid > .OceanWatch-keepalive.pid
    
    print_success "Keep-alive started (PID: $keepalive_pid)"
    print_status "Pinging every 1 second - very aggressive!"
    print_status "Logs: tail -f .OceanWatch-keepalive.log"
    print_status "To stop: ./deploy.sh --stop-keep-alive"
}

stop_keep_alive() {
    if [ ! -f ".OceanWatch-keepalive.pid" ]; then
        print_warning "No keep-alive process found"
        return 0
    fi
    
    local pid=$(cat .OceanWatch-keepalive.pid)
    
    if ps -p $pid > /dev/null 2>&1; then
        print_status "Stopping keep-alive process (PID: $pid)..."
        kill $pid
        
        sleep 1
        if ps -p $pid > /dev/null 2>&1; then
            print_warning "Process didn't stop gracefully, forcing..."
            kill -9 $pid
        fi
        
        print_success "Keep-alive stopped"
    else
        print_warning "Keep-alive process not running"
    fi
    
    # Clean up files
    rm -f .OceanWatch-keepalive.pid .OceanWatch-keepalive.sh
    print_status "Cleaned up keep-alive files"
}

# Show keep-alive status
status_keep_alive() {
    if [ -f ".OceanWatch-keepalive.pid" ]; then
        local pid=$(cat .OceanWatch-keepalive.pid)
        if ps -p $pid > /dev/null 2>&1; then
            print_success "Keep-alive is running (PID: $pid) - pinging every 1 second"
            if [ -f ".OceanWatch-keepalive.log" ]; then
                print_status "Last few log entries:"
                tail -5 .OceanWatch-keepalive.log | while read line; do
                    echo "  $line"
                done
            fi
        else
            print_warning "Keep-alive PID file exists but process is not running"
            rm -f .OceanWatch-keepalive.pid
        fi
    else
        print_warning "Keep-alive is not running"
    fi
}

# Main deployment flow
main() {
    print_status "Starting deployment process..."
    
    # Parse command line arguments
    DEV_MODE=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dev)
                DEV_MODE=true
                shift
                ;;
            --keep-alive)
                if [ -z "$2" ]; then
                    print_error "Service URL is required for --keep-alive"
                    echo "Usage: ./deploy.sh --keep-alive <service-url>"
                    echo "Example: ./deploy.sh --keep-alive https://OceanWatch-client.onrender.com"
                    exit 1
                fi
                start_keep_alive "$2"
                exit 0
                ;;
            --stop-keep-alive)
                stop_keep_alive
                exit 0
                ;;
            --status-keep-alive)
                status_keep_alive
                exit 0
                ;;
            --help|-h)
                echo "Usage: ./deploy.sh [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --dev               Start in development mode (local Redis + dev server)"
                echo "  --keep-alive <url>  Start keep-alive (pings every 1 second)"
                echo "  --stop-keep-alive   Stop the running keep-alive process"
                echo "  --status-keep-alive Show status of the keep-alive process"
                echo "  --help              Show this help message"
                echo ""
                echo "Examples:"
                echo "  ./deploy.sh                    # Deploy to Render"
                echo "  ./deploy.sh --dev              # Start dev server with Redis"
                echo "  ./deploy.sh --keep-alive https://OceanWatch-client.onrender.com"
                echo "  ./deploy.sh --stop-keep-alive  # Stop keep-alive"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Install dependencies
    install_deps
    
    if [ "$DEV_MODE" == true ]; then
        # Only start Redis for development mode
        start_redis
        print_status "Starting development server..."
        print_success "Redis is running on localhost:6379"
        print_status "Starting Next.js development server..."
        npm run dev
    else
        # For deployments
        print_status "Preparing for deployment..."
        
        # Build and deploy
        build_project
        deploy_to_render
        
        print_success "🎉 Deployment complete!"
        print_status "Your app is now deployed!"
        print_warning "💡 Tip: Use --keep-alive to ping your service every second"
        print_status "Example: ./deploy.sh --keep-alive https://your-app.onrender.com"
    fi
}

# Cleanup function
cleanup() {
    print_status "Deployment script interrupted"
    exit 1
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Run main function
main "$@"