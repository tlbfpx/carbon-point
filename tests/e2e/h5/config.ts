export const BASE_URL = process.env.PLAYWRIGHT_H5_BASE_URL || 'http://localhost:3002/h5';
export const API_BASE = process.env.API_BASE_URL || 'http://localhost:8080/api';

export const TEST_USERS = {
  enterpriseAdmin: {
    phone: '13800138001',
    password: 'Test@123',
  },
  regularUser: {
    phone: '13900000004',
    password: 'Test123456!',
  },
};
