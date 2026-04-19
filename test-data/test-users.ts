// Test data for creating test tenants, users, and test scenarios

export const TEST_TENANT = {
  name: '测试企业',
  code: 'TEST001',
  contactPhone: '13800138000',
  contactEmail: 'test@company.com',
  status: 'ACTIVE',
};

// Note: These are users that exist in the MySQL database
// Enterprise Admin user - belongs to tenant 1
export const TEST_USERS = {
  platformAdmin: {
    phone: '13900000001',
    password: 'Test123456!',
    role: 'PLATFORM_ADMIN',
  },
  enterpriseAdmin: {
    phone: '13800138001',  // Existing user with password Test@123
    password: 'Test@123',
    role: 'ENTERPRISE_ADMIN',
  },
  enterpriseOperator: {
    phone: '13900000003',
    password: 'Test123456!',
    role: 'ENTERPRISE_OPERATOR',
  },
  regularUser: {
    phone: '13900000004',
    password: 'Test123456!',
    role: 'USER',
  },
};

export const TEST_PRODUCTS = {
  coupon: {
    name: '测试优惠券',
    type: 'COUPON',
    price: 100,
    stock: 100,
  },
  recharge: {
    name: '测试直充',
    type: 'RECHARGE',
    price: 200,
    stock: 50,
  },
  privilege: {
    name: '测试权益',
    type: 'PRIVILEGE',
    price: 500,
    stock: 20,
  },
};

export const TEST_POINT_RULES = {
  morningCheckin: {
    name: '早打卡',
    timeSlot: 'MORNING',
    basePoints: 10,
  },
  afternoonCheckin: {
    name: '午打卡',
    timeSlot: 'AFTERNOON',
    basePoints: 15,
  },
  eveningCheckin: {
    name: '晚打卡',
    timeSlot: 'EVENING',
    basePoints: 20,
  },
};
