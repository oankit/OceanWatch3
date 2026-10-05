import { createClient, RedisClientType } from 'redis'

let client: RedisClientType | null = null
let connectPromise: Promise<void> | null = null

// Redis is an optional cache. Without REDIS_URL, deployments skip caching entirely;
// local dev keeps using the Redis started by `npm run redis:start`.
function getRedisUrl(): string | null {
  if (process.env.REDIS_URL) return process.env.REDIS_URL
  return process.env.NODE_ENV === 'development' ? 'redis://127.0.0.1:6379' : null
}

async function ensureConnected(): Promise<RedisClientType> {
  const url = getRedisUrl()
  if (!url) {
    throw new Error('Redis not configured (REDIS_URL not set)')
  }
  if (client && client.isOpen) return client
  if (!client) {
    client = createClient({
      url,
      socket: {
        reconnectStrategy(retries: number) {
          if (retries > 10) return false
          return Math.min(retries * 100, 3000)
        },
      },
    })

    client.on('error', (err: unknown) => {
      // Surface connection errors in server logs
      console.error('Redis Client Error:', err)
    })
  }

  if (!connectPromise) {
    const p = client.connect()
    connectPromise = (p as unknown as Promise<void>).catch((err) => {
      connectPromise = null
      throw err
    })
  }
  await connectPromise
  return client!
}

export const cacheKeys = {
  ships: (q: string | undefined, limit: number, offset: number) =>
    `OceanWatch:api:ships:q=${q || ''}:l=${limit}:o=${offset}`,
  shipPositions: () => `OceanWatch:api:ship-positions`,
  allVessels: () => `OceanWatch:api:all-vessels`,
  riskZones: () => `OceanWatch:api:risk-zones`,
}

export async function cacheGet<T = unknown>(key: string): Promise<T | null> {
  if (!getRedisUrl()) return null
  try {
    const c = await ensureConnected()
    const raw = await c.get(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    console.error('Redis not configured or unreachable')
    return null
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!getRedisUrl()) return
  try {
    const c = await ensureConnected()
    await c.set(key, JSON.stringify(value), { EX: ttlSeconds })
  } catch {
    console.error('Redis not configured or unreachable')
  }
}

// Background refresh caching - returns stale data immediately, refreshes in background
export async function cacheGetWithBackgroundRefresh<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number,
  staleSeconds: number = ttlSeconds / 2
): Promise<T> {
  if (!getRedisUrl()) return await fetcher()
  try {
    const c = await ensureConnected()
    
    // Try to get cached data
    const cached = await cacheGet<T>(key)
    
    // Get TTL to determine if data is stale
    const ttl = await c.ttl(key)
    const isStale = ttl > 0 && ttl < (ttlSeconds - staleSeconds)
    
    if (cached) {
      // If data is stale, refresh in background but return cached data immediately
      if (isStale) {
        // Fire and forget background refresh
        fetcher().then(freshData => {
          cacheSet(key, freshData, ttlSeconds).catch(() => {
            // Ignore cache write errors in background
          })
        }).catch(() => {
          // Ignore fetch errors in background
        })
      }
      
      return cached
    }
    
    // No cached data, fetch fresh data
    const freshData = await fetcher()
    
    // Cache the fresh data
    await cacheSet(key, freshData, ttlSeconds)
    
    return freshData
  } catch (error) {
    // If caching fails completely, just fetch fresh data
    console.error('Redis error, falling back to direct fetch:', error)
    return await fetcher()
  }
} 