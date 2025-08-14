#!/usr/bin/env node
const Redis = require('ioredis')

async function run() {
  const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379'
  const redis = new Redis(url)
  const prefixes = ['OceanWatch:api:ships:', 'OceanWatch:api:ship-positions']

  let deleted = 0
  for (const prefix of prefixes) {
    let cursor = '0'
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 200)
      cursor = next
      if (keys && keys.length) {
        const res = await redis.del(keys)
        deleted += res
      }
    } while (cursor !== '0')
  }

  await redis.quit()
  console.log(`Cleared ${deleted} cached keys`)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
}) 