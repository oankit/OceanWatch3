import { NextApiRequest, NextApiResponse } from 'next';

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
    const procRunning = !!(global.ragServerProcess && !global.ragServerProcess.killed);

    // Always probe /health to reflect actual server state even if started externally
    let healthOk = false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const response = await fetch('http://localhost:8001/health', {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      healthOk = response.ok;
    } catch (error) {
      healthOk = false;
    }

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
