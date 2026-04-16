import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@carbon-point/utils', () => ({
  componentLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import ErrorBoundary from '../components/ErrorBoundary';

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>正常内容</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('正常内容')).toBeTruthy();
  });

  it('catches render errors and shows fallback UI', () => {
    const ThrowError = () => {
      throw new Error('测试错误');
    };

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('页面出错了')).toBeTruthy();
    expect(screen.getByText('刷新页面')).toBeTruthy();
  });

  it('shows custom fallback when provided', () => {
    const ThrowError = () => {
      throw new Error('Custom error');
    };

    render(
      <ErrorBoundary fallback={<div>自定义错误页面</div>}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('自定义错误页面')).toBeTruthy();
  });

  it('shows error message details when error is present', () => {
    const ThrowError = () => {
      throw new Error('Detailed error for testing');
    };

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('错误详情')).toBeTruthy();
  });
});

