import type { NextApiRequest, NextApiResponse } from 'next'
import { getVesselsForRiskZones, CachedVessel } from '@/lib/vessel-cache'
import { cacheGetWithBackgroundRefresh, cacheKeys } from '@/lib/redis'

export interface RiskHeatPoint {
  lat: number
  lon: number
  riskScore: number
  vesselCount: number
}

export type GetRiskZonesResponse = { 
  heatPoints: RiskHeatPoint[]
  generatedAt: string
}

// Create heat map points from vessel data
function createHeatMapPoints(vessels: CachedVessel[]): RiskHeatPoint[] {
  if (vessels.length === 0) {
    return []
  }

  const heatPoints: RiskHeatPoint[] = []

  // Create points directly from vessel positions with their risk scores
  vessels.forEach(vessel => {
    const lat = vessel.lat
    const lon = vessel.lon
    
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return
    }

    const aisOff = vessel.aisOff_count || 0
    const noTakeMpas = vessel.eventsInNoTakeMpas_count || 0
    const noAuth = vessel.eventsInRfmoWithoutKnownAuthorization_count || 0
    const riskScore = aisOff + noTakeMpas + noAuth

    if (riskScore > 0) {
      heatPoints.push({
        lat: lat!,  // Use non-null assertion since we checked Number.isFinite above
        lon: lon!,  // Use non-null assertion since we checked Number.isFinite above
        riskScore,
        vesselCount: 1
      })
    }
  })

  return heatPoints
}

// Cached risk zones generation function
async function generateRiskZones(): Promise<GetRiskZonesResponse> {
  const vessels = await getVesselsForRiskZones()
  const heatPoints = createHeatMapPoints(vessels)

  return {
    heatPoints,
    generatedAt: new Date().toISOString()
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetRiskZonesResponse | { error: string }>
) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      return res.status(405).json({ error: 'Method Not Allowed' })
    }

    // Use cached risk zones with background refresh
    const cacheKey = cacheKeys.riskZones()
    const ttlSeconds = 300 // 5 minutes
    const staleSeconds = 150 // Refresh in background after 2.5 minutes
    
    const response = await cacheGetWithBackgroundRefresh(
      cacheKey,
      generateRiskZones,
      ttlSeconds,
      staleSeconds
    )

    return res.status(200).json(response)
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Internal Server Error' })
  }
}