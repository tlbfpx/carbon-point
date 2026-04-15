/**
 * 数据准备脚本 - 为验收测试创建测试数据
 *
 * 运行方式:
 * npx tsx e2e/data-seeder.ts
 */

import axios from 'axios';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:8080/api';

let platformToken = '';
let enterpriseTokens: Map<string, string> = new Map();

const TEST_ACCOUNTS = {
  platformAdmin: {
    username: 'admin',
    password: 'admin123',
  },
  enterpriseAdmin: {
    phone: '13800138001',
    password: 'password123',
  },
};

async function loginPlatformAdmin(): Promise<string> {
  const res = await axios.post(`${API_BASE}/auth/platform/login`, {
    username: TEST_ACCOUNTS.platformAdmin.username,
    password: TEST_ACCOUNTS.platformAdmin.password,
  });
  return res.data.data.accessToken;
}

async function loginEnterprise(phone: string): Promise<string> {
  const res = await axios.post(`${API_BASE}/auth/enterprise/login`, {
    phone,
    password: TEST_ACCOUNTS.enterpriseAdmin.password,
  });
  return res.data.data.accessToken;
}

async function createEnterprise(index: number): Promise<{ id: string; name: string }> {
  const res = await axios.post(
    `${API_BASE}/platform/tenants`,
    {
      name: `测试企业${index}`,
      contactName: `联系人${index}`,
      contactPhone: `1380000${String(index).padStart(4, '0')}`,
      packageId: 'default-package-id',
    },
    { headers: { Authorization: `Bearer ${platformToken}` } }
  );
  return res.data.data;
}

async function createEmployee(tenantId: string, index: number, token: string): Promise<string> {
  const res = await axios.post(
    `${API_BASE}/system/users`,
    {
      tenantId,
      phone: `138${String(1000 + index).padStart(7, '0')}`,
      username: `员工${index}`,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data.data.userId;
}

async function createPointsRecord(userId: string, tenantId: string, token: string): Promise<void> {
  await axios.post(
    `${API_BASE}/points/records`,
    {
      userId,
      tenantId,
      points: Math.floor(Math.random() * 100) + 10,
      type: 'checkin',
      source: 'time_slot',
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

async function createOrder(tenantId: string, userId: string, token: string): Promise<void> {
  await axios.post(
    `${API_BASE}/mall/orders`,
    {
      tenantId,
      userId,
      productId: `product-${Math.floor(Math.random() * 3) + 1}`,
      points: Math.floor(Math.random() * 500) + 100,
      status: 'pending',
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

async function createProduct(tenantId: string, index: number, token: string): Promise<void> {
  await axios.post(
    `${API_BASE}/mall/products`,
    {
      tenantId,
      name: `测试产品${index}`,
      points: Math.floor(Math.random() * 500) + 100,
      stock: Math.floor(Math.random() * 100) + 10,
      status: 1,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

async function seed() {
  console.log('🚀 开始准备测试数据...\n');

  console.log('1. 登录平台管理员...');
  platformToken = await loginPlatformAdmin();
  console.log('   ✓ 登录成功\n');

  console.log('2. 创建5个企业...');
  const enterprises: { id: string; name: string; adminPhone: string }[] = [];
  for (let i = 1; i <= 5; i++) {
    const enterprise = await createEnterprise(i);
    const adminPhone = `1380013${String(8000 + i)}`;
    enterprises.push({ ...enterprise, adminPhone });
    console.log(`   ✓ 创建企业: ${enterprise.name}`);
  }
  console.log('');

  console.log('3. 为每个企业创建20个员工和业务数据...');
  for (const enterprise of enterprises) {
    const token = enterpriseTokens.get(enterprise.id) || await loginEnterprise(enterprise.adminPhone);
    enterpriseTokens.set(enterprise.id, token);

    for (let j = 1; j <= 20; j++) {
      const userId = await createEmployee(enterprise.id, j, token);
      for (let k = 1; k <= 10; k++) {
        await createPointsRecord(userId, enterprise.id, token);
      }
      for (let m = 1; m <= 5; m++) {
        await createOrder(enterprise.id, userId, token);
      }
      if (j % 5 === 0) console.log(`   ✓ 企业 ${enterprise.name}: 员工${j}/20 完成`);
    }

    for (let p = 1; p <= 3; p++) {
      await createProduct(enterprise.id, p, token);
    }
    console.log(`   ✓ 企业 ${enterprise.name}: 数据创建完成\n`);
  }

  console.log('✅ 测试数据准备完成!');
}

seed().catch(console.error);
