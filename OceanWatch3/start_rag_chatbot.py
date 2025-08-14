#!/usr/bin/env python3
"""
OceanWatch RAG Chatbot Startup Script
==================================

This script starts the RAG-powered maritime intelligence chatbot.
"""

import os
import sys
import subprocess
import time
from pathlib import Path

def print_banner():
    """Print the OceanWatch RAG Chatbot banner"""
    banner = """
    ╔══════════════════════════════════════════════════════════════╗
    ║                    OceanWatch RAG CHATBOT                      ║
    ║                                                              ║
    ║  🚢 Maritime Intelligence Assistant                         ║
    ║  🤖 Powered by GPT-4 & Vector Search                        ║
    ║  🔍 Real-time Database Querying                             ║
    ║  📊 Advanced Pattern Analysis                               ║
    ╚══════════════════════════════════════════════════════════════╝
    """
    print(banner)

def check_environment():
    """Check if required environment variables are set"""
    required_vars = ['OPENAI_API_KEY']
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print("❌ Missing required environment variables:")
        for var in missing_vars:
            print(f"   - {var}")
        print("\nPlease set these variables and try again.")
        return False
    
    print("✅ Environment variables configured")
    return True

def check_dependencies():
    """Check if required Python packages are installed"""
    try:
        import openai
        import pymongo
        import fastapi
        import uvicorn
        print("✅ Python dependencies installed")
        return True
    except ImportError as e:
        print(f"❌ Missing Python dependency: {e}")
        print("Please run: pip install -r server/requirements.txt")
        return False

def start_rag_server():
    """Start the RAG API server"""
    print("\n🚀 Starting OceanWatch RAG Chatbot API Server...")
    print("   - Port: 8001")
    print("   - API Documentation: http://localhost:8001/docs")
    print("   - Health Check: http://localhost:8001/health")
    
    try:
        # Change to server directory
        server_dir = Path(__file__).parent / "server"
        os.chdir(server_dir)
        
        # Start the RAG API server
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "rag_api_server:app",
            "--host", "0.0.0.0",
            "--port", "8001",
            "--reload"
        ], check=True)
        
    except KeyboardInterrupt:
        print("\n🛑 RAG Chatbot server stopped by user")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to start RAG server: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False
    
    return True

def main():
    """Main startup function"""
    print_banner()
    
    # Check environment
    if not check_environment():
        sys.exit(1)
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    print("\n📋 RAG Chatbot Features:")
    print("   • Natural language queries to MongoDB")
    print("   • Vector similarity search")
    print("   • Ship-specific analysis")
    print("   • Alert investigation")
    print("   • Behavioral pattern detection")
    print("   • Real-time maritime intelligence")
    
    print("\n🔗 Frontend Integration:")
    print("   • Chat overlay in OceanWatch map interface")
    print("   • Ship-specific context awareness")
    print("   • Query suggestions and auto-complete")
    print("   • Conversation history persistence")
    
    print("\n⚙️  Configuration:")
    print("   • MongoDB: mongodb+srv://johnliu:pword@neptune-main.2w2qohn.mongodb.net/main")
    print("   • OpenAI: GPT-4 Turbo for generation")
    print("   • Embeddings: text-embedding-3-small")
    print("   • Collections: vessels, events, ship_alerts, vessel_insights, ship_behavior_analysis")
    
    # Start the server
    start_rag_server()

if __name__ == "__main__":
    main()
