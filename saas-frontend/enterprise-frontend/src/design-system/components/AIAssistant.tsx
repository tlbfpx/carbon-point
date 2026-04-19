/**
 * Carbon Point Design System - AIAssistant Component
 * AI 助手浮窗组件
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  FloatButton,
  Modal,
  Input,
  Button,
  Spin,
  Typography,
  Space,
  Avatar,
  ScrollableContent,
} from 'antd';
import {
  RobotOutlined,
  SendOutlined,
  CloseOutlined,
  FireOutlined,
  BulbOutlined,
  LineChartOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { CSSProperties } from 'react';
import { breathingAnimation, floatingOrb } from '../theme/liquid-glass';

const { Text, Title } = Typography;
const { TextArea } = Input;

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: AIAction[];
}

export interface AIAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

export interface AIAssistantProps {
  /**
   * 是否默认展开
   */
  defaultOpen?: boolean;
  /**
   * 预设的快捷问题
   */
  quickQuestions?: string[];
  /**
   * AI 名称
   */
  botName?: string;
  /**
   * 头像
   */
  botAvatar?: React.ReactNode;
  /**
   * 发送消息回调
   */
  onSendMessage?: (message: string) => Promise<string>;
  /**
   * 主题
   */
  theme?: 'dark' | 'light';
}

/**
 * AIAssistant - 悬浮式 AI 助手组件
 * 右下角悬浮按钮 + 点击展开对话窗口
 */
export const AIAssistant: React.FC<AIAssistantProps> = ({
  defaultOpen = false,
  quickQuestions = [
    '今日运营概览',
    '用户增长趋势',
    '本周热门商品',
    '生成周报摘要',
  ],
  botName = 'Carbon AI',
  botAvatar = <FireOutlined />,
  onSendMessage,
  theme = 'dark',
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [typewriterText, setTypewriterText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typewriterText]);

  // 模拟打字机效果
  useEffect(() => {
    if (loading && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        let index = 0;
        const timer = setInterval(() => {
          if (index <= lastMessage.content.length) {
            setTypewriterText(lastMessage.content.slice(0, index));
            index++;
          } else {
            clearInterval(timer);
            setTypewriterText('');
          }
        }, 20);
        return () => clearInterval(timer);
      }
    }
  }, [loading, messages]);

  // 发送消息
  const handleSend = async () => {
    if (!message.trim() || loading) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setLoading(true);

    try {
      if (onSendMessage) {
        const response = await onSendMessage(message);
        const assistantMessage: AIMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response,
          timestamp: new Date(),
          actions: generateActions(response),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // 模拟 AI 响应
        await new Promise(resolve => setTimeout(resolve, 1500));
        const assistantMessage: AIMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: generateMockResponse(message),
          timestamp: new Date(),
          actions: generateActions(message),
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('AI request failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // 快捷问题
  const handleQuickQuestion = (question: string) => {
    setMessage(question);
  };

  // 生成可执行操作
  const generateActions = (query: string): AIAction[] => {
    const q = query.toLowerCase();
    if (q.includes('报告') || q.includes('周报')) {
      return [
        { label: '导出 PDF', onClick: () => {}, icon: <FileTextOutlined /> },
        { label: '生成分享链接', onClick: () => {}, icon: <FireOutlined /> },
      ];
    }
    if (q.includes('趋势') || q.includes('图表')) {
      return [
        { label: '查看详情', onClick: () => {}, icon: <LineChartOutlined /> },
        { label: '设置提醒', onClick: () => {}, icon: <BulbOutlined /> },
      ];
    }
    return [
      { label: '深入分析', onClick: () => {}, icon: <BulbOutlined /> },
      { label: '导出数据', onClick: () => {}, icon: <FileTextOutlined /> },
    ];
  };

  // 模拟响应
  const generateMockResponse = (query: string): string => {
    if (query.includes('概览') || query.includes('今日')) {
      return `📊 **今日运营概览**

• 今日签到人数：**1,247** 人（↑12%）
• 新增注册：**86** 人（↑8%）
• 积分发放：**12,580**（↑15%）
• 订单转化：**3.2%**（↑0.3%）

🕐 高峰时段：9:00-10:00、14:00-15:00

💡 建议：当前转化率良好，可考虑增加下午时段的运营活动。`;
    }
    if (query.includes('趋势')) {
      return `📈 **用户增长趋势分析**

过去 7 天：
• 日均签到：**1,189** 人
• 环比上周：**+18.5%**
• 连续 3 天以上签到用户：**456** 人

🌟 重点关注：
1. 周末签到率下降 12%，建议增加周末活动
2. Lv.3 黄金会员增长最快（+23%）
3. 新用户 7 日留存率：62.3%`;
    }
    if (query.includes('热门')) {
      return `🏆 **本周热门商品 TOP 5**

| 排名 | 商品 | 兑换次数 | 消耗积分 |
|------|------|----------|----------|
| 1 | ¥10 话费券 | 234 | 5,000 |
| 2 | 视频会员月卡 | 189 | 3,000 |
| 3 | 咖啡券 | 156 | 2,000 |
| 4 | 健身月卡 | 98 | 8,000 |
| 5 | 购物满减券 | 76 | 1,500 |

💡 建议：话费券库存不足，建议补货`;
    }
    return `我已理解您的问题："${query}"

正在分析数据，请稍候...

📊 分析结果将在此显示，包括相关图表和可执行的操作建议。`;
  };

  // 渲染消息
  const renderMessage = (msg: AIMessage) => (
    <div
      key={msg.id}
      style={{
        display: 'flex',
        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
        marginBottom: 16,
      }}
    >
      <div
        style={{
          maxWidth: '75%',
          padding: '12px 16px',
          borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: msg.role === 'user'
            ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
            : 'rgba(255, 255, 255, 0.06)',
          color: '#fff',
          fontSize: 14,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
        }}
      >
        {msg.content}
        {msg.actions && msg.role === 'assistant' && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {msg.actions.map((action, i) => (
              <Button
                key={i}
                size="small"
                icon={action.icon}
                onClick={action.onClick}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                }}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // 浮窗按钮样式
  const floatButtonContent = (
    <div style={{ ...floatingOrb, position: 'relative' }}>
      <FloatButton.Group
        trigger="click"
        placement="top"
        icon={
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Avatar
              size={40}
              icon={<RobotOutlined />}
              style={{
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
              }}
            />
            {/* 呼吸光环 */}
            <span
              style={{
                position: 'absolute',
                width: 50,
                height: 50,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99,102,241,0.3), transparent)',
                animation: 'cp-pulse 2s ease-in-out infinite',
              }}
            />
          </div>
        }
        open={open}
        onOpenChange={setOpen}
        style={{ insetInlineEnd: 24 }}
      >
        <FloatButton
          icon={<FireOutlined />}
          tooltip="智能洞察"
          onClick={() => handleQuickQuestion('今日运营概览')}
        />
        <FloatButton
          icon={<LineChartOutlined />}
          tooltip="趋势分析"
          onClick={() => handleQuickQuestion('用户增长趋势')}
        />
        <FloatButton
          icon={<FileTextOutlined />}
          tooltip="生成报告"
          onClick={() => handleQuickQuestion('生成周报摘要')}
        />
      </FloatButton.Group>
    </div>
  );

  return (
    <>
      {/* 浮窗按钮 */}
      {floatButtonContent}

      {/* 对话窗口 */}
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={520}
        centered
        closeIcon={<CloseOutlined style={{ color: '#fff' }} />}
        modalRender={(modal) => (
          <div
            style={{
              background: 'rgba(15, 15, 20, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: 24,
              border: '1px solid rgba(255,255,255,0.1)',
              overflow: 'hidden',
              boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
            }}
          >
            {modal}
          </div>
        )}
        styles={{
          body: { padding: 0, height: 480, display: 'flex', flexDirection: 'column' },
          header: { display: 'none' },
          content: { padding: 0 },
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Avatar
            size={40}
            icon={<RobotOutlined />}
            style={{
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            }}
          />
          <div>
            <Title level={5} style={{ margin: 0, color: '#fff', fontSize: 16 }}>
              {botName}
            </Title>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              随时为您提供数据洞察
            </Text>
          </div>
          <div
            style={{
              marginLeft: 'auto',
              padding: '4px 12px',
              borderRadius: 20,
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#10B981',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            在线
          </div>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            padding: 24,
            overflowY: 'auto',
            background: 'rgba(0,0,0,0.2)',
          }}
        >
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>
              <FireOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }} />
              <Title level={5} style={{ color: '#fff', marginBottom: 8 }}>
                您好，我是 {botName}
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                我可以帮您分析数据、生成报告、解答问题
              </Text>

              {/* 快捷问题 */}
              <div style={{ marginTop: 24 }}>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 12, display: 'block' }}>
                  试试这些问题：
                </Text>
                <Space wrap style={{ justifyContent: 'center' }}>
                  {quickQuestions.map((q, i) => (
                    <Button
                      key={i}
                      size="small"
                      onClick={() => handleQuickQuestion(q)}
                      style={{
                        background: 'rgba(99,102,241,0.15)',
                        border: '1px solid rgba(99,102,241,0.3)',
                        color: '#A5B4FC',
                      }}
                    >
                      {q}
                    </Button>
                  ))}
                </Space>
              </div>
            </div>
          )}

          {messages.map(renderMessage)}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.5)' }}>
              <Spin size="small" />
              <Text style={{ fontSize: 13 }}>正在分析...</Text>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(0,0,0,0.3)',
          }}
        >
          <div style={{ display: 'flex', gap: 12 }}>
            <TextArea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="输入您的问题，按 Enter 发送..."
              autoSize={{ minRows: 1, maxRows: 3 }}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                color: '#fff',
                resize: 'none',
              }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={loading}
              style={{
                height: 40,
                width: 40,
                padding: 0,
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                border: 'none',
                borderRadius: 12,
              }}
            />
          </div>
        </div>
      </Modal>

      {/* 全局动画样式 */}
      <style>{`
        @keyframes cp-pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.3); opacity: 0; }
        }
        .ant-modal-content { background: transparent !important; }
      `}</style>
    </>
  );
};

export default AIAssistant;
