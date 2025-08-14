from typing import List, Dict, Any, Optional
import logging
from .retriever import maritime_retriever
from .generator import maritime_generator

logger = logging.getLogger(__name__)

class MaritimeRAGPipeline:
    def __init__(self):
        self.retriever = maritime_retriever
        self.generator = maritime_generator
    
    def process_query(self, query: str, context: Optional[Dict[str, Any]] = None, 
                     conversation_history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        """Process a user query through the RAG pipeline"""
        try:
            logger.info(f"Processing query: {query}")
            
            # Step 1: Retrieve relevant documents
            context_documents = self.retriever.retrieve_relevant_documents(query, context)
            logger.info(f"Retrieved {len(context_documents)} relevant documents")
            
            # Step 2: Generate response
            response_data = self.generator.generate_response(
                query, 
                context_documents, 
                conversation_history
            )
            
            # Step 3: Generate follow-up questions
            follow_up_questions = self.generator.generate_follow_up_questions(
                query, 
                response_data['response']
            )
            
            # Step 4: Prepare final response
            result = {
                'query': query,
                'response': response_data['response'],
                'sources': response_data['sources'],
                'context_summary': response_data['context_summary'],
                'confidence': response_data['confidence'],
                'follow_up_questions': follow_up_questions,
                'documents_retrieved': len(context_documents),
                'processing_time': None  # Can be added if timing is needed
            }
            
            logger.info(f"Successfully processed query with {len(context_documents)} documents")
            return result
            
        except Exception as e:
            logger.error(f"Error in RAG pipeline: {e}")
            return {
                'query': query,
                'response': "I apologize, but I encountered an error while processing your query. Please try again.",
                'sources': [],
                'context_summary': "Error occurred during processing",
                'confidence': 'low',
                'follow_up_questions': [],
                'documents_retrieved': 0,
                'error': str(e)
            }
    
    def process_ship_specific_query(self, ship_id: str, query: str, 
                                  conversation_history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        """Process a query specifically about a ship"""
        try:
            logger.info(f"Processing ship-specific query for {ship_id}: {query}")
            
            # Get ship-specific documents
            context_documents = self.retriever.get_ship_specific_data(ship_id, query)
            logger.info(f"Retrieved {len(context_documents)} ship-specific documents")
            
            # Generate response
            response_data = self.generator.generate_response(
                query, 
                context_documents, 
                conversation_history
            )
            
            # Generate follow-up questions
            follow_up_questions = self.generator.generate_follow_up_questions(
                query, 
                response_data['response']
            )
            
            result = {
                'query': query,
                'ship_id': ship_id,
                'response': response_data['response'],
                'sources': response_data['sources'],
                'context_summary': response_data['context_summary'],
                'confidence': response_data['confidence'],
                'follow_up_questions': follow_up_questions,
                'documents_retrieved': len(context_documents)
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Error in ship-specific RAG pipeline: {e}")
            return {
                'query': query,
                'ship_id': ship_id,
                'response': f"I apologize, but I encountered an error while processing your query about ship {ship_id}. Please try again.",
                'sources': [],
                'context_summary': "Error occurred during processing",
                'confidence': 'low',
                'follow_up_questions': [],
                'documents_retrieved': 0,
                'error': str(e)
            }
    
    def get_context_info(self) -> Dict[str, Any]:
        """Get contextual information about available data"""
        try:
            recent_alerts = self.retriever.get_recent_alerts_context(hours=24)
            vessel_types = self.retriever.get_vessel_types_context()
            
            return {
                'recent_alerts_count': len(recent_alerts),
                'vessel_types': vessel_types,
                'available_collections': ['vessels', 'events', 'vessel_insights', 'ship_alerts', 'ship_behavior_analysis']
            }
        except Exception as e:
            logger.error(f"Error getting context info: {e}")
            return {
                'recent_alerts_count': 0,
                'vessel_types': [],
                'available_collections': [],
                'error': str(e)
            }
    
    def suggest_queries(self, topic: str = "maritime") -> List[str]:
        """Suggest example queries for users"""
        suggestions = {
            "vessels": [
                "Show me all fishing vessels in the Pacific",
                "What cargo vessels are currently active?",
                "Find vessels with unusual behavior patterns",
                "Which vessels have the most port visits?"
            ],
            "alerts": [
                "What suspicious activities were detected recently?",
                "Show me high-priority alerts from the last 24 hours",
                "Which vessels have multiple alerts?",
                "What types of alerts are most common?"
            ],
            "behavior": [
                "Identify vessels with unusual speed patterns",
                "Find vessels that frequently change course",
                "Show me vessels that loiter in restricted areas",
                "Which vessels have gaps in their tracking data?"
            ],
            "analysis": [
                "Compare vessel behavior across different regions",
                "What patterns emerge in port visit frequency?",
                "Analyze vessel encounters and interactions",
                "Identify potential security risks"
            ]
        }
        
        return suggestions.get(topic, suggestions["vessels"])

# Global instance
maritime_rag_pipeline = MaritimeRAGPipeline()
