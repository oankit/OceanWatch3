#!/usr/bin/env python3
"""
Startup script for OceanWatch Maritime Intelligence Platform
Runs the AI agent and provides instructions for the frontend
"""

import os
import sys
import subprocess
import time
import threading
from pathlib import Path
from dotenv import load_dotenv

def print_banner():
    """Print the OceanWatch startup banner"""
    print("=" * 80)
    print("🚢 OceanWatch Maritime Intelligence Platform")
    print("=" * 80)
    print("AI-Powered Ship Monitoring & Alert System")
    print("=" * 80)

def check_requirements():
    """Check if required environment variables are set"""
    print("🔧 Checking configuration...")
    
    # Load environment variables from .env file in server directory
    env_file = Path("server") / ".env"
    if env_file.exists():
        load_dotenv(env_file)
        print(f"📄 Loaded environment variables from {env_file}")
    else:
        print("⚠️  No .env file found in server directory")
    
    required_vars = ["OPENAI_API_KEY"]
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing required environment variables: {', '.join(missing_vars)}")
        print("\nPlease set the following environment variables:")
        for var in missing_vars:
            print(f"  - {var}")
        print("\nYou can create a .env file in the server directory with:")
        print("OPENAI_API_KEY=your_openai_api_key_here")
        return False
    
    print("✅ Configuration validated")
    return True

def start_ai_agent():
    """Start the AI agent API server"""
    print("\n🤖 Starting OceanWatch AI Agent...")
    
    # Change to server directory
    server_dir = Path("server")
    if not server_dir.exists():
        print("❌ Server directory not found")
        return False
    
    os.chdir(server_dir)
    
    try:
        # Start the FastAPI server
        print("🚀 Starting AI Agent API Server on http://localhost:8000")
        print("📊 API Documentation: http://localhost:8000/docs")
        
        # Run the API server
        subprocess.run([
            sys.executable, "api_server.py"
        ], check=True)
        
    except KeyboardInterrupt:
        print("\n👋 AI Agent stopped by user")
    except Exception as e:
        print(f"❌ Failed to start AI Agent: {e}")
        return False
    
    return True

def print_frontend_instructions():
    """Print instructions for starting the frontend"""
    print("\n" + "=" * 80)
    print("🌐 Frontend Instructions")
    print("=" * 80)
    print("To start the frontend, open a new terminal and run:")
    print()
    print("cd client")
    print("npm install")
    print("npm run dev")
    print()
    print("The frontend will be available at: http://localhost:3000")
    print()
    print("Features:")
    print("  - Real-time ship monitoring")
    print("  - AI-generated alerts in sidebar")
    print("  - Interactive map with ship markers")
    print("  - Alert filtering and management")
    print("  - Ship behavior analysis")
    print("=" * 80)

def print_api_endpoints():
    """Print available API endpoints"""
    print("\n📡 Available API Endpoints:")
    print("  - GET  /                    - Health check")
    print("  - GET  /health              - Detailed health check")
    print("  - POST /start-monitoring    - Start AI monitoring")
    print("  - POST /stop-monitoring     - Stop AI monitoring")
    print("  - GET  /monitoring-status   - Get monitoring status")
    print("  - POST /analyze-ship/{id}   - Analyze specific ship")
    print("  - POST /generate-alert      - Generate manual alert")
    print("  - GET  /recent-alerts       - Get recent alerts")
    print("  - GET  /alert-stats         - Get alert statistics")
    print("  - GET  /ships               - Get ships list")

def main():
    """Main startup function"""
    print_banner()
    
    # Check requirements
    if not check_requirements():
        sys.exit(1)
    
    # Print API endpoints
    print_api_endpoints()
    
    # Print frontend instructions
    print_frontend_instructions()
    
    # Start AI agent
    print("\n🎯 Starting OceanWatch AI Agent...")
    print("Press Ctrl+C to stop")
    
    success = start_ai_agent()
    
    if not success:
        print("\n❌ Failed to start OceanWatch platform")
        sys.exit(1)
    
    print("\n👋 OceanWatch platform stopped")

if __name__ == "__main__":
    main()
