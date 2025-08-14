import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Configuration class for OceanWatch AI Agent"""
    
    # OpenAI Configuration
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4")
    OPENAI_TEMPERATURE: float = float(os.getenv("OPENAI_TEMPERATURE", "0.1"))
    
    # MongoDB Configuration
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb+srv://johnliu:pword@OceanWatch-main.2w2qohn.mongodb.net/main")
    MONGODB_DB: str = os.getenv("MONGODB_DB", "main")
    
    # GFW API Configuration
    GFW_API_KEY: Optional[str] = os.getenv("GFW_API_KEY")
    
    # Agent Configuration
    MONITORING_INTERVAL_SECONDS: int = int(os.getenv("MONITORING_INTERVAL_SECONDS", "300"))
    ALERT_SEVERITY_THRESHOLD: float = float(os.getenv("ALERT_SEVERITY_THRESHOLD", "0.5"))
    MAX_EVENTS_PER_QUERY: int = int(os.getenv("MAX_EVENTS_PER_QUERY", "100"))
    ANALYSIS_DAYS_BACK: int = int(os.getenv("ANALYSIS_DAYS_BACK", "30"))
    
    # Alert Configuration
    ENABLE_LOITERING_ALERTS: bool = os.getenv("ENABLE_LOITERING_ALERTS", "true").lower() == "true"
    ENABLE_ENCOUNTER_ALERTS: bool = os.getenv("ENABLE_ENCOUNTER_ALERTS", "true").lower() == "true"
    ENABLE_PORT_ALERTS: bool = os.getenv("ENABLE_PORT_ALERTS", "true").lower() == "true"
    
    # Risk Scoring Weights
    LOITERING_RISK_WEIGHT: float = float(os.getenv("LOITERING_RISK_WEIGHT", "0.3"))
    ENCOUNTER_RISK_WEIGHT: float = float(os.getenv("ENCOUNTER_RISK_WEIGHT", "0.2"))
    PORT_VISIT_RISK_WEIGHT: float = float(os.getenv("PORT_VISIT_RISK_WEIGHT", "0.1"))
    SPEED_ANOMALY_RISK_WEIGHT: float = float(os.getenv("SPEED_ANOMALY_RISK_WEIGHT", "0.2"))
    
    @classmethod
    def validate(cls) -> bool:
        """Validate required configuration"""
        if not cls.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is required")
        if not cls.MONGODB_URI:
            raise ValueError("MONGODB_URI is required")
        return True

# Global config instance
config = Config()
