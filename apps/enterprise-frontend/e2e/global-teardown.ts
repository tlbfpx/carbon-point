import fs from 'fs';
import path from 'path';

const AUTH_CACHE_FILE = path.join(process.cwd(), 'e2e', '.auth-token.json');

async function globalTeardown() {
  try {
    fs.unlinkSync(AUTH_CACHE_FILE);
    console.log('[globalTeardown] Auth cache file removed');
  } catch {
    // ignore if file doesn't exist
  }
}

export default globalTeardown;
