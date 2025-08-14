import os
from typing import List, Dict, Any
import openai
import logging
from tenacity import retry, stop_after_attempt, wait_exponential
from dotenv import load_dotenv

# Load environment variables from parent directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self):
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        self.client = openai.OpenAI(api_key=api_key)
        self.model = "text-embedding-3-small"  # Using the latest embedding model
        
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def get_embedding(self, text: str) -> List[float]:
        """Get embedding for a single text"""
        try:
            response = self.client.embeddings.create(
                model=self.model,
                input=text,
                encoding_format="float"
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Error getting embedding: {e}")
            raise
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def get_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Get embeddings for multiple texts"""
        try:
            response = self.client.embeddings.create(
                model=self.model,
                input=texts,
                encoding_format="float"
            )
            return [data.embedding for data in response.data]
        except Exception as e:
            logger.error(f"Error getting batch embeddings: {e}")
            raise
    
    def create_document_embedding(self, document: Dict[str, Any]) -> Dict[str, Any]:
        """Create embedding for a document with metadata"""
        # Convert document to searchable text
        text_content = self._document_to_text(document)
        
        # Get embedding
        embedding = self.get_embedding(text_content)
        
        return {
            'content': text_content,
            'embedding': embedding,
            'metadata': {
                'source_collection': document.get('source_collection'),
                'source_id': str(document.get('_id')),
                'document_type': self._get_document_type(document),
                'timestamp': document.get('timestamp'),
                'ship_id': document.get('ship_id') or document.get('vessel_id'),
                'vessel_name': document.get('name'),
                'vessel_type': document.get('type'),
            }
        }
    
    def _document_to_text(self, document: Dict[str, Any]) -> str:
        """Convert document to searchable text"""
        text_parts = []
        
        # Handle different document types
        if document.get('source_collection') == 'vessels':
            text_parts.extend([
                f"Vessel: {document.get('name', 'Unknown')}",
                f"Type: {document.get('type', 'Unknown')}",
                f"Flag: {document.get('flag', 'Unknown')}",
                f"MMSI: {document.get('mmsi', 'Unknown')}",
                f"IMO: {document.get('imo', 'Unknown')}"
            ])
            
        elif document.get('source_collection') == 'events':
            text_parts.extend([
                f"Event: {document.get('event_type', 'Unknown')}",
                f"Location: {document.get('lat', 'Unknown')}, {document.get('lon', 'Unknown')}",
                f"Timestamp: {document.get('timestamp', 'Unknown')}",
                f"Description: {document.get('description', '')}"
            ])
            
        elif document.get('source_collection') == 'ship_alerts':
            text_parts.extend([
                f"Alert: {document.get('alert_type', 'Unknown')}",
                f"Severity: {document.get('severity', 'Unknown')}",
                f"Description: {document.get('description', '')}",
                f"Reasoning: {document.get('reasoning', '')}",
                f"Ship: {document.get('ship_name', 'Unknown')}"
            ])
            
        elif document.get('source_collection') == 'vessel_insights':
            text_parts.extend([
                f"Insight: {document.get('insight_type', 'Unknown')}",
                f"Description: {document.get('description', '')}",
                f"Confidence: {document.get('confidence', 'Unknown')}"
            ])
            
        elif document.get('source_collection') == 'ship_behavior_analysis':
            text_parts.extend([
                f"Behavior Analysis: {document.get('analysis_type', 'Unknown')}",
                f"Pattern: {document.get('pattern_description', '')}",
                f"Risk Level: {document.get('risk_level', 'Unknown')}",
                f"Recommendations: {document.get('recommendations', '')}"
            ])
        
        # Add any additional fields that might be useful
        for key, value in document.items():
            if key not in ['_id', 'source_collection', 'source_id'] and value:
                if isinstance(value, (str, int, float)):
                    text_parts.append(f"{key}: {value}")
                elif isinstance(value, list) and len(value) > 0:
                    text_parts.append(f"{key}: {', '.join(map(str, value[:3]))}")
        
        return " | ".join(text_parts)
    
    def _get_document_type(self, document: Dict[str, Any]) -> str:
        """Get the type of document for categorization"""
        collection = document.get('source_collection', '')

        type_mapping = {
            # canonical
            'vessels': 'vessel_info',
            'events': 'event',
            'ship_alerts': 'alert',
            'vessel_insights': 'insight',
            'ship_behavior_analysis': 'behavior_analysis',
            # present in this DB
            'ships': 'vessel_info',
            'vessel': 'vessel_info',
            'gfw_ships': 'vessel_info',
            'shipEvents': 'event',
            'vessel_stats': 'insight',
            'maritime_alerts': 'alert',
        }

        return type_mapping.get(collection, 'unknown')
    
    def create_query_embedding(self, query: str) -> List[float]:
        """Create embedding for a user query"""
        return self.get_embedding(query)
    
    def calculate_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """Calculate cosine similarity between two embeddings"""
        import numpy as np
        
        vec1 = np.array(embedding1)
        vec2 = np.array(embedding2)
        
        # Calculate cosine similarity
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return dot_product / (norm1 * norm2)

# Global instance
embedding_service = EmbeddingService()
