import type { NextApiRequest, NextApiResponse } from 'next'
import { MongoClient, Db } from 'mongodb'
// import { cacheGet, cacheSet } from '@/lib/redis'

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

async function getDb(): Promise<Db> {
  if (cachedDb && cachedClient) return cachedDb

  const uri = process.env.MONGODB_URI || 'mongodb+srv://johnliu:pword@OceanWatch-main.2w2qohn.mongodb.net/main'
  const dbName = process.env.MONGODB_DB || 'main'

  const client = await (cachedClient?.connect?.() ? Promise.resolve(cachedClient) : new MongoClient(uri).connect())
  cachedClient = client
  cachedDb = client.db(dbName)
  return cachedDb
}

export interface TrackPoint { 
  lat: number; 
  lon: number; 
  t?: string; // ISO timestamp from event_end or timestamp
  type?: string; // event_type from the event
}
export type GetShipTrackResponse = { id: string; points: TrackPoint[] }

function isTrackPoint(v: any): v is TrackPoint {
  return (
    v &&
    typeof v.lat === 'number' &&
    typeof v.lon === 'number' &&
    // type is optional, but if present, must be a string
    (v.type === undefined || typeof v.type === 'string') &&
    // t is optional, but if present, must be a string
    (v.t === undefined || typeof v.t === 'string')
  )
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetShipTrackResponse | { error: string }>
) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      return res.status(405).json({ error: 'Method Not Allowed' })
    }

    const id = String(req.query.id || '').trim()
    if (!id) {
      return res.status(400).json({ error: 'Missing id' })
    }

    // Cache lookup - commented out
    // const cacheKey = `OceanWatch:api:ship-track:${id}`
    // const cached = await cacheGet<GetShipTrackResponse>(cacheKey)
    // if (cached) return res.status(200).json(cached)

    const db = await getDb()
    const shipsCol = db.collection('vessel') // Changed from 'gfw_ships' to 'vessel'
    const eventsCol = db.collection('events') // Changed from 'gfw_ship_events' to 'events'

    // First check if vessel exists
    const shipDoc = await shipsCol.findOne({ vessel_id: id }, { projection: { vessel_id: 1 } })
    if (!shipDoc) {
      return res.status(404).json({ error: 'Vessel not found' })
    }

    // Get all events for this vessel from the events collection
    const sourceEvents = await eventsCol
      .find({ vessel_id: id })
      .project({ latitude: 1, longitude: 1, timestamp: 1, event_end: 1, event_type: 1, _id: 0 })
      .toArray()

    const withNulls: Array<TrackPoint | null> = (sourceEvents as any[]).map((e) => {
      // Events have latitude/longitude directly, not in a position object
      const lat = typeof e?.latitude === 'number' ? e.latitude : Number(e?.latitude)
      const lon = typeof e?.longitude === 'number' ? e.longitude : Number(e?.longitude)
      
      // Handle MongoDB date objects - they come as Date objects in Node.js
      let t: string | undefined = undefined
      if (e?.event_end) {
        t = e.event_end instanceof Date ? e.event_end.toISOString() : String(e.event_end)
      } else if (e?.timestamp) {
        t = e.timestamp instanceof Date ? e.timestamp.toISOString() : String(e.timestamp)
      }
      
      const type = typeof e?.event_type === 'string' ? e.event_type : undefined
      if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon, t, type }
      return null
    })

    const points: TrackPoint[] = withNulls
      .filter(isTrackPoint)
      .sort((a, b) => {
        const ta = a.t ? Date.parse(a.t) : 0
        const tb = b.t ? Date.parse(b.t) : 0
        return ta - tb
      })

    const payload: GetShipTrackResponse = { id, points }
    
    // Cache the result - commented out
    // await cacheSet(cacheKey, payload, 180)
    
    return res.status(200).json(payload)
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Internal Server Error' })
  }
}
