import os
import asyncio
import schedule
import time
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

import openai
from pydantic import BaseModel, Field
from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_openai import ChatOpenAI
from langchain.schema import BaseMessage, HumanMessage, AIMessage
from langchain.tools import BaseTool
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB Configuration
MONGODB_URI = "mongodb+srv://johnliu:pword@OceanWatch-main.2w2qohn.mongodb.net/main"
DB_NAME = "main"

# OpenAI Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable is required")

openai.api_key = OPENAI_API_KEY

class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AlertType(str, Enum):
    LOITERING = "loitering"
    PORT_ENTRY = "port_entry"
    PORT_EXIT = "port_exit"
    SUSPICIOUS_ROUTE = "suspicious_route"
    SPEED_ANOMALY = "speed_anomaly"
    ENCOUNTER = "encounter"
    GAP_IN_TRACKING = "gap_in_tracking"

class ShipLocation(BaseModel):
    latitude: float
    longitude: float
    timestamp: datetime
    speed: Optional[float] = None
    heading: Optional[float] = None

class ShipEvent(BaseModel):
    event_id: str
    event_type: str
    timestamp: datetime
    location: Optional[ShipLocation] = None
    details: Dict[str, Any] = {}
    dataset: str

class Ship(BaseModel):
    vessel_id: str
    name: Optional[str] = None
    mmsi: Optional[str] = None
    imo: Optional[str] = None
    flag: Optional[str] = None
    vessel_type: Optional[str] = None
    last_known_location: Optional[ShipLocation] = None
    events: List[ShipEvent] = []
    risk_score: float = 0.0

class Alert(BaseModel):
    alert_id: str
    timestamp: datetime
    ship_id: str
    ship_name: Optional[str] = None
    alert_type: AlertType
    severity: AlertSeverity
    location: Optional[ShipLocation] = None
    description: str
    reasoning: str
    evidence: List[str] = []
    status: str = "active"

class BehaviorPattern(BaseModel):
    pattern_type: str
    description: str
    confidence: float
    evidence: List[str] = []

class ShipBehaviorAnalysis(BaseModel):
    ship_id: str
    ship_name: Optional[str] = None
    analysis_timestamp: datetime
    patterns: List[BehaviorPattern] = []
    risk_factors: List[str] = []
    overall_risk_score: float = 0.0
    recommendations: List[str] = []

class MongoDBTool(BaseTool):
    name: str = "mongodb_query"
    description: str = "Query MongoDB for ship data, events, and behavior patterns"
    db: Database = Field(exclude=True)
    
    def __init__(self, db: Database, **kwargs):
        super().__init__(db=db, **kwargs)
    
    def _run(self, query_type: str, **kwargs) -> str:
        """Execute MongoDB queries for ship monitoring"""
        try:
            if query_type == "get_ships":
                return self._get_ships(**kwargs)
            elif query_type == "get_ship_events":
                return self._get_ship_events(**kwargs)
            elif query_type == "get_recent_events":
                return self._get_recent_events(**kwargs)
            elif query_type == "get_loitering_events":
                return self._get_loitering_events(**kwargs)
            elif query_type == "get_port_visits":
                return self._get_port_visits(**kwargs)
            elif query_type == "get_encounters":
                return self._get_encounters(**kwargs)
            else:
                return f"Unknown query type: {query_type}"
        except Exception as e:
            return f"Error executing query: {str(e)}"
    
    def _get_ships(self, limit: int = 100, **kwargs) -> str:
        """Get ships from database"""
        ships_collection = self.db.gfw_ships
        ships = list(ships_collection.find({}, limit=limit))
        return f"Found {len(ships)} ships: {ships[:5]}"  # Return first 5 for brevity
    
    def _get_ship_events(self, vessel_id: str, days: int = 30, **kwargs) -> str:
        """Get events for a specific ship"""
        events_collection = self.db.gfw_ship_events
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        events = list(events_collection.find({
            "vessel_id": vessel_id,
            "timestamp": {"$gte": start_date}
        }).sort("timestamp", -1))
        
        return f"Found {len(events)} events for vessel {vessel_id}"
    
    def _get_recent_events(self, hours: int = 24, **kwargs) -> str:
        """Get recent events across all ships"""
        events_collection = self.db.gfw_ship_events
        start_date = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        events = list(events_collection.find({
            "timestamp": {"$gte": start_date}
        }).sort("timestamp", -1).limit(100))
        
        return f"Found {len(events)} recent events in the last {hours} hours"
    
    def _get_loitering_events(self, days: int = 7, **kwargs) -> str:
        """Get loitering events"""
        events_collection = self.db.gfw_ship_events
        
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        loitering_events = list(events_collection.find({
            "_datasetId": "public-global-loitering-events:latest",
            "timestamp": {"$gte": start_date}
        }).sort("timestamp", -1))
        
        return f"Found {len(loitering_events)} loitering events in the last {days} days"
    
    def _get_port_visits(self, days: int = 7, **kwargs) -> str:
        """Get port visit events"""
        events_collection = self.db.gfw_ship_events
        
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        port_events = list(events_collection.find({
            "_datasetId": "public-global-port-visits-events:latest",
            "timestamp": {"$gte": start_date}
        }).sort("timestamp", -1))
        
        return f"Found {len(port_events)} port visit events in the last {days} days"
    
    def _get_encounters(self, days: int = 7, **kwargs) -> str:
        """Get ship encounter events"""
        events_collection = self.db.gfw_ship_events
        
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        encounter_events = list(events_collection.find({
            "_datasetId": "public-global-encounters-events:latest",
            "timestamp": {"$gte": start_date}
        }).sort("timestamp", -1))
        
        return f"Found {len(encounter_events)} encounter events in the last {days} days"

class AlertGeneratorTool(BaseTool):
    name: str = "generate_alert"
    description: str = "Generate alerts for suspicious ship behavior"
    db: Database = Field(exclude=True)
    
    def __init__(self, db: Database, **kwargs):
        super().__init__(db=db, **kwargs)
    
    def _run(self, ship_id: str, alert_type: str, severity: str, description: str, reasoning: str, **kwargs) -> str:
        """Generate and store an alert"""
        try:
            alert = Alert(
                alert_id=f"alert_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{ship_id}",
                timestamp=datetime.now(timezone.utc),
                ship_id=ship_id,
                ship_name=kwargs.get("ship_name"),
                alert_type=AlertType(alert_type),
                severity=AlertSeverity(severity),
                location=kwargs.get("location"),
                description=description,
                reasoning=reasoning,
                evidence=kwargs.get("evidence", [])
            )
            
            # Store alert in MongoDB
            alerts_collection = self.db.ship_alerts
            alerts_collection.insert_one(alert.model_dump())
            
            return f"Alert generated successfully: {alert.alert_id}"
        except Exception as e:
            return f"Error generating alert: {str(e)}"

class BehaviorAnalyzerTool(BaseTool):
    name: str = "analyze_behavior"
    description: str = "Analyze ship behavior patterns and calculate risk scores"
    db: Database = Field(exclude=True)
    
    def __init__(self, db: Database, **kwargs):
        super().__init__(db=db, **kwargs)
    
    def _run(self, ship_id: str, **kwargs) -> str:
        """Analyze behavior patterns for a specific ship"""
        try:
            # Get ship events
            events_collection = self.db.gfw_ship_events
            ships_collection = self.db.gfw_ships
            
            # Get ship info
            ship_info = ships_collection.find_one({"vessel_id": ship_id})
            ship_name = ship_info.get("name") if ship_info else None
            
            # Get recent events
            start_date = datetime.now(timezone.utc) - timedelta(days=30)
            events = list(events_collection.find({
                "vessel_id": ship_id,
                "timestamp": {"$gte": start_date}
            }).sort("timestamp", -1))
            
            # Analyze patterns
            patterns = []
            risk_factors = []
            risk_score = 0.0
            
            # Check for loitering
            loitering_events = [e for e in events if e.get("_datasetId") == "public-global-loitering-events:latest"]
            if loitering_events:
                patterns.append(BehaviorPattern(
                    pattern_type="loitering",
                    description=f"Ship has {len(loitering_events)} loitering events",
                    confidence=0.8,
                    evidence=[f"Loitering event at {e.get('timestamp')}" for e in loitering_events[:3]]
                ))
                risk_score += 0.3
            
            # Check for encounters
            encounter_events = [e for e in events if e.get("_datasetId") == "public-global-encounters-events:latest"]
            if encounter_events:
                patterns.append(BehaviorPattern(
                    pattern_type="encounters",
                    description=f"Ship has {len(encounter_events)} encounter events",
                    confidence=0.7,
                    evidence=[f"Encounter with {e.get('vessel_id_2', 'unknown')} at {e.get('timestamp')}" for e in encounter_events[:3]]
                ))
                risk_score += 0.2
            
            # Check for port visits
            port_events = [e for e in events if e.get("_datasetId") == "public-global-port-visits-events:latest"]
            if port_events:
                patterns.append(BehaviorPattern(
                    pattern_type="port_visits",
                    description=f"Ship has {len(port_events)} port visit events",
                    confidence=0.9,
                    evidence=[f"Port visit at {e.get('port_name', 'unknown')} at {e.get('timestamp')}" for e in port_events[:3]]
                ))
            
            # Store analysis
            analysis = ShipBehaviorAnalysis(
                ship_id=ship_id,
                ship_name=ship_name,
                analysis_timestamp=datetime.now(timezone.utc),
                patterns=patterns,
                risk_factors=risk_factors,
                overall_risk_score=min(risk_score, 1.0),
                recommendations=["Monitor closely" if risk_score > 0.5 else "Continue normal monitoring"]
            )
            
            # Store in MongoDB
            analysis_collection = self.db.ship_behavior_analysis
            analysis_collection.insert_one(analysis.model_dump())
            
            return f"Behavior analysis completed for {ship_id}. Risk score: {risk_score:.2f}"
        except Exception as e:
            return f"Error analyzing behavior: {str(e)}"

class ShipMonitorAgent:
    def __init__(self):
        self.client = MongoClient(MONGODB_URI)
        self.db = self.client[DB_NAME]
        self.llm = ChatOpenAI(
            model="gpt-4",
            temperature=0.1,
            openai_api_key=OPENAI_API_KEY
        )
        
        # Initialize tools
        self.mongodb_tool = MongoDBTool(self.db)
        self.alert_tool = AlertGeneratorTool(self.db)
        self.behavior_tool = BehaviorAnalyzerTool(self.db)
        
        self.tools = [self.mongodb_tool, self.alert_tool, self.behavior_tool]
        
        # Create agent
        self.agent = self._create_agent()
        self.agent_executor = AgentExecutor(
            agent=self.agent,
            tools=self.tools,
            verbose=True,
            handle_parsing_errors=True
        )
    
    def _create_agent(self):
        """Create the AI agent with monitoring capabilities"""
        system_prompt = """You are OceanWatch, an AI maritime intelligence agent specialized in monitoring ship behavior patterns and detecting suspicious activities.

Your primary responsibilities:
1. Monitor ship movements, port entries/exits, loitering behavior, and encounters
2. Analyze behavior patterns to identify potential security risks
3. Generate alerts for suspicious activities with detailed reasoning
4. Continuously assess risk levels for vessels

Key monitoring areas:
- Loitering in sensitive areas
- Unusual port visits or extended stays
- Suspicious encounters between vessels
- Gaps in tracking data
- Speed anomalies
- Route deviations

When analyzing behavior, consider:
- Historical patterns
- Geographic context
- Vessel type and flag
- Time patterns
- Frequency of events

Generate alerts with:
- Clear description of suspicious activity
- Evidence and reasoning
- Appropriate severity level
- Specific location and timestamp
- Recommended actions

Always provide detailed reasoning for your assessments and recommendations."""

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])
        
        return create_openai_tools_agent(self.llm, self.tools, prompt)
    
    async def monitor_ships(self):
        """Main monitoring loop"""
        print("🚢 Starting OceanWatch Ship Monitor Agent...")
        
        while True:
            try:
                # Get recent events
                recent_events = self.mongodb_tool._run("get_recent_events", hours=6)
                
                # Analyze behavior for ships with recent activity
                ships = self.mongodb_tool._run("get_ships", limit=50)
                
                # Check for loitering events
                loitering_events = self.mongodb_tool._run("get_loitering_events", days=1)
                
                # Check for encounters
                encounter_events = self.mongodb_tool._run("get_encounters", days=1)
                
                # Generate monitoring report
                monitoring_prompt = f"""
                Analyze the following maritime data and identify any suspicious activities:
                
                Recent Events: {recent_events}
                Ships: {ships}
                Loitering Events: {loitering_events}
                Encounter Events: {encounter_events}
                
                Please:
                1. Identify any ships with suspicious behavior patterns
                2. Analyze the risk level for each concerning vessel
                3. Generate alerts for any suspicious activities
                4. Provide recommendations for monitoring
                
                Focus on:
                - Ships with multiple loitering events
                - Unusual encounter patterns
                - Vessels in sensitive areas
                - Abnormal port visit patterns
                """
                
                result = await self.agent_executor.ainvoke({
                    "input": monitoring_prompt,
                    "chat_history": []
                })
                
                print(f"📊 Monitoring Report: {result['output']}")
                
                # Wait before next monitoring cycle
                await asyncio.sleep(300)  # 5 minutes
                
            except Exception as e:
                print(f"❌ Error in monitoring loop: {e}")
                await asyncio.sleep(60)  # Wait 1 minute before retrying
    
    async def analyze_specific_ship(self, ship_id: str):
        """Analyze behavior for a specific ship"""
        prompt = f"""
        Perform a detailed behavior analysis for ship {ship_id}.
        
        Please:
        1. Retrieve all recent events for this vessel
        2. Analyze behavior patterns and risk factors
        3. Calculate a risk score
        4. Generate alerts if suspicious activity is detected
        5. Provide specific recommendations
        
        Use the available tools to gather data and perform analysis.
        """
        
        result = await self.agent_executor.ainvoke({
            "input": prompt,
            "chat_history": []
        })
        
        return result['output']
    
    async def generate_alert_for_ship(self, ship_id: str, alert_type: str, description: str, reasoning: str):
        """Generate a specific alert for a ship"""
        prompt = f"""
        Generate an alert for ship {ship_id} with the following details:
        - Alert Type: {alert_type}
        - Description: {description}
        - Reasoning: {reasoning}
        
        Please:
        1. Assess the appropriate severity level
        2. Gather current location data if available
        3. Generate the alert using the alert tool
        4. Provide additional context and recommendations
        """
        
        result = await self.agent_executor.ainvoke({
            "input": prompt,
            "chat_history": []
        })
        
        return result['output']

# Main execution
async def main():
    agent = ShipMonitorAgent()
    
    # Start monitoring
    await agent.monitor_ships()

if __name__ == "__main__":
    asyncio.run(main())
