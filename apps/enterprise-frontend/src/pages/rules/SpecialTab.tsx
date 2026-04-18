import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, DatePicker, Space, message, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { getSpecialDates, createSpecialDate, deleteSpecialDate, SpecialDate } from '@/api/rules';
import { useBranding } from '@/components/BrandingProvider';
import { GlassCard } from '@carbon-point/design-system';

type TableCellProps = React.HTMLAttributes<HTMLTableCellElement> & { style?: React.CSSProperties };

interface SpecialTabProps {
  tenantId: string;
}

const SpecialTab: React.FC<SpecialTabProps> = ({ tenantId }) => {
  const { primaryColor } = useBranding();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: specialDatesData, isLoading: specialDatesLoading } = useQuery({
    queryKey: ['rules-special-dates', tenantId],
    queryFn: () => getSpecialDates(tenantId),
    enabled: !!tenantId,
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

  const openCreateModal = () => {
    form.resetFields();
    setModalOpen(true);
  };

  const columns = [
    {
      title: '日期',
      dataIndex: 'date',
      render: (date: string) => (
        <span style={{ fontFamily: 'var(--font-body)', background: '#f0efe9', padding: '4px 12px', borderRadius: 12, fontWeight: 500 }}>
          {date}
        </span>
      ),
    },
    {
      title: '倍率',
      dataIndex: 'multiplier',
      render: (multiplier: number) => (
        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: primaryColor }}>
          {multiplier}x
        </span>
      ),
    },
    { title: '说明', dataIndex: 'description' },
    {
      title: '操作',
      render: (_: unknown, record: SpecialDate) => (
        <Popconfirm title="确认删除？" onConfirm={() => specialDateDeleteMutation.mutate(record.id)}>
          <Button size="small" danger style={{ borderRadius: 20 }}>
            删除
          </Button>
        </Popconfirm>
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
            onClick={openCreateModal}
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
            dataSource={specialDatesData || []}
            rowKey="id"
            loading={specialDatesLoading}
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
                  <th {...props} style={{ ...props.style, background: 'rgba(255,255,255,0.04)', fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'rgba(255,255,255,0.65)', padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }} />
                ),
              },
              body: {
                cell: (props: TableCellProps) => (
                  <td {...props} style={{ ...props.style, padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }} />
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
            添加特殊日期
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 4, fontFamily: 'var(--font-body)' }}>
            设置特定日期的积分倍率
          </p>
        </div>
        <div style={{ padding: '32px' }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={(values) => {
              specialDateMutation.mutate({
                tenantId,
                date: (values.date as dayjs.Dayjs).format('YYYY-MM-DD'),
                multiplier: values.multiplier as number,
                description: values.description as string,
              });
              setModalOpen(false);
            }}
          >
            <Form.Item name="date" label={<span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>日期</span>} rules={[{ required: true, message: '请选择日期' }]}>
              <DatePicker style={{ width: '100%', borderRadius: 12 }} />
            </Form.Item>
            <Form.Item name="multiplier" label={<span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>倍率</span>} rules={[{ required: true, message: '请输入倍率' }]} initialValue={2}>
              <InputNumber min={1} max={10} style={{ width: '100%', borderRadius: 12 }} placeholder="积分倍数" />
            </Form.Item>
            <Form.Item name="description" label={<span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>说明</span>}>
              <Input placeholder="如：国庆节" style={{ borderRadius: 12, borderColor: 'rgba(255,255,255,0.1)', padding: '10px 16px' }} />
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

export default SpecialTab;
