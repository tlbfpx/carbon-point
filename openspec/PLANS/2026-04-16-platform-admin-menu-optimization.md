# 平台管理后台菜单优化实施计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现平台管理后台菜单优化，包括功能配置（产品管理、功能点库）、套餐管理（关联产品及功能点）、系统管理二级菜单、企业联系人信息完善。

**Architecture:** 基于现有 React + TypeScript + Ant Design 前端架构，扩展平台管理后台功能，新增产品、功能点、套餐相关的 API 层和页面组件，更新菜单结构和路由配置。

**Tech Stack:** React 18, TypeScript, Ant Design 5, React Query, Vite

---

## Chunk 1: 菜单结构和路由更新

**Files:**
- Modify: `apps/dashboard/src/PlatformApp.tsx`

### Task 1.1: 更新菜单结构和路由

**Files:**
- Modify: `apps/dashboard/src/PlatformApp.tsx`

- [ ] **Step 1: 更新菜单项配置**

修改 `PlatformMenuItems`，添加二级菜单结构：

```typescript
const PlatformMenuItems: MenuProps['items'] = [
  { key: '/platform/dashboard', icon: <DashboardOutlined />, label: '平台看板' },
  { key: '/platform/enterprises', icon: <TeamOutlined />, label: '企业管理' },
  {
    key: '/platform/system',
    icon: <SafetyOutlined />,
    label: '系统管理',
    children: [
      { key: '/platform/system/users', label: '用户管理' },
      { key: '/platform/system/roles', label: '角色管理' },
      { key: '/platform/system/logs', label: '操作日志' },
      { key: '/platform/system/dict', label: '字典管理' },
    ],
  },
  {
    key: '/platform/features',
    icon: <AppstoreOutlined />,
    label: '功能配置',
    children: [
      { key: '/platform/features/products', label: '产品管理' },
      { key: '/platform/features/features', label: '功能点库' },
    ],
  },
  { key: '/platform/packages', icon: <ShopOutlined />, label: '套餐管理' },
];
```

- [ ] **Step 2: 导入新的图标组件**

在图标导入部分添加：

```typescript
import {
  DashboardOutlined,
  TeamOutlined,
  SettingOutlined,
  SafetyOutlined,
  BellOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  AppstoreOutlined,
  ShopOutlined,
} from '@ant-design/icons';
```

- [ ] **Step 3: 更新路由配置**

在 Routes 部分添加新的路由：

```typescript
<Route path="/platform/dashboard" element={<PlatformDashboard />} />
<Route path="/platform/enterprises" element={<EnterpriseManagement />} />
<Route path="/platform/system/users" element={<SystemUsers />} />
<Route path="/platform/system/roles" element={<SystemRoles />} />
<Route path="/platform/system/logs" element={<OperationLogs />} />
<Route path="/platform/system/dict" element={<DictManagement />} />
<Route path="/platform/features/products" element={<ProductManagement />} />
<Route path="/platform/features/features" element={<FeatureLibrary />} />
<Route path="/platform/packages" element={<PackageManagement />} />
```

- [ ] **Step 4: 添加新页面组件的导入**

在导入部分添加：

```typescript
import ProductManagement from '@/platform/pages/ProductManagement';
import FeatureLibrary from '@/platform/pages/FeatureLibrary';
import SystemUsers from '@/platform/pages/SystemUsers';
import SystemRoles from '@/platform/pages/SystemRoles';
import OperationLogs from '@/platform/pages/OperationLogs';
import DictManagement from '@/platform/pages/DictManagement';
```

- [ ] **Step 5: 运行 TypeScript 检查**

Run: `cd apps/dashboard && npx tsc --noEmit`
Expected: No errors from the changes

- [ ] **Step 6: Commit**

```bash
git add apps/dashboard/src/PlatformApp.tsx
git commit -m "feat: update platform admin menu structure and routes

- Add system management submenus (users, roles, logs, dict)
- Add feature configuration menus (products, feature library)
- Update icon imports and route configuration

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 2: API 层扩展

**Files:**
- Modify: `apps/dashboard/src/shared/api/platform.ts`

### Task 2.1: 添加产品、功能点、套餐相关的 API 类型定义和接口

**Files:**
- Modify: `apps/dashboard/src/shared/api/platform.ts`

- [ ] **Step 1: 添加产品相关类型定义**

在文件末尾添加：

```typescript
// Product and Feature Management APIs
export interface Product {
  id: string;
  code: string;
  name: string;
  category: 'stairs_climbing' | 'walking';
  description?: string;
  status: number;
  sortOrder: number;
  featureCount: number;
  createTime: string;
  updateTime: string;
}

export interface Feature {
  id: string;
  code: string;
  name: string;
  type: 'permission' | 'config';
  valueType?: 'boolean' | 'number' | 'string' | 'json';
  defaultValue?: string;
  description?: string;
  group?: string;
  createTime: string;
  updateTime: string;
}

export interface ProductFeature {
  id: string;
  productId: string;
  featureId: string;
  feature?: Feature;
  configValue?: string;
  isRequired: boolean;
  isEnabled: boolean;
}

export interface PackageProduct {
  id: string;
  packageId: string;
  productId: string;
  product?: Product;
  sortOrder: number;
  features?: PackageProductFeature[];
}

export interface PackageProductFeature {
  id: string;
  packageId: string;
  productId: string;
  featureId: string;
  feature?: Feature;
  configValue?: string;
  isEnabled: boolean;
  isCustomized: boolean;
}

export interface PackageDetail extends PermissionPackage {
  products?: PackageProduct[];
}

// Enterprise interface update
export interface Enterprise {
  id: string;
  name: string;
  contactPhone: string;
  contactName: string;
  contactEmail?: string;
  packageId?: string;
  packageName: string;
  userCount: number;
  status: 'active' | 'inactive';
  createTime: string;
  expireTime?: string;
}
```

- [ ] **Step 2: 添加产品相关 API 函数**

继续添加：

```typescript
// Product APIs
export const getProducts = async (params?: { page?: number; size?: number; category?: string; status?: number; keyword?: string }) => {
  const res = await platformApiClient.get('/products', { params });
  return res.data;
};

export const getProduct = async (id: string) => {
  const res = await platformApiClient.get(`/products/${id}`);
  return res.data;
};

export const createProduct = async (data: {
  code: string;
  name: string;
  category: string;
  description?: string;
  status?: number;
  sortOrder?: number;
}) => {
  const res = await platformApiClient.post('/products', data);
  return res.data;
};

export const updateProduct = async (
  id: string,
  data: { name?: string; description?: string; status?: number; sortOrder?: number }
) => {
  const res = await platformApiClient.put(`/products/${id}`, data);
  return res.data;
};

export const deleteProduct = async (id: string) => {
  const res = await platformApiClient.delete(`/products/${id}`);
  return res.data;
};

// Product Feature APIs
export const getProductFeatures = async (productId: string) => {
  const res = await platformApiClient.get(`/products/${productId}/features`);
  return res.data;
};

export const updateProductFeatures = async (productId: string, features: { featureId: string; configValue?: string; isRequired: boolean; isEnabled: boolean }[]) => {
  const res = await platformApiClient.put(`/products/${productId}/features`, { features });
  return res.data;
};
```

- [ ] **Step 3: 添加功能点库 API 函数**

继续添加：

```typescript
// Feature Library APIs
export const getFeatures = async (params?: { page?: number; size?: number; type?: string; group?: string; keyword?: string }) => {
  const res = await platformApiClient.get('/features', { params });
  return res.data;
};

export const getFeature = async (id: string) => {
  const res = await platformApiClient.get(`/features/${id}`);
  return res.data;
};

export const createFeature = async (data: {
  code: string;
  name: string;
  type: string;
  valueType?: string;
  defaultValue?: string;
  description?: string;
  group?: string;
}) => {
  const res = await platformApiClient.post('/features', data);
  return res.data;
};

export const updateFeature = async (
  id: string,
  data: { name?: string; description?: string; group?: string; defaultValue?: string }
) => {
  const res = await platformApiClient.put(`/features/${id}`, data);
  return res.data;
};

export const deleteFeature = async (id: string) => {
  const res = await platformApiClient.delete(`/features/${id}`);
  return res.data;
};
```

- [ ] **Step 4: 添加扩展的套餐 API 函数**

继续添加：

```typescript
// Extended Package APIs with product-feature support
export const getPackageDetail = async (id: string) => {
  const res = await platformApiClient.get(`/packages/${id}/detail`);
  return res.data;
};

export const updatePackageProducts = async (packageId: string, products: { productId: string; sortOrder?: number }[]) => {
  const res = await platformApiClient.put(`/packages/${packageId}/products`, { products });
  return res.data;
};

export const getPackageProductFeatures = async (packageId: string, productId: string) => {
  const res = await platformApiClient.get(`/packages/${packageId}/products/${productId}/features`);
  return res.data;
};

export const updatePackageProductFeatures = async (
  packageId: string,
  productId: string,
  features: { featureId: string; configValue?: string; isEnabled: boolean }[]
) => {
  const res = await platformApiClient.put(`/packages/${packageId}/products/${productId}/features`, { features });
  return res.data;
};
```

- [ ] **Step 5: 添加系统管理相关 API 函数**

继续添加：

```typescript
// System Management APIs
export interface OperationLog {
  id: string;
  operatorId: string;
  operatorName: string;
  actionType: string;
  description: string;
  requestMethod?: string;
  requestUrl?: string;
  requestParams?: string;
  responseResult?: string;
  ipAddress?: string;
  userAgent?: string;
  executionTime?: number;
  createTime: string;
}

export interface DictItem {
  id: string;
  dictType: string;
  dictCode: string;
  dictName: string;
  status: number;
  sortOrder: number;
  remark?: string;
  createTime: string;
  updateTime: string;
}

export interface PlatformRole {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: number;
  permissionCount: number;
  createTime: string;
  updateTime: string;
}

export const getOperationLogs = async (params: {
  page: number;
  size: number;
  operatorId?: string;
  actionType?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const res = await platformApiClient.get('/operation-logs', { params });
  return res.data;
};

export const getDictItems = async (params?: { page?: number; size?: number; dictType?: string; status?: number; keyword?: string }) => {
  const res = await platformApiClient.get('/dict-items', { params });
  return res.data;
};

export const createDictItem = async (data: {
  dictType: string;
  dictCode: string;
  dictName: string;
  status?: number;
  sortOrder?: number;
  remark?: string;
}) => {
  const res = await platformApiClient.post('/dict-items', data);
  return res.data;
};

export const updateDictItem = async (
  id: string,
  data: { dictName?: string; status?: number; sortOrder?: number; remark?: string }
) => {
  const res = await platformApiClient.put(`/dict-items/${id}`, data);
  return res.data;
};

export const deleteDictItem = async (id: string) => {
  const res = await platformApiClient.delete(`/dict-items/${id}`);
  return res.data;
};

export const getPlatformRoles = async () => {
  const res = await platformApiClient.get('/platform-roles');
  return res.data;
};

export const createPlatformRole = async (data: {
  code: string;
  name: string;
  description?: string;
  permissionCodes?: string[];
}) => {
  const res = await platformApiClient.post('/platform-roles', data);
  return res.data;
};

export const updatePlatformRole = async (
  id: string,
  data: { name?: string; description?: string; status?: number }
) => {
  const res = await platformApiClient.put(`/platform-roles/${id}`, data);
  return res.data;
};

export const deletePlatformRole = async (id: string) => {
  const res = await platformApiClient.delete(`/platform-roles/${id}`);
  return res.data;
};

export const getPlatformRolePermissions = async (id: string) => {
  const res = await platformApiClient.get(`/platform-roles/${id}/permissions`);
  return res.data;
};

export const updatePlatformRolePermissions = async (id: string, permissionCodes: string[]) => {
  const res = await platformApiClient.put(`/platform-roles/${id}/permissions`, { permissionCodes });
  return res.data;
};
```

- [ ] **Step 6: 更新 createEnterprise 接口**

找到 `createEnterprise` 函数，更新它以支持联系人邮箱和套餐选择：

```typescript
export const createEnterprise = async (data: {
  name: string;
  contactPhone: string;
  contactName: string;
  contactEmail?: string;
  packageId?: string;
  packageName?: string;
  createSuperAdmin?: boolean;
  superAdminUsername?: string;
  superAdminPhone?: string;
  superAdminPassword?: string;
}) => {
  const res = await platformApiClient.post('/tenants', data);
  return res.data;
};
```

- [ ] **Step 7: 运行 TypeScript 检查**

Run: `cd apps/dashboard && npx tsc --noEmit`
Expected: No errors from the changes

- [ ] **Step 8: Commit**

```bash
git add apps/dashboard/src/shared/api/platform.ts
git commit -m "feat: extend platform API with product, feature, and system management

- Add Product, Feature, PackageProduct interfaces
- Add product management APIs (CRUD + feature bindings)
- Add feature library APIs (CRUD)
- Add extended package APIs with product-feature support
- Add system management APIs (operation logs, dict items, platform roles)
- Update Enterprise interface with contactEmail
- Update createEnterprise with super admin creation option

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 3: 系统管理页面 - 用户管理

**Files:**
- Create: `apps/dashboard/src/platform/pages/SystemUsers.tsx`

### Task 3.1: 创建系统管理 - 用户管理页面

**Files:**
- Create: `apps/dashboard/src/platform/pages/SystemUsers.tsx`

- [ ] **Step 1: 创建 SystemUsers 组件**

```typescript
import React, { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Tag,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, LockOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  getPlatformAdmins,
  createPlatformAdmin,
  updatePlatformAdmin,
  deletePlatformAdmin,
  PlatformAdmin,
} from '@/shared/api/platform';

const SystemUsers: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<PlatformAdmin | null>(null);
  const [form] = Form.useForm();

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['platform-admins'],
    queryFn: getPlatformAdmins,
  });

  const createMutation = useMutation({
    mutationFn: createPlatformAdmin,
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('创建成功');
        setModalOpen(false);
        form.resetFields();
        queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
      } else {
        message.error(res.message || '创建失败');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: any }) =>
      updatePlatformAdmin(userId, data),
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('更新成功');
        setModalOpen(false);
        setEditingUser(null);
        form.resetFields();
        queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
      } else {
        message.error(res.message || '更新失败');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePlatformAdmin,
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('删除成功');
        queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
      } else {
        message.error(res.message || '删除失败');
      }
    },
  });

  const openCreateModal = () => {
    setEditingUser(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (record: PlatformAdmin) => {
    setEditingUser(record);
    form.setFieldsValue({
      username: record.username,
      phone: record.phone,
      email: record.email,
      roles: record.roles,
      status: record.status,
    });
    setModalOpen(true);
  };

  const handleFormFinish = (values: any) => {
    if (editingUser) {
      updateMutation.mutate({ userId: editingUser.userId, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const columns = [
    { title: '用户名', dataIndex: 'username' },
    { title: '手机号', dataIndex: 'phone' },
    { title: '邮箱', dataIndex: 'email' },
    {
      title: '角色',
      dataIndex: 'roles',
      render: (roles: string[]) => (
        <Space wrap>
          {roles?.map((role) => (
            <Tag key={role} color="blue">{role}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: number) => (
        <Tag color={status === 1 ? 'green' : 'red'}>
          {status === 1 ? '正常' : '停用'}
        </Tag>
      ),
    },
    { title: '最后登录', dataIndex: 'lastLoginTime', render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '-' },
    { title: '创建时间', dataIndex: 'createTime', render: (t: string) => dayjs(t).format('YYYY-MM-DD') },
    {
      title: '操作',
      width: 180,
      render: (_: unknown, record: PlatformAdmin) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Button type="link" size="small" icon={<LockOutlined />}>
            重置密码
          </Button>
          {record.roles?.includes('super_admin') !== true && (
            <Popconfirm title="确认删除？" onConfirm={() => deleteMutation.mutate(record.userId)} okText="确认" cancelText="取消">
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const users = usersData?.data || usersData?.data?.records || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>用户管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          新增用户
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="userId"
        loading={isLoading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingUser ? '编辑用户' : '新增用户'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingUser(null);
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
          {!editingUser && (
            <>
              <Form.Item
                name="username"
                label="用户名"
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input placeholder="请输入用户名" />
              </Form.Item>
              <Form.Item
                name="phone"
                label="手机号"
                rules={[
                  { required: true, message: '请输入手机号' },
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
                ]}
              >
                <Input placeholder="请输入手机号" />
              </Form.Item>
              <Form.Item
                name="password"
                label="密码"
                rules={[{ required: true, message: '请输入密码' }]}
              >
                <Input.Password placeholder="请输入密码" />
              </Form.Item>
            </>
          )}
          {editingUser && (
            <>
              <Form.Item label="用户名">
                <Input value={editingUser.username} disabled />
              </Form.Item>
              <Form.Item label="手机号">
                <Input value={editingUser.phone} disabled />
              </Form.Item>
            </>
          )}
          <Form.Item
            name="email"
            label="邮箱"
            rules={[{ type: 'email', message: '请输入正确的邮箱' }]}
          >
            <Input placeholder="请输入邮箱（选填）" />
          </Form.Item>
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: !editingUser, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              <Select.Option value="super_admin">超级管理员</Select.Option>
              <Select.Option value="admin">管理员</Select.Option>
              <Select.Option value="viewer">查看者</Select.Option>
            </Select>
          </Form.Item>
          {editingUser && (
            <Form.Item
              name="status"
              label="状态"
              rules={[{ required: true, message: '请选择状态' }]}
            >
              <Select placeholder="请选择状态">
                <Select.Option value={1}>正常</Select.Option>
                <Select.Option value={0}>停用</Select.Option>
              </Select>
            </Form.Item>
          )}
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingUser ? '保存修改' : '确认创建'}
              </Button>
              <Button onClick={() => { setModalOpen(false); setEditingUser(null); form.resetFields(); }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SystemUsers;
```

- [ ] **Step 2: 运行 TypeScript 检查**

Run: `cd apps/dashboard && npx tsc --noEmit`
Expected: No errors from the new component

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/src/platform/pages/SystemUsers.tsx
git commit -m "feat: add system users management page

- Complete CRUD for platform admin users
- Form validation for user creation/editing
- Role and status management
- Safe delete (protect super admins)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 4-7: 剩余页面组件

剩余的任务将按照相同的模式创建：

### Chunk 4: 系统管理 - 角色管理、操作日志、字典管理
- Create: `apps/dashboard/src/platform/pages/SystemRoles.tsx`
- Create: `apps/dashboard/src/platform/pages/OperationLogs.tsx`
- Create: `apps/dashboard/src/platform/pages/DictManagement.tsx`

### Chunk 5: 功能配置 - 产品管理
- Create: `apps/dashboard/src/platform/pages/ProductManagement.tsx`

### Chunk 6: 功能配置 - 功能点库
- Create: `apps/dashboard/src/platform/pages/FeatureLibrary.tsx`

### Chunk 7: 套餐管理增强
- Modify: `apps/dashboard/src/platform/pages/PackageManagement.tsx`

### Chunk 8: 企业管理增强
- Modify: `apps/dashboard/src/platform/pages/EnterpriseManagement.tsx`
  - 添加 contactEmail 字段
  - 支持创建企业时同步创建超管

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-16-platform-admin-menu-optimization.md`. Ready to execute?**
