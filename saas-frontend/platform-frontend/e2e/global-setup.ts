import fs from 'fs';
import path from 'path';

const PLATFORM_AUTH_CACHE_FILE = path.join(process.cwd(), 'e2e', '.platform-auth-token.json');

async function globalSetup() {
  // Platform admin auth (uses /platform/auth/login)
  try {
    const resp = await fetch('http://localhost:8088/platform/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    const data = await resp.json() as { code: number; data?: { accessToken: string; refreshToken: string; admin: unknown } };
    if (data.code === 200 && data.data) {
      const authState = {
        state: {
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken,
          user: data.data.admin,
          isAuthenticated: true,
        },
        version: 0,
      };
      fs.writeFileSync(PLATFORM_AUTH_CACHE_FILE, JSON.stringify(authState));
      console.log('[globalSetup] Platform auth token cached at:', PLATFORM_AUTH_CACHE_FILE);
    } else {
      console.warn('[globalSetup] Platform login failed:', data);
    }
  } catch (e) {
    console.warn('[globalSetup] Failed to pre-fetch platform auth:', e);
  }
}

export default globalSetup;
