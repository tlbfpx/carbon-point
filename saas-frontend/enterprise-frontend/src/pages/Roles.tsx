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
  Card,
  Divider,
} from 'antd';
import type { TreeDataNode } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, UserOutlined, LockOutlined, AppstoreOutlined } from '@ant-design/icons';
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
import { useBranding } from '@/components/BrandingProvider';

const ROLE_TYPE_CONFIG: Record<Role['role_type'], { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  super_admin: {
    label: '超管',
    bg: '#e6f7ff',
    text: '#1890ff',
    icon: <LockOutlined />,
  },
  operator: {
    label: '运营',
    bg: '#f6ffed',
    text: '#52c41a',
    icon: <AppstoreOutlined />,
  },
  custom: {
    label: '自定义',
    bg: '#fff7e6',
    text: '#fa8c16',
    icon: <UserOutlined />,
  },
};

type ModalMode = 'view' | 'edit' | 'create';

const Roles: React.FC = () => {
  const { primaryColor } = useBranding();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [form] = Form.useForm();

  // Digital garden color palette
  const colors = {
    primary: primaryColor,
    warmBorder: '#d4d0c8',
    bgSoft: '#faf8f5',
    textMuted: '#8a857f',
    textHeading: '#2c2825',
    sectionBg: '#f5f3f0',
    treeLine: '#d4d0c8',
  };

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

  // Build permission tree with sections
  const buildTree = (perms: Permission[]): TreeDataNode[] => {
    return perms.map((p) => {
      const hasChildren = Boolean(p.children && p.children.length > 0);
      const isAvailable = hasChildren || availablePermCodes.includes(p.key);
      const disableCheckbox = isReadOnly || !isAvailable;

      const title =
        !isAvailable && !hasChildren ? (
          <Tooltip title="平台未授权">
            <span style={{ color: '#bbb', fontFamily: 'Noto Sans SC, sans-serif' }}>{p.label}</span>
          </Tooltip>
        ) : (
          <span style={{ fontFamily: 'Noto Sans SC, sans-serif', color: colors.textHeading }}>{p.label}</span>
        );

      return {
        key: p.key,
        title,
        disableCheckbox,
        children: hasChildren ? buildTree(p.children!) : undefined,
      };
    });
  };

  // Debug: log the permissions data
  console.log('permsData:', permsData);
  console.log('availablePermsData:', availablePermsData);

  // Handle both direct array and wrapped data formats
  const rawPerms = Array.isArray(permsData) ? permsData : (permsData?.data || permsData || []);
  console.log('rawPerms:', rawPerms);

  const permTree = buildTree(Array.isArray(rawPerms) ? rawPerms : []);

  const getModalTitle = () => {
    if (modalMode === 'view') return `查看权限 — ${editingRole?.name}`;
    if (modalMode === 'edit') return `编辑权限 — ${editingRole?.name}`;
    return '新增自定义角色';
  };

  // Group permissions by module for better organization
  const groupPermissionsByModule = (tree: TreeDataNode[]) => {
    return tree.map((node) => ({
      ...node,
      title: (
        <div
          key={node.key}
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 14,
            fontWeight: 600,
            color: colors.textHeading,
            padding: '8px 12px',
            background: colors.sectionBg,
            borderRadius: 8,
            display: 'inline-block',
          }}
        >
          {node.title as React.ReactNode}
        </div>
      ),
    }));
  };

  const groupedPermTree = groupPermissionsByModule(permTree);

  const columns = [
    {
      title: '角色名称',
      dataIndex: 'name',
      render: (name: string, record: Role) =>
        record.role_type === 'super_admin' ? (
          <Tooltip title="平台配置，不可编辑">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: 15,
                fontWeight: 600,
                color: colors.textHeading,
              }}>
                {name}
              </span>
              <LockOutlined style={{ color: colors.textMuted, fontSize: 12 }} />
            </div>
          </Tooltip>
        ) : (
          <span style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 15,
            fontWeight: 600,
            color: colors.textHeading,
          }}>
            {name}
          </span>
        ),
    },
    {
      title: '角色类型',
      dataIndex: 'role_type',
      render: (type: Role['role_type']) => {
        const cfg = ROLE_TYPE_CONFIG[type] ?? { label: type, bg: '#f5f5f5', text: '#8c8c8c', icon: null };
        return (
          <Tag
            style={{
              margin: 0,
              borderRadius: 20,
              padding: '4px 12px',
              fontFamily: 'Noto Sans SC, sans-serif',
              fontSize: 13,
              backgroundColor: cfg.bg,
              color: cfg.text,
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {cfg.icon}
            {cfg.label}
          </Tag>
        );
      },
    },
    {
      title: '角色标识',
      dataIndex: 'code',
      render: (code: string) => (
        <span style={{ fontFamily: 'Noto Sans SC, sans-serif', color: colors.textMuted }}>{code}</span>
      ),
    },
    {
      title: '说明',
      dataIndex: 'description',
      render: (desc: string) => (
        <span style={{ fontFamily: 'Noto Sans SC, sans-serif', color: colors.textHeading }}>{desc || '-'}</span>
      ),
    },
    {
      title: '权限数量',
      render: (_: unknown, record: Role) => (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            background: colors.sectionBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Outfit, sans-serif',
            fontSize: 13,
            fontWeight: 600,
            color: colors.primary,
          }}
        >
          {record.permissions?.length ?? 0}
        </div>
      ),
    },
    {
      title: '操作',
      render: (_: unknown, record: Role) => {
        if (record.role_type === 'super_admin') {
          return (
            <Tooltip title="平台配置，不可编辑">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => openView(record)}
                style={{
                  borderRadius: 16,
                  fontFamily: 'Noto Sans SC, sans-serif',
                }}
              >
                查看权限
              </Button>
            </Tooltip>
          );
        }
        return (
          <Space size={8}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
              style={{
                borderRadius: 16,
                fontFamily: 'Noto Sans SC, sans-serif',
                color: colors.primary,
              }}
            >
              编辑
            </Button>
            <Popconfirm
              title="确认删除该角色？"
              onConfirm={() => deleteMutation.mutate(record.id)}
              okButtonProps={{ style: { borderRadius: 20 } }}
              cancelButtonProps={{ style: { borderRadius: 20 } }}
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                style={{
                  borderRadius: 16,
                  fontFamily: 'Noto Sans SC, sans-serif',
                }}
              >
                删除
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const renderPermTree = () => {
    console.log('Rendering perm tree - groupedPermTree:', groupedPermTree);
    console.log('Rendering perm tree - selectedPerms:', selectedPerms);

    if (rolePermsLoading && modalMode !== 'create') {
      return <Spin style={{ display: 'block', margin: '24px auto' }} />;
    }

    // Simple debug: show raw data
    if (groupedPermTree.length === 0) {
      return (
        <div>
          <p style={{ color: colors.textMuted, fontFamily: 'Noto Sans SC, sans-serif' }}>
            暂无权限数据
          </p>
          <p style={{ color: colors.textMuted, fontSize: '12px' }}>
            调试信息: permsData = {JSON.stringify(permsData)}
          </p>
        </div>
      );
    }

    return (
      <div style={{ maxHeight: 400, overflowY: 'auto', paddingRight: 8 }}>
        <Tree
          checkable
          checkedKeys={selectedPerms}
          onCheck={isReadOnly ? undefined : handlePermChange}
          treeData={groupedPermTree}
          defaultExpandAll
          fieldNames={{
            title: 'label',
            key: 'key',
            children: 'children'
          }}
          style={{
            fontFamily: 'Noto Sans SC, sans-serif',
          }}
        />
      </div>
    );
  };

  return (
    <div style={{ padding: '0 0 24px 0', fontFamily: 'Noto Sans SC, sans-serif' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 28,
            fontWeight: 700,
            color: colors.textHeading,
            margin: 0,
          }}>
            角色管理
          </h1>
          <p style={{ color: colors.textMuted, marginTop: 8, fontSize: 14 }}>
            管理系统角色及权限配置
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreate}
          style={{
            borderRadius: 20,
            height: 44,
            paddingLeft: 24,
            paddingRight: 24,
            fontFamily: 'Noto Sans SC, sans-serif',
            fontWeight: 500,
          }}
        >
          添加角色
        </Button>
      </div>

      {/* Table Card */}
      <Card
        style={{
          borderRadius: 16,
          border: `1px solid ${colors.warmBorder}`,
          boxShadow: '0 2px 16px rgba(0, 0, 0, 0.04)',
        }}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          columns={columns}
          dataSource={rolesData?.data || []}
          rowKey="id"
          loading={rolesLoading}
          pagination={false}
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
          .digital-garden-row td {
            border-bottom: 1px solid ${colors.warmBorder}40;
          }
        `}</style>
      </Card>

      {/* Modal */}
      <Modal
        title={
          <span style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 20,
            fontWeight: 600,
            color: colors.textHeading,
          }}>
            {getModalTitle()}
          </span>
        }
        open={modalOpen}
        onCancel={closeModal}
        footer={null}
        width={640}
        destroyOnClose
        closeIcon={<span style={{ color: colors.textMuted }}>✕</span>}
        styles={{
          content: {
            borderRadius: 24,
            border: `1px solid ${colors.warmBorder}`,
          },
        }}
      >
        {modalMode === 'create' && (
          <Form form={form} layout="vertical" onFinish={handleCreateSubmit} style={{ marginTop: 24 }}>
            <Form.Item
              name="name"
              label={
                <span style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: 14,
                  fontWeight: 600,
                  color: colors.textHeading,
                }}>
                  角色名称
                </span>
              }
              rules={[{ required: true, message: '请输入角色名称' }]}
            >
              <Input
                placeholder="如：数据分析专员"
                size="large"
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
            <Form.Item
              name="description"
              label={
                <span style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: 14,
                  fontWeight: 600,
                  color: colors.textHeading,
                }}>
                  说明
                </span>
              }
            >
              <Input.TextArea
                rows={2}
                placeholder="请输入角色说明"
                style={{
                  borderRadius: 12,
                  fontFamily: 'Noto Sans SC, sans-serif',
                }}
                styles={{
                  textarea: {
                    borderRadius: 12,
                    border: `1px solid ${colors.warmBorder}`,
                  },
                }}
              />
            </Form.Item>
            <Form.Item
              label={
                <span style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: 14,
                  fontWeight: 600,
                  color: colors.textHeading,
                }}>
                  权限配置
                </span>
              }
            >
              <p style={{ color: colors.textMuted, marginBottom: 12, fontSize: 13, fontFamily: 'Noto Sans SC, sans-serif' }}>
                仅可选择平台套餐授权范围内的权限（灰色项为平台未授权）。
              </p>
              <div
                style={{
                  padding: 16,
                  background: colors.sectionBg,
                  borderRadius: 12,
                  border: `1px solid ${colors.warmBorder}`,
                }}
              >
                {renderPermTree()}
              </div>
            </Form.Item>
            <Form.Item style={{ marginBottom: 0, marginTop: 32 }}>
              <Space size={12}>
                <Button
                  type="primary"
                  size="large"
                  htmlType="submit"
                  loading={createMutation.isPending}
                  style={{
                    borderRadius: 20,
                    height: 44,
                    paddingLeft: 32,
                    paddingRight: 32,
                    fontFamily: 'Noto Sans SC, sans-serif',
                    fontWeight: 500,
                  }}
                >
                  确定
                </Button>
                <Button
                  size="large"
                  onClick={closeModal}
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
        )}

        {modalMode === 'edit' && (
          <div style={{ marginTop: 24 }}>
            <div style={{
              padding: '12px 16px',
              background: colors.sectionBg,
              borderRadius: 8,
              marginBottom: 16,
            }}>
              <p style={{ color: colors.textMuted, margin: 0, fontSize: 13, fontFamily: 'Noto Sans SC, sans-serif' }}>
                仅可选择平台套餐授权范围内的权限（灰色项为平台未授权）。
              </p>
            </div>
            <div
              style={{
                padding: 16,
                background: colors.sectionBg,
                borderRadius: 12,
                border: `1px solid ${colors.warmBorder}`,
              }}
            >
              {renderPermTree()}
            </div>
            <div style={{ marginTop: 24 }}>
              <Space size={12}>
                <Button
                  type="primary"
                  size="large"
                  loading={updatePermsMutation.isPending}
                  onClick={handleSavePermissions}
                  style={{
                    borderRadius: 20,
                    height: 44,
                    paddingLeft: 32,
                    paddingRight: 32,
                    fontFamily: 'Noto Sans SC, sans-serif',
                    fontWeight: 500,
                  }}
                >
                  保存权限
                </Button>
                <Button
                  size="large"
                  onClick={closeModal}
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
            </div>
          </div>
        )}

        {modalMode === 'view' && (
          <div style={{ marginTop: 24 }}>
            <div style={{
              padding: '12px 16px',
              background: colors.sectionBg,
              borderRadius: 8,
              marginBottom: 16,
            }}>
              <p style={{ color: colors.textMuted, margin: 0, fontSize: 13, fontFamily: 'Noto Sans SC, sans-serif' }}>
                超管权限由平台套餐定义，不可修改。
              </p>
            </div>
            <div
              style={{
                padding: 16,
                background: colors.sectionBg,
                borderRadius: 12,
                border: `1px solid ${colors.warmBorder}`,
              }}
            >
              {renderPermTree()}
            </div>
            <div style={{ marginTop: 24 }}>
              <Button
                size="large"
                onClick={closeModal}
                style={{
                  borderRadius: 20,
                  height: 44,
                  paddingLeft: 32,
                  paddingRight: 32,
                  fontFamily: 'Noto Sans SC, sans-serif',
                }}
              >
                关闭
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Roles;
