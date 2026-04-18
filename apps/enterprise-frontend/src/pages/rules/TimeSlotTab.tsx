import React, { useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Space,
  message,
  Popconfirm,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTimeSlotRules,
  createTimeSlotRule,
  updateTimeSlotRule,
  deleteTimeSlotRule,
  TimeSlotRule,
} from '@/api/rules';
import { useBranding } from '@/components/BrandingProvider';
import { GlassCard } from '@carbon-point/design-system';

type TableCellProps = React.HTMLAttributes<HTMLTableCellElement> & { style?: React.CSSProperties };

interface TimeSlotTabProps {
  tenantId: string;
}

const TimeSlotTab: React.FC<TimeSlotTabProps> = ({ tenantId }) => {
  const { primaryColor } = useBranding();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TimeSlotRule | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['rules-timeslots', tenantId],
    queryFn: () => getTimeSlotRules(tenantId),
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<TimeSlotRule, 'id'> & { tenantId: string }) => {
      const res = await createTimeSlotRule({ ...data, tenantId });
      return res as unknown as { code: number; message?: string };
    },
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

  const columns = [
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
          style={{ backgroundColor: enabled ? primaryColor : '#d9d9d9' }}
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
          <Popconfirm title="确认删除？" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button size="small" danger style={{ borderRadius: 20 }}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <GlassCard hoverable style={{ overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px 16px' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openCreateModal()}
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
        <div style={{ padding: '0 24px 24px' }}>
          <Table
            columns={columns}
            dataSource={(data as any)?.records || []}
            rowKey="id"
            loading={isLoading}
            pagination={false}
            style={{ fontFamily: 'var(--font-body)' }}
            onRow={(record) => ({
              style: { transition: 'all 0.2s ease', cursor: 'pointer' },
              onMouseEnter: (e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; },
              onMouseLeave: (e) => { e.currentTarget.style.background = 'transparent'; },
            })}
            components={{
              header: {
                cell: (props: TableCellProps) => (
                  <th
                    {...props}
                    style={{
                      ...props.style,
                      background: 'rgba(255,255,255,0.04)',
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.65)',
                      padding: '16px',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
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
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                  />
                ),
              },
            }}
          />
        </div>
      </GlassCard>

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        closeIcon={null}
        centered
        styles={{ content: { borderRadius: 24, padding: 0, overflow: 'hidden' } }}
      >
        <div style={{ padding: '24px 32px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 600, margin: 0, color: '#fff' }}>
            {editingRule ? '编辑时段' : '新增时段'}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 4, fontFamily: 'var(--font-body)' }}>
            设置打卡时间段和基础积分
          </p>
        </div>
        <div style={{ padding: '32px' }}>
          <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
            <Form.Item name="name" label={<span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>时段名称</span>} rules={[{ required: true, message: '请输入时段名称' }]}>
              <Input placeholder="如：早高峰" style={{ borderRadius: 12, borderColor: 'rgba(255,255,255,0.1)', padding: '10px 16px' }} />
            </Form.Item>
            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item name="startTime" label={<span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>开始时间</span>} rules={[{ required: true, message: '请输入开始时间' }]} style={{ flex: 1 }}>
                <Input placeholder="如：07:00" style={{ borderRadius: 12, borderColor: 'rgba(255,255,255,0.1)', padding: '10px 16px' }} />
              </Form.Item>
              <Form.Item name="endTime" label={<span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>结束时间</span>} rules={[{ required: true, message: '请输入结束时间' }]} style={{ flex: 1 }}>
                <Input placeholder="如：09:00" style={{ borderRadius: 12, borderColor: 'rgba(255,255,255,0.1)', padding: '10px 16px' }} />
              </Form.Item>
            </div>
            <Form.Item name="basePoints" label={<span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>基础积分</span>} rules={[{ required: true, message: '请输入基础积分' }]}>
              <InputNumber min={0} style={{ width: '100%', borderRadius: 12 }} placeholder="基础积分数值" />
            </Form.Item>
            <Form.Item name="enabled" label={<span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>启用状态</span>} valuePropName="checked" initialValue={true}>
              <Switch style={{ backgroundColor: primaryColor }} />
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
                <Button onClick={() => setModalOpen(false)} style={{ borderRadius: 20, borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.65)', minWidth: 80 }}>
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </div>
      </Modal>
    </>
  );
};

export default TimeSlotTab;
