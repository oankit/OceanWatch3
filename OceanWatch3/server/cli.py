#!/usr/bin/env python3
"""
CLI interface for OceanWatch AI Ship Monitor Agent
"""

import asyncio
import argparse
import sys
from typing import Optional
from ship_monitor_agent import ShipMonitorAgent
from config import config

class OceanWatchCLI:
    def __init__(self):
        self.agent: Optional[ShipMonitorAgent] = None
    
    async def initialize_agent(self):
        """Initialize the AI agent"""
        try:
            config.validate()
            self.agent = ShipMonitorAgent()
            print("✅ OceanWatch AI Agent initialized successfully")
        except Exception as e:
            print(f"❌ Failed to initialize agent: {e}")
            sys.exit(1)
    
    async def start_monitoring(self):
        """Start continuous monitoring"""
        await self.initialize_agent()
        print("🚢 Starting continuous ship monitoring...")
        print("Press Ctrl+C to stop")
        await self.agent.monitor_ships()
    
    async def analyze_ship(self, ship_id: str):
        """Analyze a specific ship"""
        await self.initialize_agent()
        print(f"🔍 Analyzing ship: {ship_id}")
        result = await self.agent.analyze_specific_ship(ship_id)
        print(f"📊 Analysis Result:\n{result}")
    
    async def generate_alert(self, ship_id: str, alert_type: str, description: str, reasoning: str):
        """Generate a specific alert"""
        await self.initialize_agent()
        print(f"🚨 Generating alert for ship: {ship_id}")
        result = await self.agent.generate_alert_for_ship(ship_id, alert_type, description, reasoning)
        print(f"📋 Alert Result:\n{result}")
    
    async def test_connection(self):
        """Test database and API connections"""
        await self.initialize_agent()
        print("🔧 Testing connections...")
        
        try:
            # Test MongoDB connection
            recent_events = self.agent.mongodb_tool._run("get_recent_events", hours=1)
            print(f"✅ MongoDB: {recent_events}")
            
            # Test OpenAI connection
            test_prompt = "Test connection"
            result = await self.agent.agent_executor.ainvoke({
                "input": test_prompt,
                "chat_history": []
            })
            print("✅ OpenAI: Connection successful")
            
            print("🎉 All connections working!")
            
        except Exception as e:
            print(f"❌ Connection test failed: {e}")
    
    async def list_ships(self, limit: int = 10):
        """List ships in the database"""
        await self.initialize_agent()
        print(f"📋 Listing ships (limit: {limit})...")
        ships = self.agent.mongodb_tool._run("get_ships", limit=limit)
        print(f"🚢 Ships: {ships}")
    
    async def get_recent_alerts(self, hours: int = 24):
        """Get recent alerts"""
        await self.initialize_agent()
        print(f"🚨 Getting recent alerts (last {hours} hours)...")
        
        try:
            alerts_collection = self.agent.db.ship_alerts
            from datetime import datetime, timedelta, timezone
            
            start_date = datetime.now(timezone.utc) - timedelta(hours=hours)
            alerts = list(alerts_collection.find({
                "timestamp": {"$gte": start_date}
            }).sort("timestamp", -1))
            
            if alerts:
                print(f"📊 Found {len(alerts)} alerts:")
                for alert in alerts[:5]:  # Show first 5
                    print(f"  - {alert.get('alert_id')}: {alert.get('description')} (Severity: {alert.get('severity')})")
            else:
                print("📊 No recent alerts found")
                
        except Exception as e:
            print(f"❌ Error getting alerts: {e}")

def main():
    parser = argparse.ArgumentParser(description="OceanWatch AI Ship Monitor Agent CLI")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Monitor command
    monitor_parser = subparsers.add_parser("monitor", help="Start continuous monitoring")
    
    # Analyze command
    analyze_parser = subparsers.add_parser("analyze", help="Analyze a specific ship")
    analyze_parser.add_argument("ship_id", help="Ship ID to analyze")
    
    # Alert command
    alert_parser = subparsers.add_parser("alert", help="Generate a specific alert")
    alert_parser.add_argument("ship_id", help="Ship ID")
    alert_parser.add_argument("alert_type", help="Type of alert")
    alert_parser.add_argument("description", help="Alert description")
    alert_parser.add_argument("reasoning", help="Alert reasoning")
    
    # Test command
    test_parser = subparsers.add_parser("test", help="Test connections")
    
    # List ships command
    list_parser = subparsers.add_parser("list-ships", help="List ships in database")
    list_parser.add_argument("--limit", type=int, default=10, help="Number of ships to list")
    
    # Get alerts command
    alerts_parser = subparsers.add_parser("alerts", help="Get recent alerts")
    alerts_parser.add_argument("--hours", type=int, default=24, help="Hours to look back")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    cli = OceanWatchCLI()
    
    try:
        if args.command == "monitor":
            asyncio.run(cli.start_monitoring())
        elif args.command == "analyze":
            asyncio.run(cli.analyze_ship(args.ship_id))
        elif args.command == "alert":
            asyncio.run(cli.generate_alert(args.ship_id, args.alert_type, args.description, args.reasoning))
        elif args.command == "test":
            asyncio.run(cli.test_connection())
        elif args.command == "list-ships":
            asyncio.run(cli.list_ships(args.limit))
        elif args.command == "alerts":
            asyncio.run(cli.get_recent_alerts(args.hours))
    except KeyboardInterrupt:
        print("\n👋 Stopping OceanWatch AI Agent...")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
