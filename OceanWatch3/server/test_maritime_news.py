#!/usr/bin/env python3
"""
Test script for the Maritime News Tool integration with Perplexity API
"""

import asyncio
import json
from ship_monitor_agent import MaritimeNewsTool

def test_maritime_news_tool():
    """Test the maritime news tool functionality"""
    print("🚢 Testing Maritime News Tool with Perplexity API...\n")
    
    # Initialize the tool
    news_tool = MaritimeNewsTool()
    
    # Test queries
    test_queries = [
        "Red Sea shipping disruptions",
        "port congestion updates",
        "maritime security incidents",
        "IMO regulations 2024"
    ]
    
    for query in test_queries:
        print(f"🔍 Searching for: {query}")
        print("-" * 50)
        
        try:
            result = news_tool._run(query)
            parsed_result = json.loads(result)
            
            if parsed_result["status"] == "success":
                print(f"✅ Query successful")
                print(f"📰 Content preview: {parsed_result['content'][:200]}...")
                print(f"🔗 Citations found: {len(parsed_result.get('citations', []))}")
                print(f"⏰ Timestamp: {parsed_result['timestamp']}")
            else:
                print(f"❌ Query failed: {parsed_result['message']}")
                
        except Exception as e:
            print(f"❌ Error: {str(e)}")
        
        print("\n" + "=" * 60 + "\n")

if __name__ == "__main__":
    test_maritime_news_tool()