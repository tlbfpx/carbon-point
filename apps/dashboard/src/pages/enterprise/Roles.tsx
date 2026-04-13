import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Tree,
  message,
  Popconfirm,
  Tag,
  Tooltip,
  Typography,
  Spin,
} from 'antd';
import type { TreeDataNode } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRoles,
  createRole,
  deleteRole,
  getRolePermissions,
  updateRolePermissions,
  getAvailablePermissions,
  getPermissions,
  Role,
  Permission,
} from '@/api/roles';

const ROLE_TYPE_CONFIG: Record<Role['role_type'], { label: string; color: string }> = {
  super_admin: { label: '超管', color: 'blue' },
  operator: { label: '运营', color: 'green' },
  custom: { label: '自定义', color: 'orange' },
};

type ModalMode = 'view' | 'edit' | 'create';

const Roles: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [form] = Form.useForm();

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: getRoles,
  });

  const { data: permsData } = useQuery({
    queryKey: ['permissions'],
    queryFn: getPermissions,
  });

  const { data: availablePermsData } = useQuery({
    queryKey: ['available-permissions'],
    queryFn: getAvailablePermissions,
  });

  const { data: rolePermsData, isLoading: rolePermsLoading } = useQuery({
    queryKey: ['role-permissions', editingRole?.id],
    queryFn: () => getRolePermissions(editingRole!.id),
    enabled: !!editingRole && modalOpen,
  });

  useEffect(() => {
    if (rolePermsData?.data) {
      setSelectedPerms(rolePermsData.data);
    }
  }, [rolePermsData]);

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; permissions: string[] }) => createRole(data),
    onSuccess: (res) => {
      if (res.code === 200) {
        message.success('创建成功');
        closeModal();
        queryClient.invalidateQueries({ queryKey: ['roles'] });
      }
    },
  });

  const updatePermsMutation = useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) =>
      updateRolePermissions(id, permissions),
    onSuccess: (res) => {
      if (res.code === 200) {
        message.success('权限更新成功');
        closeModal();
        queryClient.invalidateQueries({ queryKey: ['roles'] });
        queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      }
    },
    onError: () => {
      message.error('权限超出套餐范围，更新失败');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });

  const openView = (record: Role) => {
    setEditingRole(record);
    setModalMode('view');
    setSelectedPerms([]);
    setModalOpen(true);
  };

  const openEdit = (record: Role) => {
    setEditingRole(record);
    setModalMode('edit');
    setSelectedPerms([]);
    setModalOpen(true);
  };

  const openCreate = () => {
    setEditingRole(null);
    setModalMode('create');
    form.resetFields();
    setSelectedPerms([]);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingRole(null);
    setSelectedPerms([]);
  };

  const handleCreateSubmit = (values: { name: string; description?: string }) => {
    createMutation.mutate({ ...values, permissions: selectedPerms });
  };

  const handleSavePermissions = () => {
    if (!editingRole) return;
    updatePermsMutation.mutate({ id: editingRole.id, permissions: selectedPerms });
  };

  const handlePermChange = (
    keys: React.Key[] | { checked: React.Key[]; halfChecked: React.Key[] },
  ) => {
    const checked = Array.isArray(keys) ? keys : keys.checked;
    setSelectedPerms(checked.map(String));
  };

  const availablePermCodes: string[] = availablePermsData?.data || [];
  const isReadOnly = modalMode === 'view';

  const buildTree = (perms: Permission[]): TreeDataNode[] => {
    return perms.map((p) => {
      const hasChildren = Boolean(p.children && p.children.length > 0);
      const isAvailable = hasChildren || availablePermCodes.includes(p.key);
      const disableCheckbox = isReadOnly || !isAvailable;

      const title =
        !isAvailable && !hasChildren ? (
          <Tooltip title="平台未授权">
            <span style={{ color: '#bbb' }}>{p.label}</span>
          </Tooltip>
        ) : (
          p.label
        );

      return {
        key: p.key,
        title,
        disableCheckbox,
        children: hasChildren ? buildTree(p.children!) : undefined,
      };
    });
  };

  const permTree = buildTree(permsData?.data || []);

  const getModalTitle = () => {
    if (modalMode === 'view') return `查看权限 — ${editingRole?.name}`;
    if (modalMode === 'edit') return `编辑权限 — ${editingRole?.name}`;
    return '新增自定义角色';
  };

  const columns = [
    {
      title: '角色名称',
      dataIndex: 'name',
      render: (name: string, record: Role) =>
        record.role_type === 'super_admin' ? (
          <Tooltip title="平台配置，不可编辑">
            <Typography.Text>{name}</Typography.Text>
          </Tooltip>
        ) : (
          name
        ),
    },
    {
      title: '角色类型',
      dataIndex: 'role_type',
      render: (type: Role['role_type']) => {
        const cfg = ROLE_TYPE_CONFIG[type] ?? { label: type, color: 'default' };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    { title: '角色标识', dataIndex: 'code' },
    { title: '说明', dataIndex: 'description' },
    {
      title: '权限数量',
      render: (_: unknown, record: Role) => record.permissions?.length ?? 0,
    },
    {
      title: '操作',
      render: (_: unknown, record: Role) => {
        if (record.role_type === 'super_admin') {
          return (
            <Tooltip title="平台配置，不可编辑">
              <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openView(record)}>
                查看权限
              </Button>
            </Tooltip>
          );
        }
        return (
          <Space>
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
              编辑权限
            </Button>
            <Popconfirm title="确认删除该角色？" onConfirm={() => deleteMutation.mutate(record.id)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const renderPermTree = () => {
    if (rolePermsLoading && modalMode !== 'create') {
      return <Spin style={{ display: 'block', margin: '24px auto' }} />;
    }
    if (permTree.length === 0) {
      return <p style={{ color: '#999' }}>加载中...</p>;
    }
    return (
      <Tree
        checkable
        checkedKeys={selectedPerms}
        onCheck={isReadOnly ? undefined : handlePermChange}
        treeData={permTree}
        defaultExpandAll
      />
    );
  };

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>角色权限</h2>

      <Button
        type="primary"
        icon={<PlusOutlined />}
        style={{ marginBottom: 16 }}
        onClick={openCreate}
      >
        新增自定义角色
      </Button>

      <Table
        columns={columns}
        dataSource={rolesData?.data || []}
        rowKey="id"
        loading={rolesLoading}
        pagination={false}
      />

      <Modal
        title={getModalTitle()}
        open={modalOpen}
        onCancel={closeModal}
        footer={null}
        width={620}
        destroyOnClose
      >
        {modalMode === 'create' && (
          <Form form={form} layout="vertical" onFinish={handleCreateSubmit}>
            <Form.Item
              name="name"
              label="角色名称"
              rules={[{ required: true, message: '请输入角色名称' }]}
            >
              <Input placeholder="如：数据分析专员" />
            </Form.Item>
            <Form.Item name="description" label="说明">
              <Input.TextArea rows={2} placeholder="请输入角色说明" />
            </Form.Item>
            <Form.Item label="权限配置">
              <p style={{ color: '#888', marginBottom: 8, fontSize: 12 }}>
                仅可选择平台套餐授权范围内的权限（灰色项为平台未授权）。
              </p>
              {renderPermTree()}
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Space>
                <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
                  确定
                </Button>
                <Button onClick={closeModal}>取消</Button>
              </Space>
            </Form.Item>
          </Form>
        )}

        {modalMode === 'edit' && (
          <div>
            <p style={{ color: '#888', marginBottom: 12, fontSize: 12 }}>
              仅可选择平台套餐授权范围内的权限（灰色项为平台未授权）。
            </p>
            {renderPermTree()}
            <div style={{ marginTop: 16 }}>
              <Space>
                <Button
                  type="primary"
                  loading={updatePermsMutation.isPending}
                  onClick={handleSavePermissions}
                >
                  保存权限
                </Button>
                <Button onClick={closeModal}>取消</Button>
              </Space>
            </div>
          </div>
        )}

        {modalMode === 'view' && (
          <div>
            <p style={{ color: '#888', marginBottom: 12, fontSize: 12 }}>
              超管权限由平台套餐定义，不可修改。
            </p>
            {renderPermTree()}
            <div style={{ marginTop: 16 }}>
              <Button onClick={closeModal}>关闭</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Roles;
