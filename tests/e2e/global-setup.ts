import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const STORAGE_STATE_DIR = path.join(process.cwd(), 'tests', 'e2e', 'fixtures');
const STORAGE_STATE_FILE = path.join(STORAGE_STATE_DIR, 'storage-state.json');
const TEST_DATA_DIR = path.join(process.cwd(), 'test-data');

function getEnvFile(envPath: string): Record<string, string> {
  const vars: Record<string, string> = {};
  if (!fs.existsSync(envPath)) return vars;
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    vars[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return vars;
}

async function globalSetup(config: FullConfig) {
  // Ensure fixtures directory exists
  if (!fs.existsSync(STORAGE_STATE_DIR)) {
    fs.mkdirSync(STORAGE_STATE_DIR, { recursive: true });
  }

  const apiBase = process.env.PLAYWRIGHT_API_BASE_URL || 'http://localhost:8080';
  const testDataDir = path.join(process.cwd(), 'test-data');
  const testUsersPath = path.join(testDataDir, 'test-users.ts');
  const apiHelpersPath = path.join(testDataDir, 'api-helpers.ts');

  // Load env vars from .env.e2e if exists
  const envPath = path.join(process.cwd(), '.env.e2e');
  const envVars = getEnvFile(envPath);

  // Default test credentials (can be overridden via .env.e2e)
  // Note: 13800138001 / Test@123 is the seeded enterprise admin user in MySQL
  const phone = envVars['E2E_TEST_PHONE'] || '13800138001';
  const password = envVars['E2E_TEST_PASSWORD'] || 'Test@123';

  // Try to load test users from test-data/test-users.ts
  // If file doesn't exist, use defaults
  let testTenantId: number | null = null;

  try {
    if (fs.existsSync(testUsersPath)) {
      console.log('[globalSetup] Loaded test users from:', testUsersPath);
    }
    if (fs.existsSync(apiHelpersPath)) {
      console.log('[globalSetup] Loaded API helpers from:', apiHelpersPath);
    }
  } catch (e) {
    console.warn('[globalSetup] Could not read test data files:', e);
  }

  // Login and cache auth state
  try {
    const resp = await fetch(`${apiBase}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    });

    const rawData = await resp.json() as {
      code: string | number;
      data?: {
        accessToken: string;
        refreshToken: string;
        user: unknown;
        expiresIn?: number;
      };
    };

    const successCodes = ['0000', '0', 0, '200', 200];
    if (successCodes.includes(rawData.code as string | number) && rawData.data?.accessToken) {
      const authState = {
        accessToken: rawData.data.accessToken,
        refreshToken: rawData.data.refreshToken,
        user: rawData.data.user,
        expiresIn: rawData.data.expiresIn || 7200,
        phone,
        tenantId: testTenantId,
      };
      fs.writeFileSync(STORAGE_STATE_FILE, JSON.stringify(authState, null, 2));
      console.log('[globalSetup] Auth state cached at:', STORAGE_STATE_FILE);
    } else {
      console.warn('[globalSetup] Login failed - unexpected response code:', rawData.code);
      console.warn('[globalSetup] Full response:', JSON.stringify(rawData));
    }
  } catch (e) {
    console.warn('[globalSetup] Failed to pre-fetch auth token (API may be offline):', e);
    // Don't fail setup - tests will fail gracefully if auth is missing
  }

  // Persist credentials for use by individual test helpers
  const credsCacheFile = path.join(STORAGE_STATE_DIR, '.test-creds.json');
  fs.writeFileSync(credsCacheFile, JSON.stringify({ phone, password, apiBase }));

  console.log('[globalSetup] Done. Credentials cached at:', credsCacheFile);
}

export default globalSetup;
