import fs from 'fs';
import path from 'path';

const AUTH_CACHE_FILE = path.join(process.cwd(), 'e2e', '.auth-token.json');
const ENV_FILE = path.join(process.cwd(), '.env.e2e');

function loadEnvFile(filePath: string): Record<string, string> {
  const vars: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return vars;
  for (const line of fs.readFileSync(filePath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    vars[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return vars;
}

async function globalSetup() {
  const env = loadEnvFile(ENV_FILE);
  const phone = env['E2E_TEST_PHONE'];
  const password = env['E2E_TEST_PASSWORD'];
  const apiBase = env['PLAYWRIGHT_API_BASE_URL'] || 'http://localhost:8080';
  // Enterprise admin auth
  try {
    const resp = await fetch(`${apiBase}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    });
    const rawData = await resp.json() as { code: string | number; data?: { accessToken: string; refreshToken: string; user: unknown } };
    const successCodes = ['0000', '0', 0, '200', 200];
    const code = rawData.code;
    if (successCodes.includes(code as string | number) && rawData.data?.accessToken) {
      const authState = {
        state: {
          accessToken: rawData.data.accessToken,
          refreshToken: rawData.data.refreshToken,
          user: rawData.data.user,
          isAuthenticated: true,
        },
        version: 0,
      };
      fs.writeFileSync(AUTH_CACHE_FILE, JSON.stringify(authState));
      console.log('[globalSetup] Enterprise auth token cached at:', AUTH_CACHE_FILE);
    } else {
      console.warn('[globalSetup] Enterprise login failed:', rawData);
    }
  } catch (e) {
    console.warn('[globalSetup] Failed to pre-fetch enterprise auth:', e);
  }

  // Persist test credentials for helpers.ts (runs in Playwright worker, not Node.js globalSetup)
  const credsCacheFile = path.join(process.cwd(), 'e2e', '.test-creds.json');
  fs.writeFileSync(credsCacheFile, JSON.stringify({ phone, password }));
  console.log('[globalSetup] Test credentials cached at:', credsCacheFile);
}

export default globalSetup;
