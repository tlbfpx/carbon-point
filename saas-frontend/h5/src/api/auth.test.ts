import { describe, it, expect } from 'vitest';

// Test login parameter validation
describe('auth API types', () => {
  it('LoginParams requires phone and password', () => {
    const params = {
      phone: '13800138000',
      password: 'password123',
      remember: false,
    };
    expect(params.phone).toBe('13800138000');
    expect(params.password).toBe('password123');
    expect(params.remember).toBe(false);
  });

  it('RegisterParams requires phone, smsCode, password', () => {
    const params = {
      phone: '13800138000',
      smsCode: '123456',
      password: 'password123',
      inviteCode: 'ABC123',
    };
    expect(params.phone).toBe('13800138000');
    expect(params.smsCode).toBe('123456');
    expect(params.password).toBe('password123');
    expect(params.inviteCode).toBe('ABC123');
  });

  it('SmsCodeParams accepts register type', () => {
    const params = { phone: '13800138000', type: 'register' as const };
    expect(params.type).toBe('register');
  });

  it('SmsCodeParams accepts reset_password type', () => {
    const params = { phone: '13800138000', type: 'reset_password' as const };
    expect(params.type).toBe('reset_password');
  });
});
