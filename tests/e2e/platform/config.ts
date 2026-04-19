export const BASE_URL = process.env.PLAYWRIGHT_PLATFORM_BASE_URL || 'http://localhost:3001';
export const API_BASE = process.env.PLAYWRIGHT_API_BASE_URL || 'http://localhost:8080';

/** Platform admin credentials - must match an actual admin user in the database */
export const PLATFORM_ADMIN = {
  username: 'admin',
  password: 'admin123',
};

export const TEST_USERS = {
  platformAdmin: PLATFORM_ADMIN,
};
