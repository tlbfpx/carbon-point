/**
 * Carbon Point Design System - NaturalLanguageQuery Component
 * 自然语言查询组件
 */

import React, { useState, useRef } from 'react';
import { Input, Button, Space, Typography, Card, Spin, Empty } from 'antd';
import {
  SearchOutlined,
  SendOutlined,
  LoadingOutlined,
  HistoryOutlined,
  ClockCircleOutlined,
  AimOutlined,
} from '@ant-design/icons';
import { CSSProperties } from 'react';
import { GlassCard } from './GlassCard';

const { Text, Title } = Typography;
const { TextArea } = Input;

export interface QueryResult {
  /**
   * 查询结果标题
   */
  title: string;
  /**
   * 结果摘要
   */
  summary: string;
  /**
   * 详细数据
   */
  data?: Record<string, any>[];
  /**
   * 洞察建议
   */
  insights?: string[];
  /**
   * 关联操作
   */
  actions?: {
    label: string;
    onClick: () => void;
  }[];
}

export interface NaturalLanguageQueryProps {
  /**
   * 查询回调
   */
  onQuery?: (query: string) => Promise<QueryResult>;
  /**
   * 预设快捷查询
   */
  quickQueries?: string[];
  /**
   * 是否加载中
   */
  loading?: boolean;
  /**
   * 查询历史
   */
  history?: string[];
  /**
   * 主题
   */
  theme?: 'dark' | 'light';
  /**
   * 占位提示
   */
  placeholder?: string;
}

/**
 * NaturalLanguageQuery - 自然语言查询组件
 * 支持直接输入自然语言提问，返回结构化的数据洞察
 */
export const NaturalLanguageQuery: React.FC<NaturalLanguageQueryProps> = ({
  onQuery,
  quickQueries = [
    '今日签到数据',
    '本周新增用户',
    '热门商品排行',
    '积分消耗分析',
  ],
  loading = false,
  history = [],
  theme = 'dark',
  placeholder = '输入您想了解的数据，例如："上个月哪个产品的转化率最高？"',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QueryResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 执行查询
  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim() || isSearching) return;

    setIsSearching(true);
    setQuery(searchQuery);

    try {
      if (onQuery) {
        const result = await onQuery(searchQuery);
        setResults((prev) => [result, ...prev].slice(0, 5));
      } else {
        // 模拟查询
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const mockResult: QueryResult = generateMockResult(searchQuery);
        setResults((prev) => [mockResult, ...prev].slice(0, 5));
      }
    } catch (error) {
      console.error('Query failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // 模拟结果生成
  const generateMockResult = (q: string): QueryResult => {
    const lowerQ = q.toLowerCase();

    if (lowerQ.includes('签到')) {
      return {
        title: '签到数据分析',
        summary: '今日签到人数 1,247 人，环比昨日增长 12.5%',
        insights: [
          '9:00-10:00 为签到高峰，占全天 35%',
          '连续签到 3 天以上用户占比 42%',
          '建议关注周末签到率下滑问题',
        ],
        actions: [
          { label: '查看趋势图', onClick: () => {} },
          { label: '导出数据', onClick: () => {} },
        ],
      };
    }

    if (lowerQ.includes('用户') || lowerQ.includes('新增')) {
      return {
        title: '用户增长分析',
        summary: '本周新增注册 586 人，环比增长 18.5%',
        insights: [
          '通过邀请链接注册的用户占 35%',
          '新用户 7 日留存率 62.3%',
          '广东、浙江、江苏为主要来源省份',
        ],
        actions: [
          { label: '用户画像详情', onClick: () => {} },
          { label: '设置转化漏斗', onClick: () => {} },
        ],
      };
    }

    if (lowerQ.includes('商品') || lowerQ.includes('排行') || lowerQ.includes('热门')) {
      return {
        title: '商品热度分析',
        summary: '¥10 话费券登顶热销，兑换 234 次',
        insights: [
          'TOP3 商品消耗积分占总量 65%',
          '虚拟商品（券码）兑换占比 78%',
          '实物商品平均客单价 8,500 积分',
        ],
        actions: [
          { label: '查看完整排行', onClick: () => {} },
          { label: '库存预警设置', onClick: () => {} },
        ],
      };
    }

    return {
      title: '查询结果',
      summary: `关于"${q}"的分析已完成`,
      insights: ['更多详情请浏览对应模块'],
    };
  };

  // 渲染结果
  const renderResult = (result: QueryResult, index: number) => (
    <GlassCard
      key={index}
      hoverable
      padding={20}
      style={{
        marginBottom: 12,
        opacity: index === 0 ? 1 : 0.8 - index * 0.15,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <AimOutlined style={{ color: '#fff', fontSize: 18 }} />
        </div>
        <div style={{ flex: 1 }}>
          <Title level={5} style={{ margin: '0 0 4px 0', fontSize: 15, color: '#fff' }}>
            {result.title}
          </Title>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: 12 }}>
            {result.summary}
          </Text>

          {result.insights && result.insights.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              {result.insights.map((insight, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    marginBottom: 6,
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.8)',
                  }}
                >
                  <span style={{ color: '#6366F1' }}>•</span>
                  {insight}
                </div>
              ))}
            </div>
          )}

          {result.actions && result.actions.length > 0 && (
            <Space size={8}>
              {result.actions.map((action, i) => (
                <Button
                  key={i}
                  size="small"
                  onClick={action.onClick}
                  style={{
                    background: 'rgba(99,102,241,0.15)',
                    border: '1px solid rgba(99,102,241,0.3)',
                    color: '#A5B4FC',
                  }}
                >
                  {action.label}
                </Button>
              ))}
            </Space>
          )}
        </div>
      </div>
    </GlassCard>
  );

  return (
    <div style={{ position: 'relative' }}>
      {/* 搜索输入框 */}
      <GlassCard gradientBorder padding={0} style={{ overflow: 'hidden' }}>
        <div
          style={{
            padding: 16,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.05) 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <TextArea
              ref={inputRef as any}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleSearch(query);
                }
              }}
              placeholder={placeholder}
              autoSize={{ minRows: 1, maxRows: 4 }}
              style={{
                flex: 1,
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                color: '#fff',
                fontSize: 15,
                padding: '10px 14px',
                resize: 'none',
              }}
            />
            <Button
              type="primary"
              icon={isSearching ? <LoadingOutlined /> : <SendOutlined />}
              onClick={() => handleSearch(query)}
              loading={isSearching}
              style={{
                height: 42,
                width: 42,
                padding: 0,
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                border: 'none',
                borderRadius: 12,
              }}
            />
          </div>
        </div>

        {/* 快捷查询 */}
        <div style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <HistoryOutlined style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }} />
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>快捷查询</Text>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {quickQueries.map((q, i) => (
              <Button
                key={i}
                size="small"
                onClick={() => handleSearch(q)}
                disabled={isSearching}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.7)',
                  borderRadius: 8,
                }}
              >
                {q}
              </Button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* 查询结果 */}
      {results.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {results.map((result, i) => renderResult(result, i))}
        </div>
      )}

      {/* 空状态 */}
      {!isSearching && results.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: 40,
            color: 'rgba(255,255,255,0.3)',
          }}
        >
          <SearchOutlined style={{ fontSize: 48, marginBottom: 16 }} />
          <Text style={{ display: 'block', fontSize: 14 }}>
            输入问题开始智能分析
          </Text>
        </div>
      )}
    </div>
  );
};

export default NaturalLanguageQuery;
