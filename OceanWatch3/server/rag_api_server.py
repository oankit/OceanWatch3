from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging
import os
from datetime import datetime
import json

# Import RAG components
from rag import maritime_rag_pipeline

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="OceanWatch RAG Chatbot API",
    description="RAG-powered maritime intelligence chatbot",
    version="1.0.0"
)

# Add CORS middleware
# Expand CORS to include common dev ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[ChatMessage]] = None
    context: Optional[Dict[str, Any]] = None
    ship_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    sources: List[Dict[str, Any]]
    context_summary: str
    confidence: str
    follow_up_questions: List[str]
    documents_retrieved: int
    processing_time: Optional[float] = None
    error: Optional[str] = None

class ContextInfoResponse(BaseModel):
    recent_alerts_count: int
    vessel_types: List[str]
    available_collections: List[str]
    error: Optional[str] = None

# Global conversation storage (in production, use a proper database)
conversation_store: Dict[str, List[ChatMessage]] = {}

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "OceanWatch RAG Chatbot API",
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    try:
        # Test database connection
        context_info = maritime_rag_pipeline.get_context_info()
        
        return {
            "status": "healthy",
            "database_connected": context_info.get('error') is None,
            "available_collections": context_info.get('available_collections', []),
            "recent_alerts_count": context_info.get('recent_alerts_count', 0),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Main chat endpoint"""
    try:
        import time
        start_time = time.time()
        
        # Convert conversation history to the format expected by the pipeline
        conversation_history = None
        if request.conversation_history:
            conversation_history = [
                {"role": msg.role, "content": msg.content}
                for msg in request.conversation_history
            ]
        
        # Process the query
        if request.ship_id:
            # Ship-specific query
            result = maritime_rag_pipeline.process_ship_specific_query(
                request.ship_id,
                request.message,
                conversation_history
            )
        else:
            # General query
            result = maritime_rag_pipeline.process_query(
                request.message,
                request.context,
                conversation_history
            )
        
        processing_time = time.time() - start_time
        
        # Add processing time to result
        result['processing_time'] = processing_time
        
        logger.info(f"Chat request processed in {processing_time:.2f}s")
        
        return ChatResponse(**result)
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/context-info", response_model=ContextInfoResponse)
async def get_context_info():
    """Get information about available data context"""
    try:
        context_info = maritime_rag_pipeline.get_context_info()
        return ContextInfoResponse(**context_info)
    except Exception as e:
        logger.error(f"Error getting context info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/suggestions/{topic}")
async def get_suggestions(topic: str = "vessels"):
    """Get suggested queries for a topic"""
    try:
        suggestions = maritime_rag_pipeline.suggest_queries(topic)
        return {
            "topic": topic,
            "suggestions": suggestions
        }
    except Exception as e:
        logger.error(f"Error getting suggestions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/suggestions")
async def get_all_suggestions():
    """Get all available query suggestions"""
    try:
        topics = ["vessels", "alerts", "behavior", "analysis"]
        all_suggestions = {}
        
        for topic in topics:
            all_suggestions[topic] = maritime_rag_pipeline.suggest_queries(topic)
        
        return {
            "suggestions": all_suggestions
        }
    except Exception as e:
        logger.error(f"Error getting all suggestions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/conversation/{session_id}")
async def store_conversation(session_id: str, messages: List[ChatMessage]):
    """Store conversation history for a session"""
    try:
        conversation_store[session_id] = messages
        return {"message": "Conversation stored", "session_id": session_id}
    except Exception as e:
        logger.error(f"Error storing conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/conversation/{session_id}")
async def get_conversation(session_id: str):
    """Get conversation history for a session"""
    try:
        messages = conversation_store.get(session_id, [])
        return {"session_id": session_id, "messages": messages}
    except Exception as e:
        logger.error(f"Error getting conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/conversation/{session_id}")
async def delete_conversation(session_id: str):
    """Delete conversation history for a session"""
    try:
        if session_id in conversation_store:
            del conversation_store[session_id]
        return {"message": "Conversation deleted", "session_id": session_id}
    except Exception as e:
        logger.error(f"Error deleting conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats")
async def get_stats():
    """Get API usage statistics"""
    try:
        return {
            "active_conversations": len(conversation_store),
            "total_sessions": len(conversation_store),
            "api_version": "1.0.0",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    
    # Check for required environment variables
    if not os.getenv('OPENAI_API_KEY'):
        logger.error("OPENAI_API_KEY environment variable is required")
        exit(1)
    
    # Start the server
    uvicorn.run(
        "rag_api_server:app",
        host="0.0.0.0",
        port=8001,  # Different port from the main API server
        reload=True,
        log_level="info"
    )
