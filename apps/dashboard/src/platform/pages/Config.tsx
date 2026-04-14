import React, { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Tag,
  message,
  Popconfirm,
  Tree,
  Switch,
  Spin,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPackages,
  createPackage,
  updatePackage,
  deletePackage,
  getPackagePermissions,
  updatePackagePermissions,
  getPlatformPermissions,
  PermissionPackage,
  PermissionNode,
} from '@/shared/api/platform';

const Config: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PermissionPackage | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [editingPermsId, setEditingPermsId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [permForm] = Form.useForm();

  const { data: packagesData, isLoading } = useQuery({
    queryKey: ['packages'],
    queryFn: () => getPackages(),
  });

  const { data: platformPermsData } = useQuery({
    queryKey: ['platform-permissions'],
    queryFn: getPlatformPermissions,
  });

  const { data: packagePermsData } = useQuery({
    queryKey: ['package-permissions', editingPermsId],
    queryFn: () => getPackagePermissions(editingPermsId!),
    enabled: !!editingPermsId,
  });

  const createMutation = useMutation({
    mutationFn: createPackage,
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('套餐创建成功');
        setModalOpen(false);
        form.resetFields();
        queryClient.invalidateQueries({ queryKey: ['packages'] });
      } else {
        message.error(res.message || '创建失败');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; description?: string; status?: number } }) =>
      updatePackage(id, data),
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('套餐更新成功');
        setModalOpen(false);
        form.resetFields();
        queryClient.invalidateQueries({ queryKey: ['packages'] });
      } else {
        message.error(res.message || '更新失败');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePackage,
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('套餐删除成功');
        queryClient.invalidateQueries({ queryKey: ['packages'] });
      } else {
        message.error(res.message || '删除失败：已有企业绑定该套餐，请先解绑');
      }
    },
  });

  const updatePermsMutation = useMutation({
    mutationFn: ({ id, permissionCodes }: { id: string; permissionCodes: string[] }) =>
      updatePackagePermissions(id, permissionCodes),
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('权限更新成功');
        setPermModalOpen(false);
        permForm.resetFields();
        queryClient.invalidateQueries({ queryKey: ['packages'] });
      } else {
        message.error(res.message || '权限更新失败');
      }
    },
  });

  const openEdit = (record: PermissionPackage) => {
    setEditingPackage(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      status: record.status === 1,
    });
    setModalOpen(true);
  };

  const openPerms = (record: PermissionPackage) => {
    // Initialize selected perms from package record to avoid empty tree flash
    if ('permissionCodes' in record && Array.isArray((record as { permissionCodes?: string[] }).permissionCodes)) {
      setSelectedPerms((record as { permissionCodes: string[] }).permissionCodes!);
    } else {
      setSelectedPerms([]);
    }
    setEditingPermsId(record.id);
    permForm.setFieldsValue({ name: record.name });
    setPermModalOpen(true);
  };

  // Sync selectedPerms when packagePermsData loads
  React.useEffect(() => {
    if (packagePermsData?.data && Array.isArray(packagePermsData.data)) {
      setSelectedPerms(packagePermsData.data as string[]);
    }
  }, [packagePermsData]);

  const handlePackageSubmit = (values: Record<string, unknown>) => {
    if (editingPackage) {
      updateMutation.mutate({
        id: editingPackage.id,
        data: {
          name: values.name as string,
          description: values.description as string | undefined,
          status: values.status ? 1 : 0,
        },
      });
    } else {
      createMutation.mutate({
        code: values.code as string,
        name: values.name as string,
        description: values.description as string | undefined,
      });
    }
  };

  const handlePermChange = (keys: React.Key[] | { checked: React.Key[]; halfChecked: React.Key[] }) => {
    const checked = Array.isArray(keys) ? keys : keys.checked;
    setSelectedPerms(checked.map(String));
  };

  const buildPermTree = (perms: PermissionNode[]): Array<{
    title: string;
    key: string;
    disabled?: boolean;
    children?: Array<{ title: string; key: string }>;
  }> => {
    if (!perms || !Array.isArray(perms)) return [];
    return perms.map((p) => ({
      title: p.label,
      key: p.key,
      children: p.children ? p.children.map((c) => ({ title: c.label, key: c.key })) : undefined,
    }));
  };

  const permTree = buildPermTree(platformPermsData?.data || []);

  const columns = [
    { title: '套餐名称', dataIndex: 'name' },
    {
      title: '套餐编码',
      dataIndex: 'code',
      render: (v: string) => <Tag>{v}</Tag>,
    },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    {
      title: '权限数量',
      dataIndex: 'permissionCount',
      render: (v: number) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (v: number) => (
        <Tag color={v === 1 ? 'green' : 'red'}>
          {v === 1 ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '绑定企业数',
      dataIndex: 'tenantCount',
      render: (v: number) => v > 0 ? <Tag color="orange">{v}</Tag> : <Tag>{v}</Tag>,
    },
    {
      title: '操作',
      render: (_: unknown, record: PermissionPackage) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Button type="link" size="small" onClick={() => openPerms(record)}>
            配置权限
          </Button>
          <Popconfirm
            title="确认删除该套餐？"
            description={record.tenantCount > 0 ? '该套餐已有企业绑定，删除后将解除绑定关系' : '删除后不可恢复'}
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>套餐管理</h2>

      <Button
        type="primary"
        icon={<PlusOutlined />}
        style={{ marginBottom: 16 }}
        onClick={() => {
          setEditingPackage(null);
          form.resetFields();
          setModalOpen(true);
        }}
      >
        新建套餐
      </Button>

      <Table
        columns={columns}
        dataSource={packagesData?.data?.records || packagesData?.data || []}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: packagesData?.data?.current || 1,
          pageSize: packagesData?.data?.size || 10,
          total: packagesData?.data?.total || 0,
        }}
      />

      {/* Create/Edit Package Modal */}
      <Modal
        title={editingPackage ? '编辑套餐' : '新建套餐'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handlePackageSubmit}>
          <Form.Item
            name="code"
            label="套餐编码"
            rules={[{ required: !editingPackage, message: '请输入套餐编码' }]}
          >
            <Input placeholder="如：standard" disabled={!!editingPackage} />
          </Form.Item>
          <Form.Item
            name="name"
            label="套餐名称"
            rules={[{ required: true, message: '请输入套餐名称' }]}
          >
            <Input placeholder="如：标准版" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="请输入套餐描述" />
          </Form.Item>
          <Form.Item name="status" label="状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                确定
              </Button>
              <Button onClick={() => setModalOpen(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Permission Configuration Modal */}
      <Modal
        title="配置套餐权限"
        open={permModalOpen}
        onCancel={() => {
          setPermModalOpen(false);
          setSelectedPerms([]);
          setEditingPermsId(null);
        }}
        footer={null}
        width={560}
      >
        <Form form={permForm} layout="vertical">
          <Form.Item name="name" label="套餐名称">
            <Input disabled />
          </Form.Item>
          <Form.Item label="权限配置（按模块分组）">
            {platformPermsData?.data ? (
              <Tree
                checkable
                checkedKeys={selectedPerms}
                onCheck={handlePermChange}
                treeData={permTree}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <Spin tip="加载权限树..." />
              </div>
            )}
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button
                type="primary"
                loading={updatePermsMutation.isPending}
                onClick={() => {
                  if (editingPermsId) {
                    updatePermsMutation.mutate({
                      id: editingPermsId,
                      permissionCodes: selectedPerms,
                    });
                  }
                }}
              >
                保存权限
              </Button>
              <Button
                onClick={() => {
                  setPermModalOpen(false);
                  setSelectedPerms([]);
                  setEditingPermsId(null);
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

export default Config;
