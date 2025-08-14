import os
from typing import List, Dict, Any, Optional
from pymongo import MongoClient
from pymongo.database import Database
from pymongo.collection import Collection
import logging
from dotenv import load_dotenv

# Load environment variables from parent directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

logger = logging.getLogger(__name__)

class MongoDBConnection:
    def __init__(self):
        self.client: Optional[MongoClient] = None
        self.db: Optional[Database] = None
        self.connection_string = os.getenv('MONGODB_URI', 'mongodb+srv://johnliu:pword@neptune-main.2w2qohn.mongodb.net/main')
        
    def connect(self) -> Database:
        """Establish connection to MongoDB"""
        try:
            self.client = MongoClient(self.connection_string)
            self.db = self.client.main  # Using 'main' database
            logger.info("Successfully connected to MongoDB")
            return self.db
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise
    
    def get_collection(self, collection_name: str) -> Collection:
        """Get a specific collection"""
        if self.db is None:
            self.connect()
        return self.db[collection_name]
    
    def get_maritime_data(self, query: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get maritime data from relevant collections present in the database"""
        if self.db is None:
            self.connect()

        results: List[Dict[str, Any]] = []

        # Discover available collections and map them to logical types
        try:
            available = set(self.db.list_collection_names())
        except Exception:
            available = set()

        # Map logical types to actual collection names present in this DB
        logical_to_candidates = {
            'vessels': ['vessels', 'ships', 'vessel', 'gfw_ships'],
            'events': ['events', 'shipEvents'],
            'vessel_insights': ['vessel_insights', 'vessel_stats'],
            'ship_alerts': ['ship_alerts', 'maritime_alerts'],
            'ship_behavior_analysis': ['ship_behavior_analysis'],
        }

        actual_collections: List[Dict[str, str]] = []
        for logical, candidates in logical_to_candidates.items():
            for cand in candidates:
                if cand in available:
                    actual_collections.append({'name': cand, 'logical': logical})

        if not actual_collections:
            logger.warning("No known collections found for maritime data retrieval")
            return []

        per_coll = max(1, limit // len(actual_collections))

        # Fields to try for regex fallback per logical type
        search_fields_map = {
            'vessels': ['name', 'type', 'flag', 'mmsi', 'imo', 'id', 'vessel_type', 'vessel_id'],
            'events': ['event_type', 'description', 'vessel_id', 'ship_id', 'name', 'type'],
            'vessel_insights': ['insight_type', 'description', 'vessel_id'],
            'ship_alerts': ['alert_type', 'severity', 'description', 'reasoning', 'ship_name', 'ship_id'],
            'ship_behavior_analysis': ['analysis_type', 'pattern_description', 'recommendations', 'ship_id'],
        }

        # Prepare keyword tokens for regex fallback
        import re
        tokens = [t for t in re.findall(r"[A-Za-z0-9_]+", query) if len(t) >= 3]

        for meta in actual_collections:
            collection_name = meta['name']
            logical_type = meta['logical']
            try:
                collection = self.db[collection_name]

                # 1) Try Atlas Search if available
                collection_results: List[Dict[str, Any]] = []
                try:
                    pipeline = [
                        {
                            '$search': {
                                'index': 'default',
                                'text': {
                                    'query': query,
                                    'path': {'wildcard': '*'}
                                }
                            }
                        },
                        {'$limit': per_coll},
                        {'$addFields': {'source_collection': collection_name, 'source_id': '$_id'}},
                    ]
                    collection_results = list(collection.aggregate(pipeline))
                except Exception:
                    collection_results = []

                # 2) If none, try legacy $text
                if not collection_results:
                    try:
                        collection_results = list(
                            collection.find(
                                {'$text': {'$search': query}},
                                {'score': {'$meta': 'textScore'}}
                            ).sort([('score', {'$meta': 'textScore'})]).limit(per_coll)
                        )
                        for doc in collection_results:
                            doc['source_collection'] = collection_name
                            doc['source_id'] = doc.get('_id')
                    except Exception:
                        collection_results = []

                # 3) If still none, do regex fallback with tokenization
                if not collection_results:
                    fields = search_fields_map.get(logical_type, [])
                    # Build AND of token matches, each token matches any of the fields
                    and_clauses = []
                    for tok in tokens or [query]:
                        or_clauses = [{field: {'$regex': tok, '$options': 'i'}} for field in fields]
                        if or_clauses:
                            and_clauses.append({'$or': or_clauses})
                    q = {'$and': and_clauses} if and_clauses else {}
                    projection = {f: 1 for f in fields}
                    projection.update({'_id': 1})
                    collection_results = list(collection.find(q, projection).limit(per_coll))
                    for doc in collection_results:
                        doc['source_collection'] = collection_name
                        doc['source_id'] = doc.get('_id')

                # Attach logical type hint for downstream metadata if needed
                for doc in collection_results:
                    doc.setdefault('logical_type', logical_type)

                results.extend(collection_results)

            except Exception as e:
                logger.warning(f"Error querying collection {collection_name}: {e}")
                continue

        return results[:limit]
    
    def get_ship_data(self, ship_id: str) -> Dict[str, Any]:
        """Get comprehensive data for a specific ship"""
        if self.db is None:
            self.connect()
            
        ship_data = {
            'vessel_info': None,
            'events': [],
            'insights': [],
            'alerts': [],
            'behavior_analysis': []
        }
        
        try:
            # Get vessel information
            vessel_collection = self.db['vessels']
            ship_data['vessel_info'] = vessel_collection.find_one({'id': ship_id})
            
            # Get events
            events_collection = self.db['events']
            ship_data['events'] = list(events_collection.find({'vessel_id': ship_id}).limit(20))
            
            # Get insights
            insights_collection = self.db['vessel_insights']
            ship_data['insights'] = list(insights_collection.find({'vessel_id': ship_id}).limit(10))
            
            # Get alerts
            alerts_collection = self.db['ship_alerts']
            ship_data['alerts'] = list(alerts_collection.find({'ship_id': ship_id}).limit(10))
            
            # Get behavior analysis
            behavior_collection = self.db['ship_behavior_analysis']
            ship_data['behavior_analysis'] = list(behavior_collection.find({'ship_id': ship_id}).limit(10))
            
        except Exception as e:
            logger.error(f"Error getting ship data for {ship_id}: {e}")
        
        return ship_data
    
    def get_recent_alerts(self, hours: int = 24, limit: int = 20) -> List[Dict[str, Any]]:
        """Get recent alerts from the database"""
        if self.db is None:
            self.connect()
            
        try:
            from datetime import datetime, timedelta
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            
            alerts_collection = self.db['ship_alerts']
            alerts = list(alerts_collection.find({
                'timestamp': {'$gte': cutoff_time.isoformat()}
            }).sort('timestamp', -1).limit(limit))
            
            return alerts
        except Exception as e:
            logger.error(f"Error getting recent alerts: {e}")
            return []
    
    def get_vessel_types(self) -> List[str]:
        """Get all vessel types in the database"""
        if not self.db:
            self.connect()
            
        try:
            # Prefer ships/vessels collection that exists
            coll_name = 'vessels'
            for cand in ['vessels', 'ships', 'vessel', 'gfw_ships']:
                if cand in self.db.list_collection_names():
                    coll_name = cand
                    break
            vessels_collection = self.db[coll_name]
            vessel_types = vessels_collection.distinct('type')
            return [vt for vt in vessel_types if vt]
        except Exception as e:
            logger.error(f"Error getting vessel types: {e}")
            return []
    
    def close(self):
        """Close the MongoDB connection"""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")

# Global instance
mongodb_connection = MongoDBConnection()
