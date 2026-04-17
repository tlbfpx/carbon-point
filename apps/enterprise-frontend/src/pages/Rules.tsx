import React, { useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Switch,
  Space,
  message,
  Popconfirm,
} from 'antd';
import { PlusOutlined, ClockCircleOutlined, TrophyOutlined, StarOutlined, CalendarOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  getTimeSlotRules,
  createTimeSlotRule,
  updateTimeSlotRule,
  deleteTimeSlotRule,
  getConsecutiveRewards,
  updateConsecutiveRewards,
  getSpecialDates,
  createSpecialDate,
  deleteSpecialDate,
  getLevelCoefficients,
  updateLevelCoefficients,
  getDailyCap,
  updateDailyCap,
  TimeSlotRule,
  ConsecutiveReward,
  SpecialDate,
  LevelCoefficient,
  DailyCap,
} from '@/api/rules';
import { useAuthStore } from '@/store/authStore';
import { useBranding } from '@/components/BrandingProvider';

interface TabItem {
  key: string;
  label: string;
  icon: React.ReactNode;
}

type TableCellProps = React.HTMLAttributes<HTMLTableCellElement> & { style?: React.CSSProperties };

const tabs: TabItem[] = [
  { key: 'timeslot', label: '时间段规则', icon: <ClockCircleOutlined /> },
  { key: 'consecutive', label: '连续奖励', icon: <TrophyOutlined /> },
  { key: 'level', label: '等级系数', icon: <StarOutlined /> },
  { key: 'special', label: '特殊日期', icon: <CalendarOutlined /> },
  { key: 'dailycap', label: '每日上限', icon: <ThunderboltOutlined /> },
];

const Rules: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.tenantId || '';
  const queryClient = useQueryClient();
  const { primaryColor } = useBranding();
  const [activeTab, setActiveTab] = useState('timeslot');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TimeSlotRule | null>(null);
  const [form] = Form.useForm();
  const [specialModalOpen, setSpecialModalOpen] = useState(false);
  const [specialForm] = Form.useForm();

  // Time slot rules
  const { data: timeSlotData, isLoading: timeSlotLoading } = useQuery({
    queryKey: ['rules-timeslots', tenantId],
    queryFn: () => getTimeSlotRules(tenantId),
    enabled: !!tenantId && activeTab === 'timeslot',
  });

  // Consecutive rewards
  const { data: consecutiveData } = useQuery({
    queryKey: ['rules-consecutive', tenantId],
    queryFn: () => getConsecutiveRewards(tenantId),
    enabled: !!tenantId && activeTab === 'consecutive',
  });

  // Special dates
  const { data: specialDatesData, isLoading: specialDatesLoading } = useQuery({
    queryKey: ['rules-special-dates', tenantId],
    queryFn: () => getSpecialDates(tenantId),
    enabled: !!tenantId && activeTab === 'special',
  });

  // Level coefficients
  const { data: levelCoefData } = useQuery({
    queryKey: ['rules-level-coef', tenantId],
    queryFn: () => getLevelCoefficients(tenantId),
    enabled: !!tenantId && activeTab === 'level',
  });

  // Daily cap
  const { data: dailyCapData } = useQuery({
    queryKey: ['rules-daily-cap', tenantId],
    queryFn: () => getDailyCap(tenantId),
    enabled: !!tenantId && activeTab === 'dailycap',
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<TimeSlotRule, 'id'> & { tenantId: string }) => createTimeSlotRule({ ...data, tenantId }),
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200) {
        message.success('创建成功');
        setModalOpen(false);
        form.resetFields();
        queryClient.invalidateQueries({ queryKey: ['rules-timeslots'] });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TimeSlotRule> }) => updateTimeSlotRule(id, data),
    onSuccess: () => {
      message.success('更新成功');
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['rules-timeslots'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTimeSlotRule,
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['rules-timeslots'] });
    },
  });

  const handleSwitch = (id: string, enabled: boolean) => {
    updateMutation.mutate({ id, data: { enabled } });
  };

  const consecutiveMutation = useMutation({
    mutationFn: (rewards: ConsecutiveReward[]) => updateConsecutiveRewards(tenantId, rewards),
    onSuccess: () => message.success('保存成功'),
  });

  const specialDateMutation = useMutation({
    mutationFn: (data: Omit<SpecialDate, 'id'> & { tenantId: string }) => createSpecialDate({ ...data, tenantId }),
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries({ queryKey: ['rules-special-dates'] });
    },
  });

  const specialDateDeleteMutation = useMutation({
    mutationFn: deleteSpecialDate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rules-special-dates'] }),
  });

  const levelCoefMutation = useMutation({
    mutationFn: (data: LevelCoefficient[]) => updateLevelCoefficients(tenantId, data),
    onSuccess: () => message.success('保存成功'),
  });

  const dailyCapMutation = useMutation({
    mutationFn: (data: DailyCap) => updateDailyCap(tenantId, data),
    onSuccess: () => message.success('保存成功'),
  });

  const openCreateModal = (record?: TimeSlotRule) => {
    setEditingRule(record || null);
    if (record) {
      form.setFieldsValue(record);
    } else {
      form.resetFields();
    }
    setModalOpen(true);
  };

  const handleFormSubmit = (values: Record<string, unknown>) => {
    // R9: Validate no cross-day time slots (startTime must be < endTime)
    const startTime = values.startTime as string;
    const endTime = values.endTime as string;
    if (startTime && endTime && startTime >= endTime) {
      message.error('时段不支持跨日，开始时间必须早于结束时间');
      return;
    }
    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: values as Partial<TimeSlotRule> });
    } else {
      createMutation.mutate(values as Omit<TimeSlotRule, 'id'> & { tenantId: string });
    }
  };

  const timeSlotColumns = [
    { title: '名称', dataIndex: 'name' },
    { title: '开始时间', dataIndex: 'startTime' },
    { title: '结束时间', dataIndex: 'endTime' },
    {
      title: '基础积分',
      dataIndex: 'basePoints',
      render: (points: number) => (
        <span style={{ fontWeight: 600, color: primaryColor }}>{points}</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      render: (enabled: boolean, record: TimeSlotRule) => (
        <Switch
          checked={enabled}
          onChange={(checked) => handleSwitch(record.id, checked)}
          style={{
            backgroundColor: enabled ? primaryColor : '#d9d9d9',
          }}
        />
      ),
    },
    {
      title: '操作',
      render: (_: unknown, record: TimeSlotRule) => (
        <Space size={8}>
          <Button
            size="small"
            onClick={() => openCreateModal(record)}
            style={{
              borderRadius: 20,
              border: `1px solid ${primaryColor}40`,
              color: primaryColor,
              background: 'transparent',
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除？"
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button
              size="small"
              danger
              style={{
                borderRadius: 20,
              }}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const specialDateColumns = [
    {
      title: '日期',
      dataIndex: 'date',
      render: (date: string) => (
        <span style={{
          fontFamily: 'var(--font-body)',
          background: '#f0efe9',
          padding: '4px 12px',
          borderRadius: 12,
          fontWeight: 500,
        }}>
          {date}
        </span>
      ),
    },
    {
      title: '倍率',
      dataIndex: 'multiplier',
      render: (multiplier: number) => (
        <span style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 600,
          color: primaryColor,
        }}>
          {multiplier}x
        </span>
      ),
    },
    { title: '说明', dataIndex: 'description' },
    {
      title: '操作',
      render: (_: unknown, record: SpecialDate) => (
        <Popconfirm
          title="确认删除？"
          onConfirm={() => specialDateDeleteMutation.mutate(record.id)}
        >
          <Button
            size="small"
            danger
            style={{
              borderRadius: 20,
            }}
          >
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const levelLabels = ['Lv.1 青铜', 'Lv.2 白银', 'Lv.3 黄金', 'Lv.4 铂金', 'Lv.5 钻石'];
  const levelColors = ['#8d6e63', '#78909c', '#fbc02d', '#5c6bc0', '#ec407a'];

  const renderTableCard = (children: React.ReactNode, showAddButton = true, onAddClick?: () => void) => (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}
    >
      {showAddButton && onAddClick && (
        <div style={{ padding: '20px 24px 16px' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onAddClick}
            style={{
              borderRadius: 20,
              background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
              border: 'none',
              boxShadow: `0 4px 12px ${primaryColor}30`,
              fontWeight: 500,
            }}
          >
            添加规则
          </Button>
        </div>
      )}
      <div style={{ padding: showAddButton ? '0 24px 24px' : '24px' }}>
        {children}
      </div>
    </div>
  );

  const renderFormCard = (children: React.ReactNode, title?: string) => (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        padding: '32px',
      }}
    >
      {title && (
        <h3
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 24,
            color: '#333',
          }}
        >
          {title}
        </h3>
      )}
      {children}
    </div>
  );

  return (
    <div style={{ padding: '24px', background: '#faf9f6', minHeight: '100vh' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 8,
            color: '#1a1a1a',
          }}
        >
          规则配置
        </h1>
        <p style={{ color: '#888', fontSize: 14, fontFamily: 'var(--font-body)' }}>
          自定义打卡积分规则、连续奖励和特殊日期倍率
        </p>
      </div>

      {/* Custom Pill-Style Tab Switcher */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 20px',
              borderRadius: 20,
              border: 'none',
              background: activeTab === tab.key
                ? `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`
                : '#fff',
              color: activeTab === tab.key ? '#fff' : '#666',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: activeTab === tab.key ? 600 : 500,
              cursor: 'pointer',
              boxShadow: activeTab === tab.key
                ? `0 4px 12px ${primaryColor}40`
                : '0 2px 8px rgba(0,0,0,0.06)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.key) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.key) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
              }
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'timeslot' && (
          <>
            {renderTableCard(
              <Table
                columns={timeSlotColumns}
                dataSource={timeSlotData?.data || []}
                rowKey="id"
                loading={timeSlotLoading}
                pagination={false}
                style={{ fontFamily: 'var(--font-body)' }}
                onRow={(record) => ({
                  style: {
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                  },
                  onMouseEnter: (e) => {
                    e.currentTarget.style.background = '#faf8f5';
                  },
                  onMouseLeave: (e) => {
                    e.currentTarget.style.background = 'transparent';
                  },
                })}
                components={{
                  header: {
                    cell: (props: TableCellProps) => (
                      <th
                        {...props}
                        style={{
                          ...props.style,
                          background: '#f8f7f4',
                          fontFamily: 'var(--font-heading)',
                          fontWeight: 600,
                          color: '#555',
                          padding: '16px',
                          borderBottom: '1px solid #efece6',
                        }}
                      />
                    ),
                  },
                  body: {
                    cell: (props: TableCellProps) => (
                      <td
                        {...props}
                        style={{
                          ...props.style,
                          padding: '16px',
                          borderBottom: '1px solid #f5f3f0',
                        }}
                      />
                    ),
                  },
                }}
              />,
              true,
              () => openCreateModal()
            )}
          </>
        )}

        {activeTab === 'consecutive' && (
          <>
            {renderFormCard(
              <Form
                layout="vertical"
                initialValues={{
                  rewards: consecutiveData || [
                    { days: 7, bonusPoints: 50 },
                    { days: 14, bonusPoints: 100 },
                    { days: 30, bonusPoints: 200 },
                  ],
                }}
                onFinish={(values) => consecutiveMutation.mutate(values.rewards)}
              >
                <Form.List name="rewards">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...rest }, index) => (
                        <div
                          key={key}
                          style={{
                            background: index % 2 === 0 ? '#faf9f6' : '#fff',
                            padding: '20px',
                            borderRadius: 12,
                            marginBottom: 12,
                            border: '1px solid #f0efe9',
                          }}
                        >
                          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                            <Form.Item
                              {...rest}
                              name={[name, 'days']}
                              label={
                                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                                  连续天数
                                </span>
                              }
                              style={{ marginBottom: 0 }}
                            >
                              <InputNumber
                                min={1}
                                style={{
                                  borderRadius: 12,
                                  minWidth: 120,
                                }}
                                placeholder="天数"
                              />
                            </Form.Item>
                            <Form.Item
                              {...rest}
                              name={[name, 'bonusPoints']}
                              label={
                                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                                  奖励积分
                                </span>
                              }
                              style={{ marginBottom: 0 }}
                            >
                              <InputNumber
                                min={0}
                                style={{
                                  borderRadius: 12,
                                  minWidth: 120,
                                }}
                                placeholder="积分"
                              />
                            </Form.Item>
                            <Button
                              onClick={() => remove(name)}
                              danger
                              style={{
                                borderRadius: 20,
                                height: 38,
                              }}
                            >
                              删除
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        type="dashed"
                        onClick={() => add({ days: 0, bonusPoints: 0 })}
                        icon={<PlusOutlined />}
                        style={{
                          borderRadius: 12,
                          borderColor: '#d4d0c8',
                          color: '#666',
                          marginTop: 8,
                        }}
                      >
                        添加规则
                      </Button>
                    </>
                  )}
                </Form.List>
                <Button
                  type="primary"
                  htmlType="submit"
                  style={{
                    marginTop: 24,
                    borderRadius: 20,
                    background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
                    border: 'none',
                    boxShadow: `0 4px 12px ${primaryColor}30`,
                    fontWeight: 500,
                    minWidth: 100,
                  }}
                >
                  保存
                </Button>
              </Form>,
              '连续打卡奖励配置'
            )}
          </>
        )}

        {activeTab === 'level' && (
          <>
            {renderFormCard(
              <Form
                layout="vertical"
                initialValues={{
                  coefficients: levelCoefData || levelLabels.map((_, i) => ({
                    level: i + 1,
                    coefficient: 1 + i * 0.2,
                  })),
                }}
                onFinish={(values) => levelCoefMutation.mutate(values.coefficients)}
              >
                <Form.List name="coefficients">
                  {(fields) => (
                    <>
                      {fields.map(({ key, name, ...rest }, index) => (
                        <div
                          key={key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 24,
                            padding: '16px 20px',
                            borderRadius: 12,
                            marginBottom: 12,
                            background: '#faf9f6',
                            borderLeft: `4px solid ${levelColors[index]}`,
                          }}
                        >
                          <span
                            style={{
                              width: 120,
                              fontFamily: 'var(--font-heading)',
                              fontWeight: 600,
                              color: levelColors[index],
                            }}
                          >
                            {levelLabels[name]}
                          </span>
                          <Form.Item {...rest} name={[name, 'level']} hidden>
                            <InputNumber />
                          </Form.Item>
                          <Form.Item
                            {...rest}
                            name={[name, 'coefficient']}
                            label={
                              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                                系数
                              </span>
                            }
                            style={{ marginBottom: 0, flex: 1 }}
                          >
                            <InputNumber
                              min={0.1}
                              max={5}
                              step={0.1}
                              style={{ borderRadius: 12, width: '100%' }}
                            />
                          </Form.Item>
                        </div>
                      ))}
                    </>
                  )}
                </Form.List>
                <Button
                  type="primary"
                  htmlType="submit"
                  style={{
                    marginTop: 16,
                    borderRadius: 20,
                    background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
                    border: 'none',
                    boxShadow: `0 4px 12px ${primaryColor}30`,
                    fontWeight: 500,
                    minWidth: 100,
                  }}
                >
                  保存
                </Button>
              </Form>,
              '等级积分系数配置'
            )}
          </>
        )}

        {activeTab === 'special' && (
          <>
            {renderTableCard(
              <Table
                columns={specialDateColumns}
                dataSource={specialDatesData || []}
                rowKey="id"
                loading={specialDatesLoading}
                pagination={false}
                style={{ fontFamily: 'var(--font-body)' }}
                onRow={(record) => ({
                  style: {
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                  },
                  onMouseEnter: (e) => {
                    e.currentTarget.style.background = '#faf8f5';
                  },
                  onMouseLeave: (e) => {
                    e.currentTarget.style.background = 'transparent';
                  },
                })}
                components={{
                  header: {
                    cell: (props: TableCellProps) => (
                      <th
                        {...props}
                        style={{
                          ...props.style,
                          background: '#f8f7f4',
                          fontFamily: 'var(--font-heading)',
                          fontWeight: 600,
                          color: '#555',
                          padding: '16px',
                          borderBottom: '1px solid #efece6',
                        }}
                      />
                    ),
                  },
                  body: {
                    cell: (props: TableCellProps) => (
                      <td
                        {...props}
                        style={{
                          ...props.style,
                          padding: '16px',
                          borderBottom: '1px solid #f5f3f0',
                        }}
                      />
                    ),
                  },
                }}
              />,
              true,
              () => {
                specialForm.resetFields();
                setSpecialModalOpen(true);
              }
            )}
          </>
        )}

        {activeTab === 'dailycap' && (
          <>
            {renderFormCard(
              <Form
                layout="vertical"
                initialValues={{ maxPoints: dailyCapData?.maxPoints || 500 }}
                onFinish={(values) => dailyCapMutation.mutate(values)}
                style={{ maxWidth: 500 }}
              >
                <Form.Item
                  name="maxPoints"
                  label={
                    <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                      每日积分上限
                    </span>
                  }
                  rules={[{ required: true, message: '请输入每日积分上限' }]}
                >
                  <InputNumber
                    min={0}
                    max={10000}
                    style={{
                      width: '100%',
                      borderRadius: 12,
                    }}
                    placeholder="设置每日可获得的积分上限"
                  />
                </Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  style={{
                    borderRadius: 20,
                    background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
                    border: 'none',
                    boxShadow: `0 4px 12px ${primaryColor}30`,
                    fontWeight: 500,
                    minWidth: 100,
                  }}
                >
                  保存
                </Button>
              </Form>,
              '每日积分上限配置'
            )}
          </>
        )}
      </div>

      {/* Time Slot Rule Modal */}
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
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
            borderBottom: '1px solid #f0efe9',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 20,
              fontWeight: 600,
              margin: 0,
              color: '#1a1a1a',
            }}
          >
            {editingRule ? '编辑时段' : '新增时段'}
          </h2>
          <p
            style={{
              color: '#999',
              fontSize: 13,
              marginTop: 4,
              fontFamily: 'var(--font-body)',
            }}
          >
            设置打卡时间段和基础积分
          </p>
        </div>
        <div style={{ padding: '32px' }}>
          <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
            <Form.Item
              name="name"
              label={
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                  时段名称
                </span>
              }
              rules={[{ required: true, message: '请输入时段名称' }]}
            >
              <Input
                placeholder="如：早高峰"
                style={{
                  borderRadius: 12,
                  borderColor: '#d4d0c8',
                  padding: '10px 16px',
                }}
              />
            </Form.Item>
            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item
                name="startTime"
                label={
                  <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                    开始时间
                  </span>
                }
                rules={[{ required: true, message: '请输入开始时间' }]}
                style={{ flex: 1 }}
              >
                <Input
                  placeholder="如：07:00"
                  style={{
                    borderRadius: 12,
                    borderColor: '#d4d0c8',
                    padding: '10px 16px',
                  }}
                />
              </Form.Item>
              <Form.Item
                name="endTime"
                label={
                  <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                    结束时间
                  </span>
                }
                rules={[{ required: true, message: '请输入结束时间' }]}
                style={{ flex: 1 }}
              >
                <Input
                  placeholder="如：09:00"
                  style={{
                    borderRadius: 12,
                    borderColor: '#d4d0c8',
                    padding: '10px 16px',
                  }}
                />
              </Form.Item>
            </div>
            <Form.Item
              name="basePoints"
              label={
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                  基础积分
                </span>
              }
              rules={[{ required: true, message: '请输入基础积分' }]}
            >
              <InputNumber
                min={0}
                style={{
                  width: '100%',
                  borderRadius: 12,
                }}
                placeholder="基础积分数值"
              />
            </Form.Item>
            <Form.Item
              name="enabled"
              label={
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                  启用状态
                </span>
              }
              valuePropName="checked"
              initialValue={true}
            >
              <Switch
                style={{
                  backgroundColor: primaryColor,
                }}
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0, marginTop: 32 }}>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={createMutation.isPending || updateMutation.isPending}
                  style={{
                    borderRadius: 20,
                    background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
                    border: 'none',
                    boxShadow: `0 4px 12px ${primaryColor}30`,
                    fontWeight: 500,
                    minWidth: 100,
                  }}
                >
                  确定
                </Button>
                <Button
                  onClick={() => setModalOpen(false)}
                  style={{
                    borderRadius: 20,
                    borderColor: '#d4d0c8',
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

      {/* Special Date Modal */}
      <Modal
        open={specialModalOpen}
        onCancel={() => setSpecialModalOpen(false)}
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
            borderBottom: '1px solid #f0efe9',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 20,
              fontWeight: 600,
              margin: 0,
              color: '#1a1a1a',
            }}
          >
            添加特殊日期
          </h2>
          <p
            style={{
              color: '#999',
              fontSize: 13,
              marginTop: 4,
              fontFamily: 'var(--font-body)',
            }}
          >
            设置特定日期的积分倍率
          </p>
        </div>
        <div style={{ padding: '32px' }}>
          <Form
            form={specialForm}
            layout="vertical"
            onFinish={(values) => {
              specialDateMutation.mutate({
                tenantId,
                date: (values.date as dayjs.Dayjs).format('YYYY-MM-DD'),
                multiplier: values.multiplier as number,
                description: values.description as string,
              });
              setSpecialModalOpen(false);
            }}
          >
            <Form.Item
              name="date"
              label={
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                  日期
                </span>
              }
              rules={[{ required: true, message: '请选择日期' }]}
            >
              <DatePicker
                style={{
                  width: '100%',
                  borderRadius: 12,
                }}
              />
            </Form.Item>
            <Form.Item
              name="multiplier"
              label={
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                  倍率
                </span>
              }
              rules={[{ required: true, message: '请输入倍率' }]}
              initialValue={2}
            >
              <InputNumber
                min={1}
                max={10}
                style={{
                  width: '100%',
                  borderRadius: 12,
                }}
                placeholder="积分倍数"
              />
            </Form.Item>
            <Form.Item
              name="description"
              label={
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                  说明
                </span>
              }
            >
              <Input
                placeholder="如：国庆节"
                style={{
                  borderRadius: 12,
                  borderColor: '#d4d0c8',
                  padding: '10px 16px',
                }}
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0, marginTop: 32 }}>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={specialDateMutation.isPending}
                  style={{
                    borderRadius: 20,
                    background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
                    border: 'none',
                    boxShadow: `0 4px 12px ${primaryColor}30`,
                    fontWeight: 500,
                    minWidth: 100,
                  }}
                >
                  确定
                </Button>
                <Button
                  onClick={() => setSpecialModalOpen(false)}
                  style={{
                    borderRadius: 20,
                    borderColor: '#d4d0c8',
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
    </div>
  );
};

export default Rules;
