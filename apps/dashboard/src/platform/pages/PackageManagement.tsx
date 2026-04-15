import React, { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Tag, message, Popconfirm, Typography, Tooltip, Transfer } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SettingOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PermissionPackage } from '@/shared/api/platform';
import { getPackages, createPackage, updatePackage, deletePackage, getPackagePermissions, updatePackagePermissions, getPlatformPermissions } from '@/shared/api/platform';

const { Text } = Typography;

const PackageManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [packageModalMode, setPackageModalMode] = useState<'create' | 'edit'>('create');
  const [editingPackage, setEditingPackage] = useState<PermissionPackage | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PermissionPackage | null>(null);
  const [targetKeys, setTargetKeys] = useState<string[]>([]);
  const [allPermissions, setAllPermissions] = useState<{ key: string; title: string }[]>([]);

  const { data: packagesData, isLoading } = useQuery({ queryKey: ['packages', page, pageSize], queryFn: () => getPackages({ page, size: pageSize }) });
  const { data: platformPermsData } = useQuery({ queryKey: ['platform-permissions'], queryFn: getPlatformPermissions, enabled: permModalOpen });

  const createMutation = useMutation({ mutationFn: createPackage, onSuccess: (res: { code: number; message?: string }) => { if (res.code === 200) { message.success('套餐创建成功'); setPackageModalOpen(false); form.resetFields(); queryClient.invalidateQueries({ queryKey: ['packages'] }); } else { message.error(res.message || '创建失败'); } } });
  const updateMutation = useMutation({ mutationFn: ({ id, data }: { id: string; data: { name: string; description?: string } }) => updatePackage(id, data), onSuccess: (res: { code: number; message?: string }) => { if (res.code === 200) { message.success('套餐更新成功'); setPackageModalOpen(false); setEditingPackage(null); form.resetFields(); queryClient.invalidateQueries({ queryKey: ['packages'] }); } else { message.error(res.message || '更新失败'); } } });
  const deleteMutation = useMutation({ mutationFn: deletePackage, onSuccess: (res: { code: number; message?: string }) => { if (res.code === 200) { message.success('套餐已删除'); queryClient.invalidateQueries({ queryKey: ['packages'] }); } else { message.error(res.message || '删除失败'); } } });
  const updatePermMutation = useMutation({ mutationFn: ({ id, permissionCodes }: { id: string; permissionCodes: string[] }) => updatePackagePermissions(id, permissionCodes), onSuccess: (res: { code: number; message?: string }) => { if (res.code === 200) { message.success('权限更新成功'); setPermModalOpen(false); queryClient.invalidateQueries({ queryKey: ['packages'] }); } else { message.error(res.message || '更新失败'); } } });

  const openCreateModal = () => { setPackageModalMode('create'); setEditingPackage(null); form.resetFields(); setPackageModalOpen(true); };
  const openEditModal = (record: PermissionPackage) => { setPackageModalMode('edit'); setEditingPackage(record); form.setFieldsValue({ name: record.name, description: record.description }); setPackageModalOpen(true); };
  const openPermModal = async (record: PermissionPackage) => { setSelectedPackage(record); try { const permData = await getPackagePermissions(record.id); setTargetKeys(permData.data || []); if (platformPermsData?.data) { setAllPermissions(platformPermsData.data.map((p: string) => ({ key: p, title: p }))); } } catch { setTargetKeys([]); } setPermModalOpen(true); };

  const handleFormFinish = (values: { name: string; description?: string }) => { if (packageModalMode === 'create') { createMutation.mutate(values); } else if (editingPackage) { updateMutation.mutate({ id: editingPackage.id, data: values }); } };
  const handlePermSave = () => { if (selectedPackage) { updatePermMutation.mutate({ id: selectedPackage.id, permissionCodes: targetKeys }); } };

  const columns = [
    { title: '套餐编码', dataIndex: 'code', render: (v: string) => <Text code>{v}</Text> },
    { title: '套餐名称', dataIndex: 'name' },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    { title: '状态', dataIndex: 'status', render: (s: number) => <Tag color={s === 1 ? 'green' : 'default'}>{s === 1 ? '启用' : '禁用'}</Tag> },
    { title: '权限数', dataIndex: 'permissionCount' },
    { title: '使用企业', dataIndex: 'tenantCount' },
    { title: '操作', width: 160, render: (_: unknown, record: PermissionPackage) => (
      <Space size="small">
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
        <Button type="link" size="small" icon={<SettingOutlined />} onClick={() => openPermModal(record)} />
        {record.code !== 'free' && <Popconfirm title="确认删除？" onConfirm={() => deleteMutation.mutate(record.id)} okText="确认" cancelText="取消"><Button type="link" size="small" danger icon={<DeleteOutlined />} /></Popconfirm>}
      </Space>
    )},
  ];

  const records = packagesData?.data?.records || packagesData?.data || [];
  const total = packagesData?.data?.total || records.length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}><h2>套餐管理</h2><Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>创建套餐</Button></div>
      <Table columns={columns} dataSource={records} rowKey="id" loading={isLoading} pagination={{ current: page, pageSize, total, showSizeChanger: true, onChange: (p, ps) => { setPage(p); setPageSize(ps); } }} />
      <Modal title={packageModalMode === 'create' ? '创建套餐' : '编辑套餐'} open={packageModalOpen} onCancel={() => { setPackageModalOpen(false); setEditingPackage(null); form.resetFields(); }} footer={null} width={480}>
        <Form form={form} layout="vertical" onFinish={handleFormFinish}>
          {packageModalMode === 'create' && <Form.Item name="code" label="套餐编码" rules={[{ required: true, message: '请输入套餐编码' }]}><Input placeholder="如: pro" /></Form.Item>}
          <Form.Item name="name" label="套餐名称" rules={[{ required: true, message: '请输入套餐名称' }]}><Input placeholder="如: 专业版" /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={3} placeholder="描述（选填）" /></Form.Item>
          <Form.Item style={{ marginBottom: 0 }}><Space><Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>{packageModalMode === 'create' ? '确认创建' : '保存修改'}</Button><Button onClick={() => setPackageModalOpen(false)}>取消</Button></Space></Form.Item>
        </Form>
      </Modal>
      <Modal title={`配置权限 - ${selectedPackage?.name}`} open={permModalOpen} onCancel={() => { setPermModalOpen(false); setSelectedPackage(null); }} onOk={handlePermSave} confirmLoading={updatePermMutation.isPending} width={600}>
        <Transfer dataSource={allPermissions} targetKeys={targetKeys} onChange={setTargetKeys} render={(item) => item.title || item.key} titles={['可选', '已选']} listStyle={{ width: 250, height: 400 }} multiple />
      </Modal>
    </div>
  );
};

export default PackageManagement;
