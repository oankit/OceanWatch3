from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio
import uvicorn
from datetime import datetime, timezone
import logging
from typing import Dict, Any, Optional
import os

from ship_monitor_agent import ShipMonitorAgent
from config import config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="OceanWatch AI Agent API",
    description="API for OceanWatch AI Ship Monitor Agent",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global agent instance
agent: Optional[ShipMonitorAgent] = None
monitoring_task: Optional[asyncio.Task] = None
is_monitoring = False

@app.on_event("startup")
async def startup_event():
    """Initialize the AI agent on startup"""
    global agent
    try:
        logger.info("🚀 Starting OceanWatch AI Agent API Server...")
        config.validate()
        agent = ShipMonitorAgent()
        logger.info("✅ AI Agent initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize AI Agent: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    global monitoring_task
    if monitoring_task and not monitoring_task.done():
        monitoring_task.cancel()
        try:
            await monitoring_task
        except asyncio.CancelledError:
            pass
    logger.info("👋 OceanWatch AI Agent API Server stopped")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "OceanWatch AI Agent API",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "monitoring_active": is_monitoring
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    try:
        if not agent:
            raise HTTPException(status_code=503, detail="Agent not initialized")
        
        # Test MongoDB connection
        recent_events = agent.mongodb_tool._run("get_recent_events", hours=1)
        
        return {
            "status": "healthy",
            "agent_initialized": agent is not None,
            "mongodb_connected": "Found" in recent_events,
            "monitoring_active": is_monitoring,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail=f"Health check failed: {str(e)}")

@app.post("/start-monitoring")
async def start_monitoring(background_tasks: BackgroundTasks):
    """Start continuous monitoring"""
    global monitoring_task, is_monitoring
    
    if is_monitoring:
        return {"message": "Monitoring is already active", "status": "running"}
    
    try:
        if not agent:
            raise HTTPException(status_code=503, detail="Agent not initialized")
        
        # Start monitoring in background
        monitoring_task = asyncio.create_task(agent.monitor_ships())
        is_monitoring = True
        
        logger.info("📊 Started continuous monitoring")
        
        return {
            "message": "Monitoring started successfully",
            "status": "started",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to start monitoring: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start monitoring: {str(e)}")

@app.post("/stop-monitoring")
async def stop_monitoring():
    """Stop continuous monitoring"""
    global monitoring_task, is_monitoring
    
    if not is_monitoring:
        return {"message": "Monitoring is not active", "status": "stopped"}
    
    try:
        if monitoring_task and not monitoring_task.done():
            monitoring_task.cancel()
            try:
                await monitoring_task
            except asyncio.CancelledError:
                pass
        
        is_monitoring = False
        logger.info("🛑 Stopped continuous monitoring")
        
        return {
            "message": "Monitoring stopped successfully",
            "status": "stopped",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to stop monitoring: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to stop monitoring: {str(e)}")

@app.get("/monitoring-status")
async def get_monitoring_status():
    """Get current monitoring status"""
    return {
        "is_monitoring": is_monitoring,
        "agent_initialized": agent is not None,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.post("/analyze-ship/{ship_id}")
async def analyze_ship(ship_id: str):
    """Analyze a specific ship"""
    try:
        if not agent:
            raise HTTPException(status_code=503, detail="Agent not initialized")
        
        result = await agent.analyze_specific_ship(ship_id)
        
        return {
            "ship_id": ship_id,
            "analysis": result,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to analyze ship {ship_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze ship: {str(e)}")

@app.post("/generate-alert")
async def generate_alert(
    ship_id: str,
    alert_type: str,
    description: str,
    reasoning: str,
    severity: str = "medium"
):
    """Generate a specific alert"""
    try:
        if not agent:
            raise HTTPException(status_code=503, detail="Agent not initialized")
        
        result = await agent.generate_alert_for_ship(
            ship_id=ship_id,
            alert_type=alert_type,
            description=description,
            reasoning=reasoning
        )
        
        return {
            "ship_id": ship_id,
            "alert_result": result,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to generate alert for ship {ship_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate alert: {str(e)}")

@app.get("/recent-alerts")
async def get_recent_alerts(hours: int = 6, limit: int = 50):
    """Get recent alerts"""
    try:
        if not agent:
            raise HTTPException(status_code=503, detail="Agent not initialized")
        
        # Get alerts from MongoDB
        alerts_collection = agent.db.ship_alerts
        start_date = datetime.now(timezone.utc).replace(hour=datetime.now(timezone.utc).hour - hours)
        
        alerts = list(alerts_collection.find({
            "timestamp": {"$gte": start_date}
        }).sort("timestamp", -1).limit(limit))
        
        return {
            "alerts": alerts,
            "count": len(alerts),
            "hours": hours,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get recent alerts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get alerts: {str(e)}")

@app.get("/alert-stats")
async def get_alert_stats(hours: int = 24):
    """Get alert statistics"""
    try:
        if not agent:
            raise HTTPException(status_code=503, detail="Agent not initialized")
        
        alerts_collection = agent.db.ship_alerts
        start_date = datetime.now(timezone.utc).replace(hour=datetime.now(timezone.utc).hour - hours)
        
        # Get total count
        total = alerts_collection.count_documents({
            "timestamp": {"$gte": start_date}
        })
        
        # Get counts by severity
        severity_pipeline = [
            {"$match": {"timestamp": {"$gte": start_date}}},
            {"$group": {"_id": "$severity", "count": {"$sum": 1}}}
        ]
        severity_results = list(alerts_collection.aggregate(severity_pipeline))
        
        by_severity = {"low": 0, "medium": 0, "high": 0, "critical": 0}
        for result in severity_results:
            if result["_id"] in by_severity:
                by_severity[result["_id"]] = result["count"]
        
        # Get counts by type
        type_pipeline = [
            {"$match": {"timestamp": {"$gte": start_date}}},
            {"$group": {"_id": "$alert_type", "count": {"$sum": 1}}}
        ]
        type_results = list(alerts_collection.aggregate(type_pipeline))
        
        by_type = {
            "loitering": 0, "port_entry": 0, "port_exit": 0,
            "suspicious_route": 0, "speed_anomaly": 0, "encounter": 0, "gap_in_tracking": 0
        }
        for result in type_results:
            if result["_id"] in by_type:
                by_type[result["_id"]] = result["count"]
        
        return {
            "total": total,
            "by_severity": by_severity,
            "by_type": by_type,
            "hours": hours,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get alert stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get alert stats: {str(e)}")

@app.get("/ships")
async def get_ships(limit: int = 100):
    """Get ships from database"""
    try:
        if not agent:
            raise HTTPException(status_code=503, detail="Agent not initialized")
        
        ships = agent.mongodb_tool._run("get_ships", limit=limit)
        
        return {
            "ships": ships,
            "limit": limit,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get ships: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get ships: {str(e)}")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )
