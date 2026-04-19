import { Component, ErrorInfo, ReactNode } from 'react';
import { componentLogger } from '@carbon-point/utils';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    componentLogger.error(`[React Error] ${error.message}`, {
      name: error.name,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  handleReload = (): void => {
    componentLogger.info('[ErrorBoundary] 页面重新加载');
    window.location.href = window.location.href;
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            padding: 24,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>页面出错了</h2>
          <p style={{ color: '#999', fontSize: 14, marginBottom: 24 }}>
            抱歉，页面遇到了错误，请尝试刷新。
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: '10px 32px',
              background: '#1890ff',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            刷新页面
          </button>
          {this.state.error && (
            <details
              style={{
                marginTop: 24,
                padding: 12,
                background: '#f5f5f5',
                borderRadius: 4,
                fontSize: 12,
                textAlign: 'left',
                width: '100%',
                maxWidth: 400,
                maxHeight: 150,
                overflow: 'auto',
              }}
            >
              <summary style={{ cursor: 'pointer', marginBottom: 8 }}>
                错误详情
              </summary>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
