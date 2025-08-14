#!/usr/bin/env python3
"""
Test script for OceanWatch AI Ship Monitor Agent
Demonstrates the agent's capabilities with sample data
"""

import asyncio
import sys
from datetime import datetime, timezone
from ship_monitor_agent import ShipMonitorAgent, Alert, AlertType, AlertSeverity, ShipLocation

async def test_agent_capabilities():
    """Test the AI agent's various capabilities"""
    print("🧪 Testing OceanWatch AI Ship Monitor Agent...")
    
    try:
        # Initialize agent
        agent = ShipMonitorAgent()
        print("✅ Agent initialized successfully")
        
        # Test 1: List ships
        print("\n📋 Test 1: Listing ships...")
        ships = agent.mongodb_tool._run("get_ships", limit=5)
        print(f"Result: {ships}")
        
        # Test 2: Get recent events
        print("\n📊 Test 2: Getting recent events...")
        recent_events = agent.mongodb_tool._run("get_recent_events", hours=24)
        print(f"Result: {recent_events}")
        
        # Test 3: Get loitering events
        print("\n🚢 Test 3: Getting loitering events...")
        loitering_events = agent.mongodb_tool._run("get_loitering_events", days=7)
        print(f"Result: {loitering_events}")
        
        # Test 4: Test AI analysis
        print("\n🤖 Test 4: Testing AI analysis...")
        test_prompt = """
        Analyze the current maritime data and provide a brief assessment:
        1. Are there any concerning patterns?
        2. What types of activities are most common?
        3. Any recommendations for monitoring?
        """
        
        result = await agent.agent_executor.ainvoke({
            "input": test_prompt,
            "chat_history": []
        })
        
        print(f"AI Analysis Result:\n{result['output']}")
        
        # Test 5: Generate a sample alert
        print("\n🚨 Test 5: Generating sample alert...")
        sample_location = ShipLocation(
            latitude=37.7749,
            longitude=-122.4194,
            timestamp=datetime.now(timezone.utc),
            speed=5.2,
            heading=180.0
        )
        
        alert_result = agent.alert_tool._run(
            ship_id="test_vessel_123",
            alert_type="loitering",
            severity="medium",
            description="Test alert: Vessel loitering in test area",
            reasoning="This is a test alert to verify the alert generation system",
            ship_name="TEST_VESSEL",
            location=sample_location,
            evidence=["Test evidence 1", "Test evidence 2"]
        )
        
        print(f"Alert Generation Result: {alert_result}")
        
        # Test 6: Behavior analysis
        print("\n🔍 Test 6: Testing behavior analysis...")
        # Use a sample ship ID if available, otherwise create a test
        sample_ship_id = "test_vessel_456"
        behavior_result = agent.behavior_tool._run(ship_id=sample_ship_id)
        print(f"Behavior Analysis Result: {behavior_result}")
        
        print("\n🎉 All tests completed successfully!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

async def test_specific_scenarios():
    """Test specific maritime scenarios"""
    print("\n🎯 Testing Specific Maritime Scenarios...")
    
    try:
        agent = ShipMonitorAgent()
        
        # Scenario 1: Loitering detection
        print("\n📋 Scenario 1: Loitering Detection")
        loitering_prompt = """
        Analyze the loitering events in the database and identify:
        1. Which vessels have the most loitering events?
        2. Are there any patterns in loitering locations?
        3. What risk level would you assign to vessels with multiple loitering events?
        4. Generate alerts for any concerning loitering patterns.
        """
        
        result = await agent.agent_executor.ainvoke({
            "input": loitering_prompt,
            "chat_history": []
        })
        
        print(f"Loitering Analysis:\n{result['output']}")
        
        # Scenario 2: Port activity analysis
        print("\n🏠 Scenario 2: Port Activity Analysis")
        port_prompt = """
        Analyze port visit patterns and identify:
        1. Which ports are most frequently visited?
        2. Are there any unusual port visit patterns?
        3. Any vessels with suspicious port activity?
        4. Generate alerts for concerning port visit patterns.
        """
        
        result = await agent.agent_executor.ainvoke({
            "input": port_prompt,
            "chat_history": []
        })
        
        print(f"Port Activity Analysis:\n{result['output']}")
        
        # Scenario 3: Encounter analysis
        print("\n🤝 Scenario 3: Ship Encounter Analysis")
        encounter_prompt = """
        Analyze ship encounters and identify:
        1. Which vessels have the most encounters?
        2. Are there any suspicious encounter patterns?
        3. Any encounters in sensitive areas?
        4. Generate alerts for concerning encounter patterns.
        """
        
        result = await agent.agent_executor.ainvoke({
            "input": encounter_prompt,
            "chat_history": []
        })
        
        print(f"Encounter Analysis:\n{result['output']}")
        
        print("\n✅ All scenarios tested successfully!")
        
    except Exception as e:
        print(f"❌ Scenario test failed: {e}")
        import traceback
        traceback.print_exc()

async def test_continuous_monitoring():
    """Test continuous monitoring for a short period"""
    print("\n🔄 Testing Continuous Monitoring (30 seconds)...")
    
    try:
        agent = ShipMonitorAgent()
        
        # Run monitoring for 30 seconds
        start_time = datetime.now()
        monitoring_duration = 30  # seconds
        
        while (datetime.now() - start_time).seconds < monitoring_duration:
            print(f"\n📊 Monitoring cycle at {datetime.now().strftime('%H:%M:%S')}")
            
            # Get recent data
            recent_events = agent.mongodb_tool._run("get_recent_events", hours=1)
            loitering_events = agent.mongodb_tool._run("get_loitering_events", days=1)
            
            # Analyze with AI
            monitoring_prompt = f"""
            Quick analysis of recent maritime activity:
            Recent Events: {recent_events}
            Loitering Events: {loitering_events}
            
            Provide a brief assessment of any concerning patterns.
            """
            
            result = await agent.agent_executor.ainvoke({
                "input": monitoring_prompt,
                "chat_history": []
            })
            
            print(f"AI Assessment: {result['output'][:200]}...")
            
            # Wait 10 seconds before next cycle
            await asyncio.sleep(10)
        
        print("\n✅ Continuous monitoring test completed!")
        
    except Exception as e:
        print(f"❌ Continuous monitoring test failed: {e}")
        import traceback
        traceback.print_exc()

async def main():
    """Main test function"""
    print("🚢 OceanWatch AI Ship Monitor Agent - Test Suite")
    print("=" * 50)
    
    # Run basic capability tests
    await test_agent_capabilities()
    
    # Run specific scenario tests
    await test_specific_scenarios()
    
    # Run continuous monitoring test
    await test_continuous_monitoring()
    
    print("\n🎉 All tests completed!")
    print("\nTo start the agent in production mode, run:")
    print("python cli.py monitor")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Test interrupted by user")
    except Exception as e:
        print(f"❌ Test suite failed: {e}")
        sys.exit(1)
