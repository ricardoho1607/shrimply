/* eslint-disable @typescript-eslint/no-require-imports */
const { loadEnvConfig } = require('@next/env');

if (process.env.SHRIMPLY_SKIP_DOTENV !== '1') {
  loadEnvConfig(process.cwd());
}

const requiredPublicEnv = ['NEXT_PUBLIC_GOOGLE_PLACES_API_KEY'];
const missing = requiredPublicEnv.filter(name => !process.env[name]?.trim());

if (missing.length > 0) {
  console.error(`Missing required web environment variable: ${missing.join(', ')}`);
  process.exit(1);
}
