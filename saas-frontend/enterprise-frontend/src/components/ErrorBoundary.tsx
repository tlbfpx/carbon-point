import { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button, Typography } from 'antd';
import { componentLogger } from '@/utils';

const { Paragraph, Text } = Typography;

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

  handleGoHome = (): void => {
    componentLogger.info('[ErrorBoundary] 返回首页');
    window.location.hash = '#/enterprise/dashboard';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <Result
          status="error"
          title="页面出错了"
          subTitle="抱歉，页面遇到了错误，请尝试刷新或返回首页。"
          extra={[
            <Button key="reload" type="primary" onClick={this.handleReload}>
              刷新页面
            </Button>,
            <Button key="home" onClick={this.handleGoHome}>
              返回首页
            </Button>,
          ]}
        >
          <div style={{ textAlign: 'left' }}>
            <Paragraph>
              <Text type="secondary">错误信息：</Text>
            </Paragraph>
            <Paragraph>
              <pre
                style={{
                  background: '#f5f5f5',
                  padding: 12,
                  borderRadius: 4,
                  fontSize: 12,
                  maxHeight: 200,
                  overflow: 'auto',
                }}
              >
                {this.state.error?.message || '未知错误'}
              </pre>
            </Paragraph>
          </div>
        </Result>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
