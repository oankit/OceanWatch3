from typing import List, Dict, Any, Optional
import logging
from .database import mongodb_connection
from .embeddings import embedding_service
import numpy as np

logger = logging.getLogger(__name__)

class MaritimeRetriever:
    def __init__(self, max_results: int = 10):
        self.max_results = max_results
        self.db = mongodb_connection
        self.embedding_service = embedding_service
    
    def retrieve_relevant_documents(self, query: str, context: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Retrieve relevant documents for a given query"""
        try:
            # Get query embedding
            query_embedding = self.embedding_service.create_query_embedding(query)
            
            # Get documents from database
            documents = self.db.get_maritime_data(query, limit=50)
            
            if not documents:
                logger.warning("No documents found for query")
                return []
            
            # Create embeddings for documents and calculate similarities
            scored_documents = []
            
            for doc in documents:
                try:
                    # Create embedding for document
                    doc_embedding_data = self.embedding_service.create_document_embedding(doc)
                    doc_embedding = doc_embedding_data['embedding']
                    
                    # Calculate similarity
                    similarity = self.embedding_service.calculate_similarity(query_embedding, doc_embedding)
                    
                    # Add scoring information
                    scored_doc = {
                        **doc,
                        'similarity_score': similarity,
                        'content': doc_embedding_data['content'],
                        'metadata': doc_embedding_data['metadata']
                    }
                    
                    scored_documents.append(scored_doc)
                    
                except Exception as e:
                    logger.warning(f"Error processing document: {e}")
                    continue
            
            # Sort by similarity score and return top results
            scored_documents.sort(key=lambda x: x.get('similarity_score', 0), reverse=True)
            
            # Apply additional filtering based on context
            if context:
                scored_documents = self._apply_context_filtering(scored_documents, context)
            
            top_docs = scored_documents[:self.max_results]
            # Build a brief context summary for logging/troubleshooting
            try:
                from collections import Counter
                types = Counter([d.get('metadata', {}).get('document_type', 'unknown') for d in top_docs])
                logger.info(f"Retrieved top docs by type: {dict(types)}")
            except Exception:
                pass
            return top_docs
            
        except Exception as e:
            logger.error(f"Error in document retrieval: {e}")
            return []
    
    def _apply_context_filtering(self, documents: List[Dict[str, Any]], context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Apply context-based filtering to documents"""
        filtered_docs = []
        
        for doc in documents:
            # Check if document matches context criteria
            if self._matches_context(doc, context):
                filtered_docs.append(doc)
        
        return filtered_docs
    
    def _matches_context(self, document: Dict[str, Any], context: Dict[str, Any]) -> bool:
        """Check if document matches context criteria"""
        # Ship-specific context
        if 'ship_id' in context:
            doc_ship_id = document.get('ship_id') or document.get('vessel_id')
            if doc_ship_id and doc_ship_id != context['ship_id']:
                return False
        
        # Time-based context
        if 'time_range' in context:
            doc_timestamp = document.get('timestamp')
            if doc_timestamp:
                # Simple time range check (can be enhanced)
                pass
        
        # Location-based context
        if 'location' in context:
            doc_lat = document.get('lat')
            doc_lon = document.get('lon')
            if doc_lat and doc_lon:
                # Simple location check (can be enhanced with distance calculation)
                pass
        
        return True
    
    def get_ship_specific_data(self, ship_id: str, query: str) -> List[Dict[str, Any]]:
        """Get ship-specific data for a query"""
        try:
            # Get comprehensive ship data
            ship_data = self.db.get_ship_data(ship_id)
            
            # Convert to documents with source information
            documents = []
            
            if ship_data['vessel_info']:
                ship_data['vessel_info']['source_collection'] = 'vessels'
                documents.append(ship_data['vessel_info'])
            
            for event in ship_data['events']:
                event['source_collection'] = 'events'
                documents.append(event)
            
            for insight in ship_data['insights']:
                insight['source_collection'] = 'vessel_insights'
                documents.append(insight)
            
            for alert in ship_data['alerts']:
                alert['source_collection'] = 'ship_alerts'
                documents.append(alert)
            
            for behavior in ship_data['behavior_analysis']:
                behavior['source_collection'] = 'ship_behavior_analysis'
                documents.append(behavior)
            
            # Get query embedding
            query_embedding = self.embedding_service.create_query_embedding(query)
            
            # Score documents
            scored_documents = []
            for doc in documents:
                try:
                    doc_embedding_data = self.embedding_service.create_document_embedding(doc)
                    doc_embedding = doc_embedding_data['embedding']
                    similarity = self.embedding_service.calculate_similarity(query_embedding, doc_embedding)
                    
                    scored_doc = {
                        **doc,
                        'similarity_score': similarity,
                        'content': doc_embedding_data['content'],
                        'metadata': doc_embedding_data['metadata']
                    }
                    scored_documents.append(scored_doc)
                    
                except Exception as e:
                    logger.warning(f"Error processing ship document: {e}")
                    continue
            
            # Sort and return top results
            scored_documents.sort(key=lambda x: x.get('similarity_score', 0), reverse=True)
            return scored_documents[:self.max_results]
            
        except Exception as e:
            logger.error(f"Error getting ship-specific data: {e}")
            return []
    
    def get_recent_alerts_context(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get recent alerts for context"""
        try:
            alerts = self.db.get_recent_alerts(hours=hours, limit=10)
            
            # Add source information
            for alert in alerts:
                alert['source_collection'] = 'ship_alerts'
            
            return alerts
        except Exception as e:
            logger.error(f"Error getting recent alerts: {e}")
            return []
    
    def get_vessel_types_context(self) -> List[str]:
        """Get vessel types for context"""
        try:
            return self.db.get_vessel_types()
        except Exception as e:
            logger.error(f"Error getting vessel types: {e}")
            return []
    
    def create_context_summary(self, documents: List[Dict[str, Any]]) -> str:
        """Create a summary of retrieved documents for context"""
        if not documents:
            return "No relevant maritime data found."
        
        summary_parts = []
        
        # Group by document type
        by_type = {}
        for doc in documents:
            doc_type = doc.get('metadata', {}).get('document_type', 'unknown')
            if doc_type not in by_type:
                by_type[doc_type] = []
            by_type[doc_type].append(doc)
        
        # Create summary for each type
        for doc_type, docs in by_type.items():
            if doc_type == 'vessel_info':
                vessel_names = [doc.get('name', 'Unknown') for doc in docs[:3]]
                summary_parts.append(f"Vessels: {', '.join(vessel_names)}")
            
            elif doc_type == 'alert':
                alert_types = [doc.get('alert_type', 'Unknown') for doc in docs[:3]]
                summary_parts.append(f"Alerts: {', '.join(alert_types)}")
            
            elif doc_type == 'event':
                event_types = [doc.get('event_type', 'Unknown') for doc in docs[:3]]
                summary_parts.append(f"Events: {', '.join(event_types)}")
            
            elif doc_type == 'insight':
                insight_types = [doc.get('insight_type', 'Unknown') for doc in docs[:3]]
                summary_parts.append(f"Insights: {', '.join(insight_types)}")
        
        return f"Context: {'; '.join(summary_parts)}"

# Global instance
maritime_retriever = MaritimeRetriever()
