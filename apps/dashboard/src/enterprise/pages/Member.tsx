import React, { useState } from 'react';
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
import { PlusOutlined, SearchOutlined, UploadOutlined, LinkOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMembers, createMember, toggleMemberStatus, generateInviteLink } from '@/shared/api/members';
import type { Member } from '@/shared/api/members';
import { useAuthStore } from '@/shared/store/authStore';
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

  const columns = [
    { title: '姓名', dataIndex: 'username' },
    { title: '手机号', dataIndex: 'phone' },
    {
      title: '积分',
      dataIndex: 'totalPoints',
      sorter: (a: Member, b: Member) => a.totalPoints - b.totalPoints,
    },
    {
      title: '等级',
      dataIndex: 'level',
      render: (level: number) => <Tag color="blue">{levelLabels[level] || `Lv.${level}`}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '正常' : '停用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      render: (_: unknown, record: Member) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<LinkOutlined />}
            onClick={() => inviteMutation.mutate(record.userId)}
          >
            邀请
          </Button>
          <Popconfirm
            title={`确认${record.status === 'active' ? '停用' : '启用'}该员工？`}
            onConfirm={() =>
              toggleMutation.mutate({
                userId: record.userId,
                status: record.status === 'active' ? 'inactive' : 'active',
              })
            }
          >
            <Button type="link" size="small">
              {record.status === 'active' ? '停用' : '启用'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>员工管理</h2>

      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="搜索姓名/手机号"
          allowClear
          prefix={<SearchOutlined />}
          onSearch={(val) => { setKeyword(val); setPage(1); }}
          style={{ width: 240 }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
          添加员工
        </Button>
        <Upload {...uploadProps}>
          <Button icon={<UploadOutlined />}>批量导入</Button>
        </Upload>
      </Space>

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
        }}
      />

      <Modal
        title="添加员工"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => createMutation.mutate({ ...values, tenantId })}
        >
          <Form.Item name="phone" label="手机号" rules={[{ required: true, message: '请输入手机号' }]}>
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item name="username" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
                确定添加
              </Button>
              <Button onClick={() => setCreateModalOpen(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Member;
