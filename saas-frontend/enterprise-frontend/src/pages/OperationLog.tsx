import React, { useState, useMemo } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  DatePicker,
  Tag,
  Modal,
  Descriptions,
  Card,
} from 'antd';
import { SearchOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { getOperationLogs, OperationLog as OperationLogType } from '@/api/operationLog';
import { useBranding } from '@/components/BrandingProvider';

const { RangePicker } = DatePicker;

const MODULE_OPTIONS = [
  { label: '全部模块', value: '' },
  { label: '用户管理', value: 'member' },
  { label: '产品管理', value: 'product' },
  { label: '订单管理', value: 'order' },
  { label: '规则配置', value: 'rule' },
  { label: '角色管理', value: 'role' },
  { label: '积分运营', value: 'point' },
  { label: '品牌配置', value: 'branding' },
];

const ACTION_OPTIONS = [
  { label: '全部操作', value: '' },
  { label: '创建', value: 'CREATE' },
  { label: '更新', value: 'UPDATE' },
  { label: '删除', value: 'DELETE' },
  { label: '查询', value: 'QUERY' },
  { label: '导出', value: 'EXPORT' },
];

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  CREATE: { bg: '#e6f7ff', color: '#1890ff' },
  UPDATE: { bg: '#fff7e6', color: '#fa8c16' },
  DELETE: { bg: '#fff1f0', color: '#ff4d4f' },
  QUERY: { bg: '#f6ffed', color: '#52c41a' },
  EXPORT: { bg: '#f9f0ff', color: '#722ed1' },
};

const MODULE_LABELS: Record<string, string> = {
  member: '用户管理',
  product: '产品管理',
  order: '订单管理',
  rule: '规则配置',
  role: '角色管理',
  point: '积分运营',
  branding: '品牌配置',
  system: '系统',
};

// Static theme colors shared across pages
const THEME = {
  warmBorder: '#d4d0c8',
  bgSoft: '#faf8f5',
  textMuted: '#8a857f',
  textHeading: '#2c2825',
  sectionBg: '#f5f3f0',
} as const;

const tagStyle: React.CSSProperties = {
  borderRadius: 20,
  padding: '2px 10px',
  fontFamily: 'Noto Sans SC, sans-serif',
  fontSize: 12,
  border: 'none',
};

const renderActionTag = (action: string) => {
  const cfg = ACTION_COLORS[action] ?? { bg: '#f5f5f5', color: '#8c8c8c' };
  return <Tag style={{ ...tagStyle, background: cfg.bg, color: cfg.color }}>{action}</Tag>;
};

const OperationLog: React.FC = () => {
  const { primaryColor } = useBranding();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<OperationLogType | null>(null);

  const openDetail = (record: OperationLogType) => {
    setSelectedLog(record);
    setDetailModalOpen(true);
  };

  // Use date strings for stable queryKey — avoids dayjs object reference equality issues
  const startDate = dateRange[0]?.format('YYYY-MM-DD');
  const endDate = dateRange[1]?.format('YYYY-MM-DD');

  const { data, isLoading } = useQuery({
    queryKey: ['operation-logs', page, keyword, module, action, startDate, endDate],
    queryFn: () =>
      getOperationLogs({
        page,
        size: 10,
        username: keyword,
        module,
        action,
        startDate: dateRange[0]?.format('YYYY-MM-DD'),
        endDate: dateRange[1]?.format('YYYY-MM-DD'),
      }),
  });

  const columns = useMemo(
    () => [
      {
        title: '操作人',
        dataIndex: 'username',
        render: (username: string) => (
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, color: THEME.textHeading }}>
            {username}
          </span>
        ),
      },
      {
        title: '模块',
        dataIndex: 'module',
        render: (m: string) => (
          <Tag style={{ ...tagStyle, background: THEME.sectionBg, color: THEME.textHeading }}>
            {MODULE_LABELS[m] || m}
          </Tag>
        ),
      },
      {
        title: '操作类型',
        dataIndex: 'action',
        render: renderActionTag,
      },
      {
        title: '操作描述',
        dataIndex: 'detail',
        render: (detail: string) => (
          <span
            style={{
              fontFamily: 'Noto Sans SC, sans-serif',
              color: THEME.textHeading,
              maxWidth: 280,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block',
            }}
            title={detail}
          >
            {detail}
          </span>
        ),
      },
      {
        title: 'IP地址',
        dataIndex: 'ip',
        render: (ip: string) => (
          <span style={{ fontFamily: 'Noto Sans SC, sans-serif', color: THEME.textMuted, fontSize: 12 }}>
            {ip}
          </span>
        ),
      },
      {
        title: '操作时间',
        dataIndex: 'createdAt',
        render: (time: string) => (
          <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: THEME.textMuted }}>
            {dayjs(time).format('YYYY-MM-DD HH:mm:ss')}
          </span>
        ),
      },
      {
        title: '操作',
        render: (_: unknown, record: OperationLogType) => (
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => openDetail(record)}
            style={{ borderRadius: 16, fontFamily: 'Noto Sans SC, sans-serif', color: primaryColor }}
          >
            详情
          </Button>
        ),
      },
    ],
    [primaryColor],
  );

  const handleReset = () => {
    setKeyword('');
    setModule('');
    setAction('');
    setDateRange([null, null]);
    setPage(1);
  };

  const paginationItemRender = (current: number, type: 'page' | 'next' | 'prev' | 'jump-prev' | 'jump-next', originalElement: React.ReactNode) => {
    if (type === 'page') {
      return (
        <Button
          style={{
            borderRadius: 8,
            border: `1px solid ${THEME.warmBorder}`,
            color: current === page ? primaryColor : '#666',
            background: current === page ? `${primaryColor}15` : '#fff',
            fontWeight: current === page ? 600 : 400,
          }}
        >
          {current}
        </Button>
      );
    }
    return originalElement;
  };

  return (
    <div style={{ padding: '0 0 24px 0', fontFamily: 'Noto Sans SC, sans-serif' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 4,
            color: THEME.textHeading,
          }}
        >
          操作日志
        </h1>
        <p style={{ color: THEME.textMuted, fontSize: 14, margin: 0 }}>
          查看所有管理操作记录
        </p>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          background: THEME.bgSoft,
          borderRadius: 16,
          padding: '16px 20px',
          marginBottom: 20,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Input.Search
          placeholder="搜索操作人"
          allowClear
          onSearch={(val) => { setKeyword(val); setPage(1); }}
          style={{ width: 200 }}
          prefix={<SearchOutlined style={{ color: THEME.textMuted }} />}
          styles={{
            input: { borderRadius: 12, border: `1px solid ${THEME.warmBorder}` },
          }}
        />
        <Select
          placeholder="筛选模块"
          allowClear
          style={{ width: 140, borderRadius: 12 }}
          onChange={(val) => { setModule(val || ''); setPage(1); }}
          options={MODULE_OPTIONS}
          variant="outlined"
        />
        <Select
          placeholder="筛选操作"
          allowClear
          style={{ width: 140, borderRadius: 12 }}
          onChange={(val) => { setAction(val || ''); setPage(1); }}
          options={ACTION_OPTIONS}
          variant="outlined"
        />
        <RangePicker
          onChange={(dates) => {
            setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null]);
            setPage(1);
          }}
          style={{ borderRadius: 12 }}
        />
        <Button
          icon={<ReloadOutlined />}
          onClick={handleReset}
          style={{
            borderRadius: 20,
            border: `1px solid ${THEME.warmBorder}`,
            color: THEME.textMuted,
            fontFamily: 'Noto Sans SC, sans-serif',
          }}
        >
          重置
        </Button>
      </div>

      {/* Table Card */}
      <Card
        style={{
          borderRadius: 16,
          border: `1px solid ${THEME.warmBorder}`,
          boxShadow: '0 2px 16px rgba(0, 0, 0, 0.04)',
        }}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          columns={columns}
          dataSource={data?.data?.records || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: 10,
            total: data?.data?.total || 0,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            itemRender: paginationItemRender,
          }}
          style={{ fontFamily: 'Noto Sans SC, sans-serif' }}
          rowClassName={() => 'operation-log-row'}
        />
        <style>{`
          .operation-log-row:hover {
            background: ${THEME.bgSoft} !important;
            border-radius: 8px;
          }
          .operation-log-row {
            transition: all 0.2s ease;
          }
          .operation-log-row td {
            border-bottom: 1px solid ${THEME.warmBorder}40;
          }
          .operation-log-row .ant-table-thead > tr > th {
            background: ${THEME.sectionBg} !important;
            border-bottom: 1px solid ${THEME.warmBorder} !important;
            font-family: 'Outfit', sans-serif !important;
            font-weight: 600 !important;
            color: ${THEME.textHeading} !important;
            padding: 16px !important;
          }
          .operation-log-row .ant-table-tbody > tr > td {
            padding: 14px 16px !important;
          }
          .operation-log-row .ant-pagination-item {
            border-radius: 8px !important;
            border: 1px solid ${THEME.warmBorder} !important;
          }
          .operation-log-row .ant-pagination-item-active {
            background: ${primaryColor}15 !important;
            border-color: ${primaryColor} !important;
          }
          .operation-log-row .ant-pagination-item-active a {
            color: ${primaryColor} !important;
          }
        `}</style>
      </Card>

      {/* Detail Modal */}
      <Modal
        title={
          <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 20, fontWeight: 600, color: THEME.textHeading }}>
            操作详情
          </span>
        }
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={
          <Button
            onClick={() => setDetailModalOpen(false)}
            style={{ borderRadius: 20, height: 36, paddingLeft: 24, paddingRight: 24 }}
          >
            关闭
          </Button>
        }
        width={560}
        destroyOnClose
        closeIcon={<span style={{ color: THEME.textMuted }}>✕</span>}
        styles={{
          content: {
            borderRadius: 24,
            border: `1px solid ${THEME.warmBorder}`,
          },
        }}
      >
        {selectedLog && (
          <div style={{ marginTop: 16 }}>
            <Descriptions column={1} size="small" style={{ fontFamily: 'Noto Sans SC, sans-serif' }}>
              <Descriptions.Item
                label={<span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, color: THEME.textHeading }}>操作人</span>}
              >
                {selectedLog.username}
              </Descriptions.Item>
              <Descriptions.Item
                label={<span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, color: THEME.textHeading }}>模块</span>}
              >
                {MODULE_LABELS[selectedLog.module] || selectedLog.module}
              </Descriptions.Item>
              <Descriptions.Item
                label={<span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, color: THEME.textHeading }}>操作类型</span>}
              >
                {renderActionTag(selectedLog.action)}
              </Descriptions.Item>
              <Descriptions.Item
                label={<span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, color: THEME.textHeading }}>操作描述</span>}
              >
                {selectedLog.detail}
              </Descriptions.Item>
              <Descriptions.Item
                label={<span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, color: THEME.textHeading }}>IP地址</span>}
              >
                {selectedLog.ip}
              </Descriptions.Item>
              <Descriptions.Item
                label={<span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, color: THEME.textHeading }}>User-Agent</span>}
              >
                <span style={{ fontSize: 12, color: THEME.textMuted, wordBreak: 'break-all' }}>
                  {selectedLog.userAgent}
                </span>
              </Descriptions.Item>
              <Descriptions.Item
                label={<span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, color: THEME.textHeading }}>操作时间</span>}
              >
                {dayjs(selectedLog.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OperationLog;
