import React, { useState } from 'react';
import {
  Tabs,
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
import { PlusOutlined } from '@ant-design/icons';
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
} from '@/shared/api/rules';
import { useAuthStore } from '@/shared/store/authStore';

const Rules: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.tenantId || '';
  const queryClient = useQueryClient();
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
    { title: '基础积分', dataIndex: 'basePoints' },
    {
      title: '状态',
      dataIndex: 'enabled',
      render: (enabled: boolean, record: TimeSlotRule) => (
        <Switch checked={enabled} onChange={(checked) => handleSwitch(record.id, checked)} />
      ),
    },
    {
      title: '操作',
      render: (_: unknown, record: TimeSlotRule) => (
        <Space>
          <Button type="link" size="small" onClick={() => openCreateModal(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除？" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const levelLabels = ['Lv.1 青铜', 'Lv.2 白银', 'Lv.3 黄金', 'Lv.4 铂金', 'Lv.5 钻石'];

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>规则配置</h2>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'timeslot',
            label: '时段规则',
            children: (
              <div>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  style={{ marginBottom: 16 }}
                  onClick={() => openCreateModal()}
                >
                  新增时段
                </Button>
                <Table
                  columns={timeSlotColumns}
                  dataSource={timeSlotData?.data || []}
                  rowKey="id"
                  loading={timeSlotLoading}
                  pagination={false}
                />
              </div>
            ),
          },
          {
            key: 'consecutive',
            label: '连续打卡',
            children: (
              <div>
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
                        {fields.map(({ key, name, ...rest }) => (
                          <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="start">
                            <Form.Item {...rest} name={[name, 'days']} label="连续天数">
                              <InputNumber min={1} />
                            </Form.Item>
                            <Form.Item {...rest} name={[name, 'bonusPoints']} label="奖励积分">
                              <InputNumber min={0} />
                            </Form.Item>
                            <Button onClick={() => remove(name)} danger>
                              删除
                            </Button>
                          </Space>
                        ))}
                        <Button type="dashed" onClick={() => add({ days: 0, bonusPoints: 0 })}>
                          添加
                        </Button>
                      </>
                    )}
                  </Form.List>
                  <Button type="primary" htmlType="submit" style={{ marginTop: 16 }}>
                    保存
                  </Button>
                </Form>
              </div>
            ),
          },
          {
            key: 'special',
            label: '特殊日期',
            children: (
              <div>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  style={{ marginBottom: 16 }}
                  onClick={() => {
                    specialForm.resetFields();
                    setSpecialModalOpen(true);
                  }}
                >
                  添加特殊日期
                </Button>
                <Table
                  columns={[
                    { title: '日期', dataIndex: 'date' },
                    { title: '倍率', dataIndex: 'multiplier' },
                    { title: '说明', dataIndex: 'description' },
                    {
                      title: '操作',
                      render: (_: unknown, record: SpecialDate) => (
                        <Popconfirm title="确认删除？" onConfirm={() => specialDateDeleteMutation.mutate(record.id)}>
                          <Button type="link" size="small" danger>
                            删除
                          </Button>
                        </Popconfirm>
                      ),
                    },
                  ]}
                  dataSource={specialDatesData || []}
                  rowKey="id"
                  loading={specialDatesLoading}
                  pagination={false}
                />
              </div>
            ),
          },
          {
            key: 'level',
            label: '等级系数',
            children: (
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
                      {fields.map(({ key, name, ...rest }) => (
                        <Space key={key} style={{ display: 'flex', marginBottom: 8 }}>
                          <Form.Item {...rest} name={[name, 'level']} hidden>
                            <InputNumber />
                          </Form.Item>
                          <span style={{ width: 100 }}>{levelLabels[name]}</span>
                          <Form.Item {...rest} name={[name, 'coefficient']} label="系数">
                            <InputNumber min={0.1} max={5} step={0.1} />
                          </Form.Item>
                        </Space>
                      ))}
                    </>
                  )}
                </Form.List>
                <Button type="primary" htmlType="submit">
                  保存
                </Button>
              </Form>
            ),
          },
          {
            key: 'dailycap',
            label: '每日上限',
            children: (
              <Form
                layout="vertical"
                initialValues={{ maxPoints: dailyCapData?.maxPoints || 500 }}
                onFinish={(values) => dailyCapMutation.mutate(values)}
                style={{ maxWidth: 400 }}
              >
                <Form.Item name="maxPoints" label="每日积分上限">
                  <InputNumber min={0} max={10000} style={{ width: '100%' }} />
                </Form.Item>
                <Button type="primary" htmlType="submit">
                  保存
                </Button>
              </Form>
            ),
          },
        ]}
      />

      <Modal
        title={editingRule ? '编辑时段' : '新增时段'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
          <Form.Item name="name" label="时段名称" rules={[{ required: true }]}>
            <Input placeholder="如：早高峰" />
          </Form.Item>
          <Form.Item name="startTime" label="开始时间" rules={[{ required: true }]}>
            <Input placeholder="如：07:00" />
          </Form.Item>
          <Form.Item name="endTime" label="结束时间" rules={[{ required: true }]}>
            <Input placeholder="如：09:00" />
          </Form.Item>
          <Form.Item name="basePoints" label="基础积分" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
                确定
              </Button>
              <Button onClick={() => setModalOpen(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加特殊日期"
        open={specialModalOpen}
        onCancel={() => setSpecialModalOpen(false)}
        footer={null}
      >
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
          <Form.Item name="date" label="日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="multiplier" label="倍率" rules={[{ required: true }]} initialValue={2}>
            <InputNumber min={1} max={10} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input placeholder="如：国庆节" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={specialDateMutation.isPending}>
                确定
              </Button>
              <Button onClick={() => setSpecialModalOpen(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Rules;
