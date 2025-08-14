# 🚢 OceanWatch Maritime Intelligence Platform

**🔗 [View on Devpost](https://devpost.com/software/oceanwatch-d4ascm/joins/4i3Chg7HxymK5MU88mgDfw)**

An AI-powered maritime intelligence platform that continuously monitors ship behavior patterns and generates real-time alerts for suspicious activities.

## 📸 Screenshots

![OceanWatch Interface](OceanWatch3/images/visual1.png)
*Interactive map with vessel monitoring and behavior analysis*

![Visuals](OceanWatch3/images/visual.png)
*Main interface showing real-time ship tracking and alert management*

![RAG Agent](OceanWatch3/images/visual3.png)
*AI-powered alert generation and risk assessment interface*

## 🌟 Features

### 🤖 AI-Powered Monitoring
- **Continuous Ship Monitoring**: Real-time analysis of vessel movements and behavior patterns
- **Behavior Pattern Detection**: Identifies loitering, encounters, port visits, route deviations, and speed anomalies
- **Risk Assessment**: AI-powered risk scoring and threat evaluation
- **Automated Alert Generation**: Creates detailed alerts with reasoning and evidence

### 🗺️ Interactive Map Interface
- **Real-time Ship Tracking**: Live vessel positions with interactive markers
- **Alert Integration**: AI-generated alerts displayed in the sidebar
- **Ship Selection**: Click on ships to view detailed information and behavior analysis
- **Filtering & Search**: Advanced alert filtering by severity, type, and time

### 📊 Alert Management
- **Real-time Alerts**: Instant notifications for suspicious activities
- **Severity Levels**: Critical, High, Medium, and Low priority alerts
- **Alert Types**: Loitering, Port Entry/Exit, Suspicious Routes, Speed Anomalies, Encounters, Tracking Gaps
- **Evidence Tracking**: Detailed reasoning and evidence for each alert

## 🏗️ Architecture

```
OceanWatch Platform
├── 🤖 AI Agent (Python/FastAPI)
│   ├── GPT-4 Powered Analysis
│   ├── MongoDB Integration
│   ├── Real-time Monitoring
│   └── Alert Generation
├── 🌐 Frontend (Next.js/React)
│   ├── Interactive Map (Mapbox)
│   ├── Alert Dashboard
│   ├── Ship Management
│   └── Real-time Updates
└── 🗄️ Database (MongoDB)
    ├── Ship Data
    ├── Event History
    ├── Alerts
    └── Behavior Analysis
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- OpenAI API Key
- MongoDB Atlas Account

### 1. Clone and Setup
```bash
git clone <repository-url>
cd OceanWatch
```

### 2. Install Dependencies

**Backend (AI Agent)**
```bash
cd server
pip install -r requirements.txt
```

**Frontend**
```bash
cd client
npm install
```

### 3. Configuration

Create a `.env` file in the `server` directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
MONGODB_URI=mongodb+srv://johnliu:pword@neptune-main.2w2qohn.mongodb.net/main
MONGODB_DB=main
```

### 4. Start the Platform

**Option 1: Using the startup script**
```bash
python start_OceanWatch.py
```

**Option 2: Manual startup**

Terminal 1 (AI Agent):
```bash
cd server
python api_server.py
```

Terminal 2 (Frontend):
```bash
cd client
npm run dev
```

### 5. Access the Platform
- **Frontend**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs
- **API Health Check**: http://localhost:8000/health

## 🎯 Usage

### Starting AI Monitoring
1. Navigate to the API documentation at http://localhost:8000/docs
2. Use the `/start-monitoring` endpoint to begin continuous monitoring
3. The AI agent will start analyzing ship behavior patterns every 5 minutes

### Viewing Alerts
1. Open the frontend at http://localhost:3000
2. Alerts will appear in the sidebar automatically
3. Click on alerts to view detailed information
4. Use filters to focus on specific alert types or severity levels

### Analyzing Ships
1. Click on any ship marker on the map
2. View detailed ship information and behavior analysis
3. Check for any associated alerts
4. Review historical patterns and risk assessments

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key | Required |
| `OPENAI_MODEL` | OpenAI model to use | `gpt-4` |
| `MONGODB_URI` | MongoDB connection string | Pre-configured |
| `MONITORING_INTERVAL_SECONDS` | Monitoring frequency | `300` |
| `ALERT_SEVERITY_THRESHOLD` | Risk threshold for alerts | `0.5` |

### Alert Types

- **Loitering**: Vessels staying in restricted areas
- **Port Entry/Exit**: Unusual port activity patterns
- **Suspicious Routes**: Deviations from normal routes
- **Speed Anomalies**: Unusual speed patterns
- **Encounters**: Suspicious vessel meetings
- **Tracking Gaps**: Missing tracking data

### Severity Levels

- **Critical**: Immediate action required
- **High**: Significant risk requiring attention
- **Medium**: Moderate risk requiring monitoring
- **Low**: Minor concerns

## 📡 API Endpoints

### Core Endpoints
- `GET /` - Health check
- `GET /health` - Detailed health check
- `POST /start-monitoring` - Start AI monitoring
- `POST /stop-monitoring` - Stop AI monitoring
- `GET /monitoring-status` - Get monitoring status

### Ship Analysis
- `POST /analyze-ship/{id}` - Analyze specific ship
- `GET /ships` - Get ships list

### Alert Management
- `GET /recent-alerts` - Get recent alerts
- `GET /alert-stats` - Get alert statistics
- `POST /generate-alert` - Generate manual alert

## 🧠 AI Agent Capabilities

### Monitoring Areas
- **Loitering Detection**: Identifies vessels loitering in sensitive areas
- **Port Activity**: Monitors port entries/exits and unusual visit patterns
- **Ship Encounters**: Detects suspicious encounters between vessels
- **Route Analysis**: Identifies deviations from normal routes
- **Speed Anomalies**: Detects unusual speed patterns
- **Tracking Gaps**: Identifies periods of missing tracking data

### Analysis Features
- **Historical Pattern Analysis**: Compares current behavior to historical patterns
- **Geographic Context**: Considers location-based risk factors
- **Vessel Type Analysis**: Different risk profiles for different vessel types
- **Time Pattern Analysis**: Identifies temporal anomalies
- **Frequency Analysis**: Detects unusual event frequencies

## 🔒 Security Considerations

- Store API keys securely using environment variables
- Implement proper access controls for MongoDB
- Monitor API usage and costs
- Regularly update dependencies
- Implement rate limiting for API calls

## 🚀 Deployment

### Development
```bash
python start_OceanWatch.py
```

### Production
For production deployment, consider:
- Using a process manager (PM2, Supervisor)
- Setting up proper logging
- Implementing health checks
- Using environment-specific configurations
- Setting up monitoring and alerting

### Docker (Optional)
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
CMD ["python", "api_server.py"]
```

## 📈 Monitoring and Logging

The platform provides detailed logging for:
- Database queries and results
- AI analysis outcomes
- Alert generation
- Error handling
- Performance metrics

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
3. Test connections using the health check endpoint
4. Review the MongoDB data structure
5. Check the API documentation at http://localhost:8000/docs

## 🎉 What's Next?

- **Machine Learning Models**: Enhanced pattern recognition
- **Predictive Analytics**: Forecast potential security threats
- **Mobile App**: iOS and Android applications
- **Integration APIs**: Connect with other maritime systems
- **Advanced Visualization**: 3D maps and advanced analytics
- **Automated Response**: Automated threat response systems

---

**OceanWatch Maritime Intelligence Platform** - Protecting maritime security through AI-powered monitoring and analysis.
