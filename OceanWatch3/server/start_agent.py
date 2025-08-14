#!/usr/bin/env python3
"""
Startup script for OceanWatch AI Ship Monitor Agent
Provides easy startup with proper error handling and logging
"""

import asyncio
import sys
import logging
from datetime import datetime
from ship_monitor_agent import ShipMonitorAgent
from config import config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('OceanWatch_agent.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

async def start_agent():
    """Start the OceanWatch AI agent with proper error handling"""
    logger.info("🚢 Starting OceanWatch AI Ship Monitor Agent...")
    
    try:
        # Validate configuration
        logger.info("🔧 Validating configuration...")
        config.validate()
        logger.info("✅ Configuration validated successfully")
        
        # Initialize agent
        logger.info("🤖 Initializing AI agent...")
        agent = ShipMonitorAgent()
        logger.info("✅ AI agent initialized successfully")
        
        # Start monitoring
        logger.info("📊 Starting continuous monitoring...")
        logger.info(f"📋 Monitoring interval: {config.MONITORING_INTERVAL_SECONDS} seconds")
        logger.info(f"🎯 Alert threshold: {config.ALERT_SEVERITY_THRESHOLD}")
        logger.info("🔄 Agent will run continuously. Press Ctrl+C to stop.")
        
        await agent.monitor_ships()
        
    except KeyboardInterrupt:
        logger.info("👋 Agent stopped by user")
    except Exception as e:
        logger.error(f"❌ Failed to start agent: {e}")
        logger.error("Please check your configuration and try again")
        sys.exit(1)

def main():
    """Main entry point"""
    print("=" * 60)
    print("🚢 OceanWatch AI Ship Monitor Agent")
    print("=" * 60)
    print(f"Start time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"OpenAI Model: {config.OPENAI_MODEL}")
    print(f"MongoDB Database: {config.MONGODB_DB}")
    print("=" * 60)
    
    try:
        asyncio.run(start_agent())
    except KeyboardInterrupt:
        print("\n👋 Agent stopped by user")
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
