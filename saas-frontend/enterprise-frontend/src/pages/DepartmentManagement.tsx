import React, { useState } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, InputNumber, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';

interface Department {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  createdAt: string;
}

const DepartmentManagement: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Department | null>(null);
  const [form] = Form.useForm();

  const columns = [
    {
      title: '部门名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Space>
          <UserOutlined />
          <span style={{ fontWeight: 600 }}>{name}</span>
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '成员数量',
      dataIndex: 'memberCount',
      key: 'memberCount',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_: unknown, record: Department) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该部门吗？"
            onConfirm={() => handleDelete(record)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const openCreateModal = () => {
    setEditingItem(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (record: Department) => {
    setEditingItem(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleDelete = async (record: Department) => {
    message.success('部门已删除');
    queryClient.invalidateQueries({ queryKey: ['departments'] });
  };

  const handleFormFinish = async (values: any) => {
    if (editingItem) {
      message.success('部门已更新');
    } else {
      message.success('部门已创建');
    }
    setModalOpen(false);
    setEditingItem(null);
    form.resetFields();
    queryClient.invalidateQueries({ queryKey: ['departments'] });
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1E293B' }}>
            部门管理
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#94A3B8' }}>
            管理企业的部门和团队
          </p>
        </div>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            新建部门
          </Button>
        </Space>
      </div>

      <Card title="部门列表" bordered={false} style={{ borderRadius: 12 }}>
        <Table
          columns={columns}
          dataSource={[]}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingItem ? '编辑部门' : '新建部门'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingItem(null);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormFinish}
        >
          <Form.Item
            name="name"
            label="部门名称"
            rules={[{ required: true, message: '请输入部门名称' }]}
          >
            <Input placeholder="请输入部门名称" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea rows={4} placeholder="请输入部门描述（选填）" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingItem ? '保存修改' : '创建部门'}
              </Button>
              <Button onClick={() => {
                setModalOpen(false);
                setEditingItem(null);
                form.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DepartmentManagement;
