import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Prioritize .env.local_basic for local basic development
const potentialPaths = [
  path.resolve(process.cwd(), '.env.local_basic'),
  path.resolve(process.cwd(), '../../.env.local_basic'),
  path.resolve(process.cwd(), '../.env.local_basic'),
];

let localEnvFound = false;
for (const envPath of potentialPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    localEnvFound = true;
    break;
  }
}

// Fall back to standard .env if no local basic env file was found
if (!localEnvFound) {
  dotenv.config();
}

export {};
