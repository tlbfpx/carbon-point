import React, { useState, useMemo } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  Tag,
  Modal,
  Form,
  Upload,
  message,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  UploadOutlined,
  LinkOutlined,
  UserOutlined,
  StopOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMembers, createMember, toggleMemberStatus, generateInviteLink } from '@/api/members';
import type { Member } from '@/api/members';
import { useAuthStore } from '@/store/authStore';
import { useBranding } from '@/components/BrandingProvider';
import { GlassCard } from '@carbon-point/design-system';
import type { UploadProps } from 'antd';

interface ApiResponse {
  code: number;
  message?: string;
  data?: unknown;
}

interface InviteLinkResponse {
  link: string;
}

const Member: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const tenantId = user?.tenantId || '';
  const queryClient = useQueryClient();
  const { primaryColor } = useBranding();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['members', page, keyword],
    queryFn: () => getMembers({ page, size: 10, keyword }),
  });

  const createMutation = useMutation({
    mutationFn: createMember,
    onSuccess: (res: ApiResponse) => {
      if (res.code === 200) {
        message.success('添加成功');
        setCreateModalOpen(false);
        form.resetFields();
        queryClient.invalidateQueries({ queryKey: ['members'] });
      } else {
        message.error(res.message || '添加失败');
      }
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'active' | 'inactive' }) =>
      toggleMemberStatus(userId, status),
    onSuccess: () => {
      message.success('状态更新成功');
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: generateInviteLink,
    onSuccess: (res: InviteLinkResponse) => {
      if (res.link) {
        navigator.clipboard.writeText(res.link);
        message.success('邀请链接已复制到剪贴板');
      }
    },
  });

  const uploadProps: UploadProps = {
    name: 'file',
    action: '/api/system/users/import',
    headers: { Authorization: `Bearer ${accessToken}` },
    accept: '.xlsx,.xls',
    onChange: (info) => {
      if (info.file.status === 'done') {
        message.success('导入成功');
        queryClient.invalidateQueries({ queryKey: ['members'] });
      } else if (info.file.status === 'error') {
        message.error('导入失败');
      }
    },
  };

  const levelLabels: Record<number, string> = {
    1: '青铜',
    2: '白银',
    3: '黄金',
    4: '铂金',
    5: '钻石',
  };

  const levelColors: Record<number, { bg: string; text: string }> = {
    1: { bg: 'rgba(141,110,99,0.15)', text: '#8d6e63' },
    2: { bg: 'rgba(120,144,156,0.15)', text: '#78909c' },
    3: { bg: 'rgba(251,192,45,0.15)', text: '#fbc02d' },
    4: { bg: 'rgba(92,107,192,0.15)', text: '#5c6bc0' },
    5: { bg: 'rgba(236,64,122,0.15)', text: '#ec407a' },
  };

  const columns = useMemo(() => [
    {
      title: '成员信息',
      dataIndex: 'username',
      render: (name: string, record: Member) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${primaryColor}20, ${primaryColor}40)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <UserOutlined style={{ color: primaryColor, fontSize: 18 }} />
          </div>
          <div>
            <div style={{ fontWeight: 500, fontFamily: 'var(--font-body)' }}>{name}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{record.phone}</div>
          </div>
        </div>
      ),
    },
    {
      title: '积分',
      dataIndex: 'totalPoints',
      sorter: (a: Member, b: Member) => a.totalPoints - b.totalPoints,
      render: (points: number) => (
        <span style={{ fontWeight: 600, color: primaryColor }}>{points?.toLocaleString() || 0}</span>
      ),
    },
    {
      title: '等级',
      dataIndex: 'level',
      render: (level: number) => {
        const colors = levelColors[level] || levelColors[1];
        return (
          <Tag
            style={{
              borderRadius: 20,
              padding: '4px 12px',
              background: colors.bg,
              color: colors.text,
              border: 'none',
              fontWeight: 500,
            }}
          >
            {levelLabels[level] || `Lv.${level}`}
          </Tag>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: string) => (
        <Tag
          style={{
            borderRadius: 20,
            padding: '4px 12px',
            background: status === 'active' ? 'rgba(46,125,50,0.15)' : 'rgba(198,40,40,0.15)',
            color: status === 'active' ? '#2e7d32' : '#c62828',
            border: 'none',
            fontWeight: 500,
          }}
        >
          {status === 'active' ? '正常' : '停用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      render: (_: unknown, record: Member) => (
        <Space size={8}>
          <Button
            size="small"
            icon={<LinkOutlined />}
            onClick={() => inviteMutation.mutate(record.userId)}
            style={{
              borderRadius: 20,
              border: `1px solid ${primaryColor}40`,
              color: primaryColor,
              background: 'transparent',
            }}
          >
            邀请
          </Button>
          <Popconfirm
            title={`确认${record.status === 'active' ? '停用' : '启用'}该成员？`}
            onConfirm={() =>
              toggleMutation.mutate({
                userId: record.userId,
                status: record.status === 'active' ? 'inactive' : 'active',
              })
            }
          >
            <Button
              size="small"
              icon={record.status === 'active' ? <StopOutlined /> : <CheckOutlined />}
              style={{
                borderRadius: 20,
                border: record.status === 'active' ? '1px solid #ff787540' : '1px solid #52c41a40',
                color: record.status === 'active' ? '#ff4d4f' : '#52c41a',
                background: 'transparent',
              }}
            >
              {record.status === 'active' ? '停用' : '启用'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], [primaryColor, inviteMutation, toggleMutation]);

  return (
    <div style={{ padding: '24px', minHeight: '100vh' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 8,
            color: '#fff',
          }}
        >
          成员管理
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, fontFamily: 'var(--font-body)' }}>
          管理组织成员、查看积分等级、邀请新成员加入
        </p>
      </div>

      {/* Action Bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Input.Search
          placeholder="搜索姓名/手机号"
          allowClear
          prefix={<SearchOutlined />}
          onSearch={(val) => { setKeyword(val); setPage(1); }}
          style={{
            width: 280,
            borderRadius: 20,
            overflow: 'hidden',
          }}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalOpen(true)}
          style={{
            borderRadius: 20,
            background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
            border: 'none',
            boxShadow: `0 4px 12px ${primaryColor}30`,
            fontWeight: 500,
          }}
        >
          添加成员
        </Button>
        <Upload {...uploadProps}>
          <Button
            icon={<UploadOutlined />}
            style={{
              borderRadius: 20,
              borderColor: 'rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.65)',
            }}
          >
            批量导入
          </Button>
        </Upload>
      </div>

      {/* Table Card */}
      <GlassCard hoverable style={{ overflow: 'hidden' }}>
        <Table
          columns={columns}
          dataSource={data?.data?.records || []}
          rowKey="userId"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: 10,
            total: data?.data?.total || 0,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            style: { padding: '16px 24px' },
            itemRender: (_, type, originalElement) => {
              if (type === 'page' || type === 'prev' || type === 'next' || type === 'jump-prev' || type === 'jump-next') {
                return (
                  <div
                    style={{
                      borderRadius: 12,
                      borderColor: 'rgba(255,255,255,0.12)',
                      minWidth: 36,
                      height: 36,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {originalElement}
                  </div>
                );
              }
              return originalElement;
            },
          }}
          style={{
            fontFamily: 'var(--font-body)',
          }}
          rowClassName={() => 'custom-table-row'}
          onRow={(record) => ({
            style: {
              transition: 'all 0.2s ease',
              cursor: 'pointer',
            },
            onMouseEnter: (e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.background = 'transparent';
            },
          })}
          components={{
            header: {
              cell: (props: any) => (
                <th
                  {...props}
                  style={{
                    ...props.style,
                    background: 'rgba(255,255,255,0.04)',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.65)',
                    padding: '16px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}
                />
              ),
            },
            body: {
              row: (props: any) => (
                <tr
                  {...props}
                  style={{
                    ...props.style,
                    borderRadius: 12,
                  }}
                />
              ),
              cell: (props: any) => (
                <td
                  {...props}
                  style={{
                    ...props.style,
                    padding: '16px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}
                />
              ),
            },
          }}
        />
      </GlassCard>

      {/* Add Member Modal */}
      <Modal
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        closeIcon={null}
        centered
        styles={{
          content: {
            borderRadius: 24,
            padding: 0,
            overflow: 'hidden',
          },
        }}
      >
        <div
          style={{
            padding: '24px 32px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 20,
              fontWeight: 600,
              margin: 0,
              color: '#fff',
            }}
          >
            添加成员
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 4, fontFamily: 'var(--font-body)' }}>
            邀请新成员加入您的组织
          </p>
        </div>
        <div style={{ padding: '32px' }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={(values) => createMutation.mutate({ ...values, tenantId })}
          >
            <Form.Item
              name="phone"
              label={
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>手机号</span>
              }
              rules={[{ required: true, message: '请输入手机号' }]}
            >
              <Input
                placeholder="请输入手机号"
                style={{
                  borderRadius: 12,
                  borderColor: 'rgba(255,255,255,0.1)',
                  padding: '10px 16px',
                }}
              />
            </Form.Item>
            <Form.Item
              name="username"
              label={
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>姓名</span>
              }
              rules={[{ required: true, message: '请输入姓名' }]}
            >
              <Input
                placeholder="请输入姓名"
                style={{
                  borderRadius: 12,
                  borderColor: 'rgba(255,255,255,0.1)',
                  padding: '10px 16px',
                }}
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0, marginTop: 32 }}>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={createMutation.isPending}
                  style={{
                    borderRadius: 20,
                    background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
                    border: 'none',
                    boxShadow: `0 4px 12px ${primaryColor}30`,
                    fontWeight: 500,
                    minWidth: 100,
                  }}
                >
                  确定添加
                </Button>
                <Button
                  onClick={() => setCreateModalOpen(false)}
                  style={{
                    borderRadius: 20,
                    borderColor: 'rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.65)',
                    minWidth: 80,
                  }}
                >
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </div>
      </Modal>

      <style>{`
        .custom-table-row td:first-child {
          border-top-left-radius: 12px;
          border-bottom-left-radius: 12px;
        }
        .custom-table-row td:last-child {
          border-top-right-radius: 12px;
          border-bottom-right-radius: 12px;
        }
      `}</style>
    </div>
  );
};

export default Member;
