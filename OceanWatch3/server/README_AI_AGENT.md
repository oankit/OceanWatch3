# OceanWatch AI Ship Monitor Agent

An intelligent AI agent built with Pydantic and LangChain for monitoring maritime vessel behavior patterns and generating alerts for suspicious activities.

## 🚢 Features

- **Continuous Monitoring**: Real-time analysis of ship movements and behavior patterns
- **Behavior Analysis**: AI-powered risk assessment and pattern recognition
- **Alert Generation**: Automated alerts for suspicious activities with detailed reasoning
- **Maritime News Intelligence**: Real-time maritime news search using Perplexity AI
- **MongoDB Integration**: Seamless connection to your maritime database
- **GPT-4 Powered**: Advanced reasoning and analysis capabilities
- **Configurable**: Flexible configuration for different monitoring scenarios

## 🛠️ Installation

1. **Install Dependencies**:
```bash
pip install -r requirements.txt
```

2. **Set Environment Variables**:
Create a `.env` file in the server directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
MONGODB_URI=mongodb+srv://johnliu:pword@OceanWatch-main.2w2qohn.mongodb.net/main
MONGODB_DB=main
GFW_API_KEY=your_gfw_api_key_here
PERPLEXITY_API_KEY=your_perplexity_api_key_here
```

3. **Validate Configuration**:
```bash
python cli.py test
```

## 🎯 Usage

### CLI Commands

#### Start Continuous Monitoring
```bash
python cli.py monitor
```
Starts the AI agent in continuous monitoring mode, analyzing ship behavior every 5 minutes.

#### Analyze Specific Ship
```bash
python cli.py analyze <ship_id>
```
Performs detailed behavior analysis for a specific vessel.

#### Generate Alert
```bash
python cli.py alert <ship_id> <alert_type> <description> <reasoning>
```
Manually generate an alert for a specific ship.

#### List Ships
```bash
python cli.py list-ships --limit 20
```
List ships in the database with optional limit.

#### Get Recent Alerts
```bash
python cli.py alerts --hours 48
```
Get alerts from the last specified hours.

#### Test Connections
```bash
python cli.py test
```
Test database and API connections.

### Programmatic Usage

```python
from ship_monitor_agent import ShipMonitorAgent
import asyncio

async def main():
    # Initialize agent
    agent = ShipMonitorAgent()
    
    # Analyze specific ship
    result = await agent.analyze_specific_ship("vessel_123")
    print(result)
    
    # Generate alert
    alert_result = await agent.generate_alert_for_ship(
        ship_id="vessel_123",
        alert_type="loitering",
        description="Ship loitering in sensitive area",
        reasoning="Multiple loitering events detected in restricted zone"
    )
    print(alert_result)

asyncio.run(main())
```

## 🔧 Configuration

The agent can be configured through environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | Required | Your OpenAI API key |
| `OPENAI_MODEL` | `gpt-4` | OpenAI model to use |
| `OPENAI_TEMPERATURE` | `0.1` | Model temperature |
| `MONGODB_URI` | Pre-configured | MongoDB connection string |
| `MONGODB_DB` | `main` | Database name |
| `MONITORING_INTERVAL_SECONDS` | `300` | Monitoring interval |
| `ALERT_SEVERITY_THRESHOLD` | `0.5` | Risk threshold for alerts |
| `MAX_EVENTS_PER_QUERY` | `100` | Max events per query |
| `ANALYSIS_DAYS_BACK` | `30` | Days to analyze |

## 🧠 AI Agent Capabilities

### Monitoring Areas
- **Loitering Detection**: Identifies vessels loitering in sensitive areas
- **Port Activity**: Monitors port entries/exits and unusual visit patterns
- **Ship Encounters**: Detects suspicious encounters between vessels
- **Route Analysis**: Identifies deviations from normal routes
- **Speed Anomalies**: Detects unusual speed patterns
- **Tracking Gaps**: Identifies periods of missing tracking data

### Alert Types
- `loitering`: Vessel loitering in restricted areas
- `port_entry`: Unusual port entry patterns
- `port_exit`: Suspicious port exit behavior
- `suspicious_route`: Deviations from normal routes
- `speed_anomaly`: Unusual speed patterns
- `encounter`: Suspicious vessel encounters
- `gap_in_tracking`: Missing tracking data

### Severity Levels
- `low`: Minor concerns requiring attention
- `medium`: Moderate risk requiring monitoring
- `high`: Significant risk requiring immediate attention
- `critical`: Critical risk requiring urgent response

## 📊 Data Models

### Ship
```python
class Ship(BaseModel):
    vessel_id: str
    name: Optional[str]
    mmsi: Optional[str]
    imo: Optional[str]
    flag: Optional[str]
    vessel_type: Optional[str]
    last_known_location: Optional[ShipLocation]
    events: List[ShipEvent]
    risk_score: float
```

### Alert
```python
class Alert(BaseModel):
    alert_id: str
    timestamp: datetime
    ship_id: str
    ship_name: Optional[str]
    alert_type: AlertType
    severity: AlertSeverity
    location: Optional[ShipLocation]
    description: str
    reasoning: str
    evidence: List[str]
    status: str
```

### Behavior Analysis
```python
class ShipBehaviorAnalysis(BaseModel):
    ship_id: str
    ship_name: Optional[str]
    analysis_timestamp: datetime
    patterns: List[BehaviorPattern]
    risk_factors: List[str]
    overall_risk_score: float
    recommendations: List[str]
```

## 🔍 Tools

### MongoDB Tool
- `get_ships`: Retrieve ships from database
- `get_ship_events`: Get events for specific ship
- `get_recent_events`: Get recent events across all ships
- `get_loitering_events`: Get loitering events
- `get_port_visits`: Get port visit events
- `get_encounters`: Get ship encounter events

### Alert Generator Tool
- `generate_alert`: Create and store alerts with detailed reasoning

### Behavior Analyzer Tool
- `analyze_behavior`: Analyze behavior patterns and calculate risk scores

### Maritime News Tool
- `maritime_news_search`: Search for current maritime news and industry developments using Perplexity AI
- Provides real-time intelligence on shipping incidents, port conditions, and maritime regulations
- Filters results from trusted maritime news sources
- Returns structured data with citations and timestamps

#### Maritime News Usage Examples
```python
# Search for recent maritime incidents
result = agent.maritime_news_tool._run("shipping accidents Red Sea")

# Get port condition updates
result = agent.maritime_news_tool._run("port congestion Los Angeles")

# Check for regulatory changes
result = agent.maritime_news_tool._run("IMO regulations 2024")
```

#### Maritime News Response Format
```json
{
  "status": "success",
  "query": "shipping accidents Red Sea",
  "content": "Recent maritime incidents in the Red Sea...",
  "citations": ["https://maritime-executive.com/..."],
  "timestamp": "2024-12-01T14:30:22Z"
}
```

## 🚨 Alert Examples

### Loitering Alert
```
Alert ID: alert_20241201_143022_vessel_123
Ship: M/V SUSPICIOUS_VESSEL
Type: Loitering
Severity: High
Description: Vessel loitering in restricted maritime zone
Reasoning: Multiple loitering events detected over 48 hours in sensitive area
Location: 37.7749°N, 122.4194°W
```

### Encounter Alert
```
Alert ID: alert_20241201_143045_vessel_456
Ship: M/V UNKNOWN_VESSEL
Type: Encounter
Severity: Medium
Description: Suspicious encounter with vessel of interest
Reasoning: Close encounter with flagged vessel in international waters
Location: 25.7617°N, 80.1918°W
```

## 🔧 Advanced Configuration

### Custom Risk Scoring
You can adjust risk weights in the configuration:

```env
LOITERING_RISK_WEIGHT=0.3
ENCOUNTER_RISK_WEIGHT=0.2
PORT_VISIT_RISK_WEIGHT=0.1
SPEED_ANOMALY_RISK_WEIGHT=0.2
```

### Alert Filtering
Enable/disable specific alert types:

```env
ENABLE_LOITERING_ALERTS=true
ENABLE_ENCOUNTER_ALERTS=true
ENABLE_PORT_ALERTS=true
```

## 🚀 Deployment

### Development
```bash
python cli.py monitor
```

### Production
For production deployment, consider:
- Using a process manager (PM2, Supervisor)
- Setting up logging
- Implementing health checks
- Using environment-specific configurations

### Docker (Optional)
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
CMD ["python", "cli.py", "monitor"]
```

## 📈 Monitoring and Logging

The agent provides detailed logging for:
- Database queries and results
- AI analysis outcomes
- Alert generation
- Error handling
- Performance metrics

## 🔒 Security Considerations

- Store API keys securely using environment variables
- Implement proper access controls for MongoDB
- Monitor API usage and costs
- Regularly update dependencies
- Implement rate limiting for API calls

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is part of the OceanWatch Maritime Intelligence platform.

## 🆘 Support

For issues and questions:
1. Check the logs for error details
2. Verify your configuration
3. Test connections using `python cli.py test`
4. Review the MongoDB data structure
