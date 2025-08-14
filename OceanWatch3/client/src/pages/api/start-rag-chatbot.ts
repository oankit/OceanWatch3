import { NextApiRequest, NextApiResponse } from 'next';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Global variable to track server process
declare global {
  var ragServerProcess: any;
  var serverStartTime: number | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Load environment variables from root .env file
    const rootDir = path.join(process.cwd(), '..');
    const envPath = path.join(rootDir, '.env');
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      console.log('Loaded environment variables from root .env file');
    } else {
      console.log('No .env file found in root directory');
    }

    // Check if server is already running
    if (global.ragServerProcess && !global.ragServerProcess.killed) {
      return res.status(200).json({
        success: true,
        message: 'RAG server is already running',
        port: 8001,
        pid: global.ragServerProcess.pid
      });
    }

    // Check if port 8001 is available
    const isPortAvailable = await checkPortAvailability(8001);
    if (!isPortAvailable) {
      // If something is already listening, verify if it's our server and healthy
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);
        const response = await fetch('http://localhost:8001/health', {
          method: 'GET',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (response.ok) {
          return res.status(200).json({
            success: true,
            message: 'RAG server is already running',
            port: 8001
          });
        }
      } catch (e) {
        // Not our server or not healthy; fall through to error
      }
      return res.status(400).json({
        success: false,
        message: 'Port 8001 is already in use',
        error: 'PORT_IN_USE'
      });
    }

    // Get environment variables
    const openaiApiKey = process.env.OPENAI_API_KEY;
    console.log('Environment check:', {
      hasOpenAIKey: !!openaiApiKey,
      keyLength: openaiApiKey ? openaiApiKey.length : 0,
      envKeys: Object.keys(process.env).filter(key => key.includes('OPENAI'))
    });
    
    if (!openaiApiKey) {
      return res.status(400).json({
        success: false,
        message: 'OPENAI_API_KEY environment variable is required',
        error: 'MISSING_API_KEY'
      });
    }

    // Start the RAG server
    const serverDir = path.join(process.cwd(), '..', 'server');
    const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
    
    // Check if server directory exists
    if (!fs.existsSync(serverDir)) {
      return res.status(500).json({
        success: false,
        message: 'Server directory not found',
        error: 'SERVER_DIR_NOT_FOUND'
      });
    }
    
    console.log('Starting RAG server with environment:', {
      serverDir,
      pythonPath,
      hasOpenAIKey: !!openaiApiKey,
      envKeys: Object.keys(process.env).filter(key => key.includes('OPENAI'))
    });

    global.ragServerProcess = spawn(pythonPath, [
      '-m', 'uvicorn',
      'rag_api_server:app',
      '--host', '0.0.0.0',
      '--port', '8001'
    ], {
      cwd: serverDir,
      env: {
        ...process.env,
        OPENAI_API_KEY: openaiApiKey,
        PYTHONPATH: serverDir
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    global.serverStartTime = Date.now();

    console.log(`Starting RAG server with PID: ${global.ragServerProcess.pid}`);

    // Handle process events
    global.ragServerProcess.on('error', (error: any) => {
      console.error('Failed to start RAG server:', error);
      global.ragServerProcess = null;
      global.serverStartTime = null;
    });

    global.ragServerProcess.on('exit', (code: number) => {
      console.log(`RAG server process exited with code ${code}`);
      global.ragServerProcess = null;
      global.serverStartTime = null;
    });

    // Log stdout and stderr for debugging
    global.ragServerProcess.stdout?.on('data', (data: Buffer) => {
      console.log('RAG Server stdout:', data.toString().trim());
    });

    global.ragServerProcess.stderr?.on('data', (data: Buffer) => {
      console.error('RAG Server stderr:', data.toString().trim());
    });

    // Wait a bit for server to start and check for immediate errors
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if process is still running
    if (global.ragServerProcess && !global.ragServerProcess.killed) {
      // Additional check: try to connect to the server
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch('http://localhost:8001/health', { 
          method: 'GET',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          return res.status(200).json({
            success: true,
            message: 'RAG server started successfully',
            port: 8001,
            pid: global.ragServerProcess.pid
          });
        } else {
          console.log('Server responded but not healthy:', response.status);
        }
      } catch (error) {
        console.log('Server not yet ready, but process is running:', error);
      }
      
      // If health check fails but process is running, still return success
      // (server might still be starting up)
      return res.status(200).json({
        success: true,
        message: 'RAG server process started (health check pending)',
        port: 8001,
        pid: global.ragServerProcess.pid
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to start RAG server',
        error: 'STARTUP_FAILED'
      });
    }

  } catch (error) {
    console.error('Error starting RAG server:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function checkPortAvailability(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    
    server.listen(port, () => {
      server.close();
      resolve(true);
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}
