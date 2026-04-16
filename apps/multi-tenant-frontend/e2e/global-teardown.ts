import fs from 'fs';
import path from 'path';

const PLATFORM_AUTH_CACHE_FILE = path.join(process.cwd(), 'e2e', '.platform-auth-token.json');

async function globalTeardown() {
  try {
    fs.unlinkSync(PLATFORM_AUTH_CACHE_FILE);
    console.log('[globalTeardown] Auth cache file removed');
  } catch {
    // ignore if file doesn't exist
  }
}

export default globalTeardown;
