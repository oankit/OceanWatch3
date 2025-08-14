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

    // Parse query parameters
    const {
      hours = 24,
      severity,
      alert_type,
      ship_id,
      limit = 50,
      offset = 0
    } = req.query;

    // Build filter
    const filter: any = {};
    
    // Time filter
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - parseInt(hours as string));
    filter.timestamp = { $gte: hoursAgo };

    // Severity filter
    if (severity) {
      const severities = (severity as string).split(',');
      filter.severity = { $in: severities };
    }

    // Alert type filter
    if (alert_type) {
      const types = (alert_type as string).split(',');
      filter.alert_type = { $in: types };
    }

    // Ship ID filter
    if (ship_id) {
      filter.ship_id = ship_id;
    }

    // Execute query
    const alerts = await alertsCollection
      .find(filter)
      .sort({ timestamp: -1 })
      .skip(parseInt(offset as string))
      .limit(parseInt(limit as string))
      .toArray();

    // Get total count
    const total = await alertsCollection.countDocuments(filter);

    await client.close();

    res.status(200).json({
      data: alerts,
      total,
      offset: parseInt(offset as string),
      limit: parseInt(limit as string)
    });

  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
}
