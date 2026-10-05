import { MongoClient, Db } from 'mongodb'

// One client per server instance, shared by every API route. On serverless hosts this
// lets warm invocations reuse the connection instead of opening a new one per request;
// stashing it on `global` also survives hot reloads in dev.
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

export async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI environment variable is required')

  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri).connect().catch((err) => {
      // Let the next request retry instead of caching the failure
      global._mongoClientPromise = undefined
      throw err
    })
  }

  const client = await global._mongoClientPromise
  return client.db(process.env.MONGODB_DB || 'main')
}
