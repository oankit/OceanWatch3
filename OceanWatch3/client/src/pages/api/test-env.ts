import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Load environment variables from root .env file
    const rootDir = path.join(process.cwd(), '..');
    const envPath = path.join(rootDir, '.env');
    const envExists = fs.existsSync(envPath);
    
    if (envExists) {
      dotenv.config({ path: envPath });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    const mongodbUri = process.env.MONGODB_URI;

    return res.status(200).json({
      success: true,
      envFileExists: envExists,
      envFilePath: envPath,
      hasOpenAIKey: !!openaiKey,
      openaiKeyLength: openaiKey ? openaiKey.length : 0,
      hasMongoDBUri: !!mongodbUri,
      allEnvKeys: Object.keys(process.env).filter(key => 
        key.includes('OPENAI') || key.includes('MONGODB') || key.includes('API')
      )
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
