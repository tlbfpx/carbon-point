import React, { useState } from 'react';
import {
  Card,
  Input,
  Button,
  Space,
  Table,
  Form,
  InputNumber,
  Modal,
  message,
  Tag,
} from 'antd';
import { PlusOutlined, MinusOutlined, SearchOutlined, GiftOutlined, TrophyOutlined, StarOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { queryPointsAccount, getPointsFlow, grantPoints, deductPoints, PointsAccount } from '@/api/points';
import { useAuthStore } from '@/store/authStore';
import { usePermissions } from '@/hooks/usePermission';
import { useBranding } from '@/components/BrandingProvider';

// Status/Type color constants
const STATUS_COLORS = {
  success: { bg: '#f6ffed', text: '#52c41a' },
  warning: { bg: '#fff7e6', text: '#fa8c16' },
  error: { bg: '#fff1f0', text: '#ff4d4f' },
  info: { bg: '#e6f7ff', text: '#1890ff' },
  purple: { bg: '#f9f0ff', text: '#722ed1' },
  pink: { bg: '#fff0f6', text: '#eb2f96' },
  gray: { bg: '#f5f5f5', text: '#8c8c8c' },
} as const;

const TYPE_TAG_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  checkin: { ...STATUS_COLORS.success, label: '打卡奖励' },
  exchange: { ...STATUS_COLORS.warning, label: '商品兑换' },
  adjust: { ...STATUS_COLORS.info, label: '手动调整' },
  consecutive_bonus: { ...STATUS_COLORS.purple, label: '连续打卡奖励' },
  special_date_bonus: { ...STATUS_COLORS.pink, label: '特殊日期奖励' },
};

const Points: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.tenantId || '';
  const operatorId = user?.userId || '';
  const { hasPermission } = usePermissions();
  const { primaryColor } = useBranding();
  const queryClient = useQueryClient();
  const [searchedAccount, setSearchedAccount] = useState<PointsAccount | null>(null);
  const [flowPage, setFlowPage] = useState(1);
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [deductModalOpen, setDeductModalOpen] = useState(false);
  const [grantForm] = Form.useForm();
  const [deductForm] = Form.useForm();

  const canAdjust = hasPermission('points:adjust');

  // Digital garden color palette
  const colors = {
    primary: primaryColor,
    warmBorder: '#d4d0c8',
    bgSoft: '#faf8f5',
    textMuted: '#8a857f',
    textHeading: '#2c2825',
    successBg: '#f6ffed',
    successText: '#52c41a',
    warningBg: '#fff7e6',
    warningText: '#fa8c16',
    errorBg: '#fff1f0',
    errorText: '#ff4d4f',
    infoBg: '#e6f7ff',
    infoText: '#1890ff',
    purpleBg: '#f9f0ff',
    purpleText: '#722ed1',
  };

  const statCards = [
    {
      key: 'total',
      label: '总积分',
      value: searchedAccount?.totalPoints || 0,
      icon: <TrophyOutlined />,
      gradient: 'linear-gradient(135deg, #ffd6e7 0%, #e8f4ff 100%)',
      iconBg: 'linear-gradient(135deg, #ff9c6e 0%, #1890ff 100%)',
      valueColor: '#1890ff',
    },
    {
      key: 'available',
      label: '可用积分',
      value: searchedAccount?.availablePoints || 0,
      icon: <GiftOutlined />,
      gradient: 'linear-gradient(135deg, #e8f4ff 0%, #d4f4e4 100%)',
      iconBg: 'linear-gradient(135deg, #1890ff 0%, #52c41a 100%)',
      valueColor: '#52c41a',
    },
    {
      key: 'level',
      label: '用户等级',
      value: `Lv.${searchedAccount?.level || 1}`,
      icon: <StarOutlined />,
      gradient: 'linear-gradient(135deg, #fff7e6 0%, #f9f0ff 100%)',
      iconBg: 'linear-gradient(135deg, #fa8c16 0%, #722ed1 100%)',
      valueColor: '#722ed1',
    },
  ];

  const { data: flowData, isLoading: flowLoading } = useQuery({
    queryKey: ['points-flow', searchedAccount?.userId, flowPage],
    queryFn: () =>
      getPointsFlow({
        page: flowPage,
        size: 10,
        userId: searchedAccount?.userId,
        tenantId,
      }),
    enabled: !!searchedAccount?.userId,
  });

  const searchMutation = useMutation({
    mutationFn: (phone: string) => queryPointsAccount(phone, tenantId),
    onSuccess: (res: { code: number; message?: string; data?: PointsAccount }) => {
      if (res.code === 200 && res.data) {
        setSearchedAccount(res.data);
      } else {
        message.warning('未找到该用户');
        setSearchedAccount(null);
      }
    },
    onError: () => message.error('查询失败'),
  });

  const grantMutation = useMutation({
    mutationFn: (values: { points: number; description: string }) => {
      if (!searchedAccount) throw new Error('未选择用户');
      return grantPoints({ ...values, userId: searchedAccount.userId, tenantId, operatorId });
    },
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200) {
        message.success('积分发放成功');
        setGrantModalOpen(false);
        grantForm.resetFields();
        queryClient.invalidateQueries({ queryKey: ['points-flow'] });
        if (searchedAccount) {
          setSearchedAccount({ ...searchedAccount, totalPoints: searchedAccount.totalPoints + grantForm.getFieldValue('points') });
        }
      } else {
        message.error(res.message || '发放失败');
      }
    },
    onError: () => message.error('发放失败，请重试'),
  });

  const deductMutation = useMutation({
    mutationFn: (values: { points: number; description: string }) => {
      if (!searchedAccount) throw new Error('未选择用户');
      return deductPoints({ ...values, userId: searchedAccount.userId, tenantId, operatorId });
    },
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200) {
        message.success('积分扣减成功');
        setDeductModalOpen(false);
        deductForm.resetFields();
        queryClient.invalidateQueries({ queryKey: ['points-flow'] });
      } else {
        message.error(res.message || '扣减失败');
      }
    },
    onError: () => message.error('扣减失败，请重试'),
  });

  const getTypeTagStyle = (type: string) => {
    const config = TYPE_TAG_COLORS[type] || { ...STATUS_COLORS.gray, label: type };
    return { backgroundColor: config.bg, color: config.text, label: config.label };
  };

  const flowColumns = [
    {
      title: '变动积分',
      dataIndex: 'points',
      render: (v: number) => (
        <span
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 16,
            fontWeight: 600,
            color: v >= 0 ? colors.successText : colors.errorText,
          }}
        >
          {v >= 0 ? '+' : ''}{v}
        </span>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      render: (type: string) => {
        const style = getTypeTagStyle(type);
        return (
          <Tag
            style={{
              margin: 0,
              borderRadius: 20,
              padding: '4px 12px',
              fontFamily: 'Noto Sans SC, sans-serif',
              fontSize: 13,
              backgroundColor: style.backgroundColor,
              color: style.color,
              border: 'none',
            }}
          >
            {style.label}
          </Tag>
        );
      },
    },
    {
      title: '说明',
      dataIndex: 'description',
      render: (text: string) => (
        <span style={{ color: colors.textHeading, fontFamily: 'Noto Sans SC, sans-serif' }}>{text}</span>
      ),
    },
    {
      title: '时间',
      dataIndex: 'createTime',
      render: (t: string) => (
        <span style={{ color: colors.textMuted, fontFamily: 'Noto Sans SC, sans-serif' }}>
          {dayjs(t).format('YYYY-MM-DD HH:mm')}
        </span>
      ),
    },
    {
      title: '操作人',
      dataIndex: 'operatorName',
      render: (text: string) => (
        <span style={{ color: colors.textHeading, fontFamily: 'Noto Sans SC, sans-serif' }}>{text}</span>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 0 24px 0', fontFamily: 'Noto Sans SC, sans-serif' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: 28,
          fontWeight: 700,
          color: colors.textHeading,
          margin: 0,
        }}>
          积分运营
        </h1>
        <p style={{ color: colors.textMuted, marginTop: 8, fontSize: 14 }}>
          查询用户积分信息并进行手动调整
        </p>
      </div>

      {/* Search Card */}
      <Card
        style={{
          marginBottom: 24,
          borderRadius: 16,
          border: `1px solid ${colors.warmBorder}`,
          boxShadow: '0 2px 16px rgba(0, 0, 0, 0.04)',
        }}
        styles={{ body: { padding: 24 } }}
      >
        <div>
          <label style={{
            display: 'block',
            fontFamily: 'Outfit, sans-serif',
            fontSize: 14,
            fontWeight: 600,
            color: colors.textHeading,
            marginBottom: 12,
          }}>
            查询用户积分
          </label>
          <Input.Search
            placeholder="输入手机号查询用户积分"
            allowClear
            onSearch={(val) => searchMutation.mutate(val)}
            style={{
              width: 320,
              borderRadius: 12,
            }}
            size="large"
            loading={searchMutation.isPending}
            prefix={<SearchOutlined style={{ color: colors.textMuted }} />}
            styles={{
              input: {
                borderRadius: 12,
                border: `1px solid ${colors.warmBorder}`,
                fontFamily: 'Noto Sans SC, sans-serif',
              },
            }}
          />
        </div>

        {searchedAccount && (
          <div style={{ marginTop: 32 }}>
            {/* User Info Section */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              paddingBottom: 24,
              borderBottom: `1px solid ${colors.warmBorder}`,
              marginBottom: 24,
            }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <UserOutlined style={{ fontSize: 24, color: '#fff' }} />
              </div>
              <div>
                <div style={{
                  fontFamily: 'Noto Sans SC, sans-serif',
                  fontSize: 18,
                  fontWeight: 600,
                  color: colors.textHeading,
                }}>
                  {searchedAccount.username}
                </div>
                <div style={{
                  fontFamily: 'Noto Sans SC, sans-serif',
                  fontSize: 14,
                  color: colors.textMuted,
                  marginTop: 4,
                }}>
                  {searchedAccount.phone}
                </div>
              </div>
            </div>

            {/* Stat Cards */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
              {statCards.map((card) => (
                <div
                  key={card.key}
                  style={{
                    flex: 1,
                    padding: '20px 24px',
                    borderRadius: 16,
                    background: card.gradient,
                    border: `1px solid ${colors.warmBorder}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{
                        fontFamily: 'Noto Sans SC, sans-serif',
                        fontSize: 13,
                        color: colors.textMuted,
                        marginBottom: 8,
                      }}>
                        {card.label}
                      </div>
                      <div style={{
                        fontFamily: 'Outfit, sans-serif',
                        fontSize: 28,
                        fontWeight: 700,
                        color: card.valueColor,
                      }}>
                        {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                      </div>
                    </div>
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      background: card.iconBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 20, color: '#fff' }}>{card.icon}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            {canAdjust && (
              <Space size={12}>
                <Button
                  type="primary"
                  size="large"
                  icon={<PlusOutlined />}
                  onClick={() => setGrantModalOpen(true)}
                  style={{
                    borderRadius: 20,
                    height: 44,
                    paddingLeft: 24,
                    paddingRight: 24,
                    fontFamily: 'Noto Sans SC, sans-serif',
                    fontWeight: 500,
                  }}
                >
                  发放积分
                </Button>
                <Button
                  size="large"
                  danger
                  icon={<MinusOutlined />}
                  onClick={() => setDeductModalOpen(true)}
                  style={{
                    borderRadius: 20,
                    height: 44,
                    paddingLeft: 24,
                    paddingRight: 24,
                    fontFamily: 'Noto Sans SC, sans-serif',
                    fontWeight: 500,
                  }}
                >
                  扣减积分
                </Button>
              </Space>
            )}
          </div>
        )}
      </Card>

      {/* Points Flow Table */}
      {searchedAccount && (
        <Card
          title={
            <span style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: 18,
              fontWeight: 600,
              color: colors.textHeading,
            }}>
              积分流水
            </span>
          }
          style={{
            borderRadius: 16,
            border: `1px solid ${colors.warmBorder}`,
            boxShadow: '0 2px 16px rgba(0, 0, 0, 0.04)',
          }}
          styles={{ body: { padding: 24 } }}
        >
          <Table
            columns={flowColumns}
            dataSource={flowData?.data?.records || []}
            rowKey="id"
            loading={flowLoading}
            pagination={{
              current: flowPage,
              pageSize: 10,
              total: flowData?.data?.total || 0,
              onChange: (p) => setFlowPage(p),
              showSizeChanger: false,
              itemRender: (current, type, originalElement) => {
                if (type === 'page' || type === 'prev' || type === 'next') {
                  return React.cloneElement(originalElement as React.ReactElement, {
                    style: {
                      borderRadius: 8,
                      borderColor: colors.warmBorder,
                    },
                  });
                }
                return originalElement;
              },
            }}
            style={{
              fontFamily: 'Noto Sans SC, sans-serif',
            }}
            rowClassName={() => 'digital-garden-row'}
          />
          <style>{`
            .digital-garden-row:hover {
              background: ${colors.bgSoft} !important;
              border-radius: 8px;
            }
            .digital-garden-row {
              transition: all 0.2s ease;
            }
          `}</style>
        </Card>
      )}

      {/* Grant Points Modal */}
      <Modal
        title={
          <span style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 20,
            fontWeight: 600,
            color: colors.textHeading,
          }}>
            发放积分
          </span>
        }
        open={grantModalOpen}
        onCancel={() => setGrantModalOpen(false)}
        footer={null}
        closeIcon={<span style={{ color: colors.textMuted }}>✕</span>}
        styles={{
          content: {
            borderRadius: 24,
            border: `1px solid ${colors.warmBorder}`,
          },
        }}
      >
        <Form form={grantForm} layout="vertical" onFinish={(values) => grantMutation.mutate(values)} style={{ marginTop: 24 }}>
          <Form.Item name="points" label="积分数量" rules={[{ required: true, message: '请输入积分数量' }]}>
            <InputNumber
              min={1}
              size="large"
              style={{
                width: '100%',
                borderRadius: 12,
                fontSize: 18,
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 600,
              }}
              placeholder="请输入发放积分数"
            />
          </Form.Item>
          <Form.Item name="description" label="说明" rules={[{ required: true, message: '请输入说明' }]}>
            <Input
              size="large"
              placeholder="如：活动奖励"
              style={{
                borderRadius: 12,
                fontFamily: 'Noto Sans SC, sans-serif',
              }}
              styles={{
                input: {
                  borderRadius: 12,
                  border: `1px solid ${colors.warmBorder}`,
                },
              }}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, marginTop: 32 }}>
            <Space size={12}>
              <Button
                type="primary"
                size="large"
                htmlType="submit"
                loading={grantMutation.isPending}
                style={{
                  borderRadius: 20,
                  height: 44,
                  paddingLeft: 32,
                  paddingRight: 32,
                  fontFamily: 'Noto Sans SC, sans-serif',
                  fontWeight: 500,
                }}
              >
                确认发放
              </Button>
              <Button
                size="large"
                onClick={() => setGrantModalOpen(false)}
                style={{
                  borderRadius: 20,
                  height: 44,
                  paddingLeft: 32,
                  paddingRight: 32,
                  fontFamily: 'Noto Sans SC, sans-serif',
                }}
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Deduct Points Modal */}
      <Modal
        title={
          <span style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 20,
            fontWeight: 600,
            color: colors.textHeading,
          }}>
            扣减积分
          </span>
        }
        open={deductModalOpen}
        onCancel={() => setDeductModalOpen(false)}
        footer={null}
        closeIcon={<span style={{ color: colors.textMuted }}>✕</span>}
        styles={{
          content: {
            borderRadius: 24,
            border: `1px solid ${colors.warmBorder}`,
          },
        }}
      >
        <Form form={deductForm} layout="vertical" onFinish={(values) => deductMutation.mutate(values)} style={{ marginTop: 24 }}>
          <Form.Item name="points" label="积分数量" rules={[{ required: true, message: '请输入积分数量' }]}>
            <InputNumber
              min={1}
              size="large"
              style={{
                width: '100%',
                borderRadius: 12,
                fontSize: 18,
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 600,
              }}
              placeholder="请输入扣减积分数"
            />
          </Form.Item>
          <Form.Item name="description" label="原因" rules={[{ required: true, message: '请输入原因' }]}>
            <Input
              size="large"
              placeholder="如：违规扣除"
              style={{
                borderRadius: 12,
                fontFamily: 'Noto Sans SC, sans-serif',
              }}
              styles={{
                input: {
                  borderRadius: 12,
                  border: `1px solid ${colors.warmBorder}`,
                },
              }}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, marginTop: 32 }}>
            <Space size={12}>
              <Button
                type="primary"
                danger
                size="large"
                htmlType="submit"
                loading={deductMutation.isPending}
                style={{
                  borderRadius: 20,
                  height: 44,
                  paddingLeft: 32,
                  paddingRight: 32,
                  fontFamily: 'Noto Sans SC, sans-serif',
                  fontWeight: 500,
                }}
              >
                确认扣减
              </Button>
              <Button
                size="large"
                onClick={() => setDeductModalOpen(false)}
                style={{
                  borderRadius: 20,
                  height: 44,
                  paddingLeft: 32,
                  paddingRight: 32,
                  fontFamily: 'Noto Sans SC, sans-serif',
                }}
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Points;
