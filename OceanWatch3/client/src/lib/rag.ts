// Where the Python RAG chat server lives. Locally it is spawned on port 8001 by
// /api/start-rag-chatbot; a deployment has to host it separately and point
// NEXT_PUBLIC_RAG_SERVER_URL at it. Returns null when chat is unavailable.
export function getRagServerUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_RAG_SERVER_URL
  if (configured) return configured.replace(/\/+$/, '')
  return process.env.VERCEL ? null : 'http://localhost:8001'
}

export async function isRagServerHealthy(baseUrl: string, timeoutMs = 1500): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    const response = await fetch(`${baseUrl}/health`, { method: 'GET', signal: controller.signal })
    clearTimeout(timeoutId)
    return response.ok
  } catch {
    return false
  }
}
