import type { NextApiRequest, NextApiResponse } from 'next'
import { WindBorneClient } from '@/lib/windborne'
import { getVesselsForPositions, CachedVessel } from '@/lib/vessel-cache'
// import { cacheGet, cacheSet, cacheKeys } from '@/lib/redis'

export interface ShipPosition {
  id: string
  name?: string
  lat: number
  lon: number
  bearing: number
  alertLevel: 'blue' | 'yellow' | 'orange' | 'red'
  // Individual counts
  aisOffCount: number
  eventsInNoTakeMpasCount: number
  eventsInRfmoWithoutKnownAuthorizationCount: number
  totalTimesListedCount: number
  // Total suspicious activity for alert calculation
  totalSuspiciousActivity: number
  // Full vessel data
  vessel: any
}

function parseDateSafe(value: any): number {
  if (!value) return 0
  const s = typeof value === 'string' ? value : String(value)
  const ms = Date.parse(s)
  return isNaN(ms) ? 0 : ms
}

function getAlertLevel(totalSuspiciousActivity: number): 'blue' | 'yellow' | 'orange' | 'red' {
  if (totalSuspiciousActivity >= 5) return 'red'
  if (totalSuspiciousActivity >= 3) return 'orange' 
  if (totalSuspiciousActivity >= 1) return 'yellow'
  return 'blue'
}

function getLastTwoEventsFromEmbedded(events: any[]): any[] {
  if (!Array.isArray(events) || events.length === 0) return []
  const withTs = events
    .map((e) => ({ e, ts: Math.max(parseDateSafe((e as any)?.end), parseDateSafe((e as any)?.start)) }))
    .filter((x) => Number.isFinite(x.ts))
    .sort((a, b) => b.ts - a.ts)
  return withTs.slice(0, 2).map((x) => x.e)
}

function toRad(deg: number): number { return (deg * Math.PI) / 180 }
function toDeg(rad: number): number { return (rad * 180) / Math.PI }
function normalizeBearing(deg: number): number { return (deg + 360) % 360 }

function computeBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = toRad(lat1)
  const φ2 = toRad(lat2)
  const Δλ = toRad(lon2 - lon1)
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  const θ = Math.atan2(y, x)
  return normalizeBearing(toDeg(θ))
}

export type GetShipPositionsResponse = { data: ShipPosition[] }

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetShipPositionsResponse | { error: string }>
) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      return res.status(405).json({ error: 'Method Not Allowed' })
    }

    // Use cached vessels with background refresh
    const ships = await getVesselsForPositions()

    const results: ShipPosition[] = []

    for (const ship of ships as CachedVessel[]) {
      const vesselId: string | undefined = ship?.vessel_id
      const name: string | undefined = ship?.name
      const lat: number | undefined = ship?.lat
      const lon: number | undefined = ship?.lon
      const bearing: number | undefined = ship?.bearing
      
      // Extract all suspicious activity counts
      const aisOffCount: number = typeof ship?.aisOff_count === 'number' ? ship.aisOff_count : 0
      const eventsInNoTakeMpasCount: number = typeof ship?.eventsInNoTakeMpas_count === 'number' ? ship.eventsInNoTakeMpas_count : 0
      const eventsInRfmoWithoutKnownAuthorizationCount: number = typeof ship?.eventsInRfmoWithoutKnownAuthorization_count === 'number' ? ship.eventsInRfmoWithoutKnownAuthorization_count : 0
      const totalTimesListedCount: number = typeof ship?.totalTimesListed_count === 'number' ? ship.totalTimesListed_count : 0
      
      // Calculate total suspicious activity
      const totalSuspiciousActivity = aisOffCount + eventsInNoTakeMpasCount + eventsInRfmoWithoutKnownAuthorizationCount
      
      if (!vesselId) continue
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue

      const alertLevel = getAlertLevel(totalSuspiciousActivity)

      results.push({ 
        id: vesselId, 
        name, 
        lat: lat!, // Use non-null assertion since we checked isFinite above
        lon: lon!, // Use non-null assertion since we checked isFinite above
        bearing: Number.isFinite(bearing) ? bearing! : 0,
        alertLevel,
        aisOffCount,
        eventsInNoTakeMpasCount,
        eventsInRfmoWithoutKnownAuthorizationCount,
        totalTimesListedCount,
        totalSuspiciousActivity,
        vessel: ship // Send the whole vessel document
      })
    }

    const payload: GetShipPositionsResponse = { data: results }

    return res.status(200).json(payload)
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Internal Server Error' })
  }
} 