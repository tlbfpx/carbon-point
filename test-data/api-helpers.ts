import { Page, request } from '@playwright/test';
import { TEST_TENANT, TEST_USERS } from './test-users';

const API_BASE = 'http://localhost:8080';

export class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  async loginAsPlatformAdmin(): Promise<void> {
    await this.login(TEST_USERS.platformAdmin.phone, TEST_USERS.platformAdmin.password);
  }

  async loginAsEnterpriseAdmin(): Promise<void> {
    await this.login(TEST_USERS.enterpriseAdmin.phone, TEST_USERS.enterpriseAdmin.password);
  }

  async loginAsRegularUser(): Promise<void> {
    await this.login(TEST_USERS.regularUser.phone, TEST_USERS.regularUser.password);
  }

  async login(phone: string, password: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    });

    if (response.ok) {
      const data = await response.json();
      this.accessToken = data.data?.access_token;
      this.refreshToken = data.data?.refresh_token;
    }
  }

  async get(endpoint: string): Promise<any> {
    return this.request('GET', endpoint);
  }

  async post(endpoint: string, body?: any): Promise<any> {
    return this.request('POST', endpoint, body);
  }

  async put(endpoint: string, body?: any): Promise<any> {
    return this.request('PUT', endpoint, body);
  }

  async delete(endpoint: string): Promise<any> {
    return this.request('DELETE', endpoint);
  }

  private async request(method: string, endpoint: string, body?: any): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    return {
      status: response.status,
      ok: response.ok,
      data: await response.json().catch(() => ({})),
    };
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
  }
}

// Global API client instance
export const apiClient = new ApiClient();

// Helper to setup authenticated page
export async function authenticatedPage(page: Page, userType: 'platformAdmin' | 'enterpriseAdmin' | 'regularUser'): Promise<void> {
  const client = new ApiClient();

  switch (userType) {
    case 'platformAdmin':
      await client.loginAsPlatformAdmin();
      break;
    case 'enterpriseAdmin':
      await client.loginAsEnterpriseAdmin();
      break;
    case 'regularUser':
      await client.loginAsRegularUser();
      break;
  }

  const token = client.getAccessToken();
  if (token) {
    await page.evaluate((t) => {
      localStorage.setItem('access_token', t);
    }, token);
  }
}

// Helper to create test tenant via API
export async function createTestTenant(client: ApiClient): Promise<number> {
  const response = await client.post('/api/tenants', TEST_TENANT);
  return response.data?.id;
}

// Helper to create test user via API
export async function createTestUser(client: ApiClient, tenantId: number, userData: any): Promise<number> {
  const response = await client.post(`/api/tenants/${tenantId}/users`, {
    ...userData,
    tenantId,
  });
  return response.data?.id;
}

// Report generator
export function generateTestReport(results: any[]): string {
  const timestamp = new Date().toISOString();
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  let report = `# 测试报告 - ${timestamp}\n\n`;
  report += `## 汇总\n`;
  report += `- 总测试数: ${results.length}\n`;
  report += `- 通过: ${passed}\n`;
  report += `- 失败: ${failed}\n`;
  report += `- 跳过: ${skipped}\n\n`;

  if (failed > 0) {
    report += `## 失败用例\n\n`;
    results.filter(r => r.status === 'failed').forEach(r => {
      report += `### ${r.title}\n`;
      report += `- 文件: ${r.location}\n`;
      report += `- 错误: ${r.error}\n`;
      report += `- 截图: ${r.screenshot || '无'}\n\n`;
    });
  }

  return report;
}
