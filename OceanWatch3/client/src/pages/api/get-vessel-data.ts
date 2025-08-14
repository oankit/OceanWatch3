import type { NextApiRequest, NextApiResponse } from 'next'
import { MongoClient, Db } from 'mongodb'
// import { cacheGet, cacheSet } from '@/lib/redis'
import { VesselData } from '@/services/shipService'

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

export type GetVesselDataResponse = { id: string; data?: VesselData }

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetVesselDataResponse | { error: string }>
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
    // const cacheKey = `OceanWatch:api:vessel-data:${id}`
    // const cached = await cacheGet<GetVesselDataResponse>(cacheKey)
    // if (cached) return res.status(200).json(cached)

    const db = await getDb()
    const shipsCol = db.collection('vessel') // Changed from 'gfw_ships' to 'vessel'
    
    // Get vessel data directly from the vessel collection
    const shipDoc = await shipsCol.findOne({ vessel_id: id })

    if (shipDoc) {
        // Use the vessel document as the vessel data
        const payload: GetVesselDataResponse = { id, data: shipDoc as unknown as VesselData }
        
        // Cache the result - commented out
        // await cacheSet(cacheKey, payload, 180)
        
        return res.status(200).json(payload)
    } else {
        return res.status(200).json({ id, data: undefined })
    }
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Internal Server Error' })
  }
}
