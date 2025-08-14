import os
from typing import List, Dict, Any, Optional
import openai
import logging
from tenacity import retry, stop_after_attempt, wait_exponential
from dotenv import load_dotenv

# Load environment variables from parent directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

logger = logging.getLogger(__name__)

class MaritimeResponseGenerator:
    def __init__(self):
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        self.client = openai.OpenAI(api_key=api_key)
        self.model = "gpt-4-turbo-preview"  # Using GPT-4 for better reasoning
        
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def generate_response(self, query: str, context_documents: List[Dict[str, Any]], 
                         conversation_history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        """Generate a response using RAG approach"""
        try:
            # Create system prompt
            system_prompt = self._create_system_prompt()
            
            # Create user prompt with context
            user_prompt = self._create_user_prompt(query, context_documents)
            
            # Prepare messages
            messages = [{"role": "system", "content": system_prompt}]
            
            # Add conversation history if available
            if conversation_history:
                for msg in conversation_history[-6:]:  # Keep last 6 messages for context
                    messages.append(msg)
            
            # Add current query with context
            messages.append({"role": "user", "content": user_prompt})
            
            # Generate response
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=1000,
                stream=False
            )
            
            # Extract response content
            response_content = response.choices[0].message.content
            
            # Extract sources from context documents
            sources = self._extract_sources(context_documents)
            
            return {
                'response': response_content,
                'sources': sources,
                'context_summary': self._create_context_summary(context_documents),
                'confidence': self._calculate_confidence(context_documents)
            }
            
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return {
                'response': "I apologize, but I'm having trouble accessing the maritime data right now. Please try again later.",
                'sources': [],
                'context_summary': "No context available",
                'confidence': 'low'
            }
    
    def _create_system_prompt(self) -> str:
        """Create the system prompt for maritime intelligence"""
        return """You are OceanWatch, an advanced maritime intelligence assistant. You have access to comprehensive maritime data including:

- Vessel information (names, types, flags, MMSI, IMO)
- Ship events and activities (port visits, movements, encounters)
- Maritime alerts and suspicious activities
- Vessel insights and behavioral analysis
- Real-time tracking data

Your role is to:
1. Provide accurate, factual information about maritime activities
2. Analyze patterns and identify potential security concerns
3. Help users understand complex maritime situations
4. Cite specific data sources when providing information
5. Maintain a professional, authoritative tone
6. Acknowledge when information is limited or uncertain

Key capabilities:
- Query vessel information and activities
- Analyze suspicious behavior patterns
- Provide context for maritime alerts
- Compare vessel activities across time periods
- Identify unusual patterns or anomalies

Always be precise with maritime terminology and provide actionable insights when possible."""

    def _create_user_prompt(self, query: str, context_documents: List[Dict[str, Any]]) -> str:
        """Create user prompt with retrieved context"""
        if not context_documents:
            return f"User Query: {query}\n\nNo relevant maritime data found. Please provide a general response based on your maritime knowledge."

        # Format context documents
        context_text = "Relevant Maritime Data:\n\n"
        
        for i, doc in enumerate(context_documents[:5], 1):  # Limit to top 5 documents
            doc_type = doc.get('metadata', {}).get('document_type', 'unknown')
            content = doc.get('content', 'No content available')
            similarity = doc.get('similarity_score', 0)
            
            context_text += f"Document {i} ({doc_type}, relevance: {similarity:.2f}):\n{content}\n\n"
        
        # Add query
        context_text += f"User Query: {query}\n\n"
        context_text += "Please provide a comprehensive response based on the maritime data above. Include specific details and cite the relevant sources when possible."
        
        return context_text
    
    def _extract_sources(self, context_documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract source information from context documents"""
        sources = []
        
        for doc in context_documents:
            metadata = doc.get('metadata', {})
            source_info = {
                'collection': metadata.get('source_collection', 'unknown'),
                'document_type': metadata.get('document_type', 'unknown'),
                'ship_id': metadata.get('ship_id'),
                'timestamp': metadata.get('timestamp'),
                'similarity_score': doc.get('similarity_score', 0)
            }
            
            # Add specific details based on document type
            if metadata.get('document_type') == 'vessel_info':
                source_info['vessel_name'] = doc.get('name')
                source_info['vessel_type'] = doc.get('type')
                source_info['flag'] = doc.get('flag')
            
            elif metadata.get('document_type') == 'alert':
                source_info['alert_type'] = doc.get('alert_type')
                source_info['severity'] = doc.get('severity')
                source_info['ship_name'] = doc.get('ship_name')
            
            elif metadata.get('document_type') == 'event':
                source_info['event_type'] = doc.get('event_type')
                source_info['location'] = f"{doc.get('lat', 'Unknown')}, {doc.get('lon', 'Unknown')}"
            
            sources.append(source_info)
        
        return sources
    
    def _create_context_summary(self, context_documents: List[Dict[str, Any]]) -> str:
        """Create a summary of the context used"""
        if not context_documents:
            return "No maritime data available"
        
        # Count document types
        type_counts = {}
        for doc in context_documents:
            doc_type = doc.get('metadata', {}).get('document_type', 'unknown')
            type_counts[doc_type] = type_counts.get(doc_type, 0) + 1
        
        summary_parts = []
        for doc_type, count in type_counts.items():
            summary_parts.append(f"{count} {doc_type}(s)")
        
        return f"Based on {len(context_documents)} documents: {', '.join(summary_parts)}"
    
    def _calculate_confidence(self, context_documents: List[Dict[str, Any]]) -> str:
        """Calculate confidence level based on context quality"""
        if not context_documents:
            return 'low'
        
        # Calculate average similarity score
        avg_similarity = sum(doc.get('similarity_score', 0) for doc in context_documents) / len(context_documents)
        
        if avg_similarity > 0.8:
            return 'high'
        elif avg_similarity > 0.6:
            return 'medium'
        else:
            return 'low'
    
    def generate_follow_up_questions(self, query: str, response: str) -> List[str]:
        """Generate follow-up questions based on the conversation"""
        try:
            prompt = f"""Based on this maritime query and response, suggest 3 relevant follow-up questions:

Query: {query}
Response: {response}

Generate 3 specific, relevant follow-up questions that would help explore this topic further. Focus on maritime intelligence, vessel behavior, or security concerns."""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=200,
                stream=False
            )
            
            content = response.choices[0].message.content
            # Parse the response to extract questions
            questions = [q.strip() for q in content.split('\n') if q.strip() and '?' in q]
            return questions[:3]
            
        except Exception as e:
            logger.error(f"Error generating follow-up questions: {e}")
            return []

# Global instance
maritime_generator = MaritimeResponseGenerator()
