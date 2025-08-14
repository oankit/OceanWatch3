import { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient } from 'mongodb';

const MONGODB_URI = "mongodb+srv://johnliu:pword@OceanWatch-main.2w2qohn.mongodb.net/main";
const DB_NAME = "main";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    const alertsCollection = db.collection('ship_alerts');

    const { hours = 24 } = req.query;

    // Time filter
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - parseInt(hours as string));

    // Get total count
    const total = await alertsCollection.countDocuments({
      timestamp: { $gte: hoursAgo }
    });

    // Get counts by severity
    const severityPipeline = [
      { $match: { timestamp: { $gte: hoursAgo } } },
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ];
    const severityResults = await alertsCollection.aggregate(severityPipeline).toArray();
    
    const by_severity = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };
    
    severityResults.forEach(result => {
      if (result._id in by_severity) {
        by_severity[result._id as keyof typeof by_severity] = result.count;
      }
    });

    // Get counts by type
    const typePipeline = [
      { $match: { timestamp: { $gte: hoursAgo } } },
      { $group: { _id: '$alert_type', count: { $sum: 1 } } }
    ];
    const typeResults = await alertsCollection.aggregate(typePipeline).toArray();
    
    const by_type = {
      loitering: 0,
      port_entry: 0,
      port_exit: 0,
      suspicious_route: 0,
      speed_anomaly: 0,
      encounter: 0,
      gap_in_tracking: 0
    };
    
    typeResults.forEach(result => {
      if (result._id in by_type) {
        by_type[result._id as keyof typeof by_type] = result.count;
      }
    });

    // Get recent alerts
    const recent_alerts = await alertsCollection
      .find({ timestamp: { $gte: hoursAgo } })
      .sort({ timestamp: -1 })
      .limit(5)
      .toArray();

    await client.close();

    res.status(200).json({
      data: {
        total,
        by_severity,
        by_type,
        recent_alerts
      }
    });

  } catch (error) {
    console.error('Error fetching alert stats:', error);
    res.status(500).json({ error: 'Failed to fetch alert statistics' });
  }
}
