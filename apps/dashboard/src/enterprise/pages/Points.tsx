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
import { PlusOutlined, MinusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { queryPointsAccount, getPointsFlow, grantPoints, deductPoints, PointsAccount } from '@/shared/api/points';
import { useAuthStore } from '@/shared/store/authStore';
import { usePermissions } from '@/shared/hooks/usePermission';

const Points: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.tenantId || '';
  const operatorId = user?.userId || '';
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const [searchedAccount, setSearchedAccount] = useState<PointsAccount | null>(null);
  const [flowPage, setFlowPage] = useState(1);
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [deductModalOpen, setDeductModalOpen] = useState(false);
  const [grantForm] = Form.useForm();
  const [deductForm] = Form.useForm();

  const canAdjust = hasPermission('points:adjust');

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

  const flowColumns = [
    { title: '变动积分', dataIndex: 'points', render: (v: number) => (
      <span style={{ color: v >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 'bold' }}>
        {v >= 0 ? '+' : ''}{v}
      </span>
    )},
    { title: '类型', dataIndex: 'type', render: (type: string) => {
      const map: Record<string, string> = {
        checkin: '打卡奖励',
        exchange: '商品兑换',
        adjust: '手动调整',
        consecutive_bonus: '连续打卡奖励',
        special_date_bonus: '特殊日期奖励',
      };
      return <Tag>{map[type] || type}</Tag>;
    }},
    { title: '说明', dataIndex: 'description' },
    { title: '时间', dataIndex: 'createTime', render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm') },
    { title: '操作人', dataIndex: 'operatorName' },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>积分运营</h2>

      <Card title="用户积分查询" style={{ marginBottom: 24 }}>
        <Space>
          <Input.Search
            placeholder="输入手机号查询"
            allowClear
            onSearch={(val) => searchMutation.mutate(val)}
            style={{ width: 240 }}
            loading={searchMutation.isPending}
          />
        </Space>

        {searchedAccount && (
          <div style={{ marginTop: 24 }}>
            <Space size="large">
              <div>
                <p style={{ color: '#999', fontSize: 12 }}>用户名</p>
                <p style={{ fontSize: 16, fontWeight: 'bold' }}>{searchedAccount.username}</p>
              </div>
              <div>
                <p style={{ color: '#999', fontSize: 12 }}>手机号</p>
                <p style={{ fontSize: 16 }}>{searchedAccount.phone}</p>
              </div>
              <div>
                <p style={{ color: '#999', fontSize: 12 }}>总积分</p>
                <p style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                  {searchedAccount.totalPoints.toLocaleString()}
                </p>
              </div>
              <div>
                <p style={{ color: '#999', fontSize: 12 }}>可用积分</p>
                <p style={{ fontSize: 16 }}>{searchedAccount.availablePoints.toLocaleString()}</p>
              </div>
              <div>
                <p style={{ color: '#999', fontSize: 12 }}>等级</p>
                <p style={{ fontSize: 16 }}>Lv.{searchedAccount.level}</p>
              </div>
              {canAdjust && (
                <Space>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setGrantModalOpen(true)}
                  >
                    发放积分
                  </Button>
                  <Button
                    danger
                    icon={<MinusOutlined />}
                    onClick={() => setDeductModalOpen(true)}
                  >
                    扣减积分
                  </Button>
                </Space>
              )}
            </Space>
          </div>
        )}
      </Card>

      {searchedAccount && (
        <Card title="积分流水">
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
            }}
          />
        </Card>
      )}

      <Modal title="发放积分" open={grantModalOpen} onCancel={() => setGrantModalOpen(false)} footer={null}>
        <Form form={grantForm} layout="vertical" onFinish={(values) => grantMutation.mutate(values)}>
          <Form.Item name="points" label="积分数量" rules={[{ required: true, message: '请输入积分数量' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="说明" rules={[{ required: true, message: '请输入说明' }]}>
            <Input placeholder="如：活动奖励" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={grantMutation.isPending}>确认发放</Button>
              <Button onClick={() => setGrantModalOpen(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="扣减积分" open={deductModalOpen} onCancel={() => setDeductModalOpen(false)} footer={null}>
        <Form form={deductForm} layout="vertical" onFinish={(values) => deductMutation.mutate(values)}>
          <Form.Item name="points" label="积分数量" rules={[{ required: true, message: '请输入积分数量' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="原因" rules={[{ required: true, message: '请输入原因' }]}>
            <Input placeholder="如：违规扣除" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" danger htmlType="submit" loading={deductMutation.isPending}>确认扣减</Button>
              <Button onClick={() => setDeductModalOpen(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Points;
