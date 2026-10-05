import { NextApiRequest, NextApiResponse } from 'next';
import { getRagServerUrl, isRagServerHealthy } from '@/lib/rag';

// Global variable to track server process (shared with start-rag-chatbot.ts)
declare global {
  var ragServerProcess: any;
  var serverStartTime: number | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const ragUrl = getRagServerUrl();
    if (!ragUrl) {
      return res.status(200).json({
        isRunning: false,
        isStarting: false,
        port: 8001,
        error: 'Chat assistant is not available in this deployment'
      });
    }

    const procRunning = !!(global.ragServerProcess && !global.ragServerProcess.killed);

    // Always probe /health to reflect actual server state even if started externally
    const healthOk = await isRagServerHealthy(ragUrl);

    return res.status(200).json({
      isRunning: healthOk,
      isStarting: procRunning && !healthOk,
      port: 8001,
      startupTime: global.serverStartTime || undefined,
      error: procRunning && !healthOk ? 'Server starting up...' : undefined
    });

  } catch (error) {
    return res.status(500).json({
      isRunning: false,
      isStarting: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      port: 8001
    });
  }
}
