import { MongoClient, Db } from 'mongodb'
import { cacheGetWithBackgroundRefresh, cacheKeys } from './redis'

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

export interface CachedVessel {
  _id: any
  vessel_id: string
  name?: string
  lat?: number
  lon?: number
  bearing?: number
  noEvents?: boolean
  aisOff_count?: number
  eventsInNoTakeMpas_count?: number
  eventsInRfmoWithoutKnownAuthorization_count?: number
  totalTimesListed_count?: number
  [key: string]: any
}

// Fetch all vessels with smart caching and background refresh
export async function getCachedVessels(): Promise<CachedVessel[]> {
  const cacheKey = cacheKeys.allVessels()
  const ttlSeconds = 300000 // 5 minutes
  const staleSeconds = 150000 // Refresh in background after 2.5 minutes
  
  return await cacheGetWithBackgroundRefresh(
    cacheKey,
    async () => {
      const db = await getDb()
      const shipsCol = db.collection('vessel')
      
      // Fetch all vessels that have events and position data
      const vessels = await shipsCol
        .find({ noEvents: { $ne: true } })
        .toArray()
      
      return vessels as CachedVessel[]
    },
    ttlSeconds,
    staleSeconds
  )
}

// Get vessels filtered for ship positions (already have lat/lon/bearing)
export async function getVesselsForPositions(): Promise<CachedVessel[]> {
  const allVessels = await getCachedVessels()
  return allVessels.filter(vessel => 
    typeof vessel.lat === 'number' && 
    typeof vessel.lon === 'number'
  )
}

// Get vessels filtered for risk zones (have lat/lon and suspicious activity)
export async function getVesselsForRiskZones(): Promise<CachedVessel[]> {
  const allVessels = await getCachedVessels()
  return allVessels.filter(vessel => 
    typeof vessel.lat === 'number' && 
    typeof vessel.lon === 'number' &&
    ((vessel.aisOff_count || 0) + 
     (vessel.eventsInNoTakeMpas_count || 0) + 
     (vessel.eventsInRfmoWithoutKnownAuthorization_count || 0)) > 0
  )
} 