const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from parent directory .env file
const parentEnvPath = path.join(__dirname, '..', '.env');
if (require('fs').existsSync(parentEnvPath)) {
  dotenv.config({ path: parentEnvPath });
  console.log('Loaded environment variables from parent .env file');
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    MONGODB_URI: process.env.MONGODB_URI,
  },
}

module.exports = nextConfig
