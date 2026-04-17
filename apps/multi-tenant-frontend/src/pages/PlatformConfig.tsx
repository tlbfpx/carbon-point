import React, { useState, useEffect } from 'react';
import { Card, Form, InputNumber, Switch, Button, Space, message, Table, Tag, Modal, Input, Popconfirm } from 'antd';
import { SaveOutlined, PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { getPlatformConfig, updatePlatformConfig, PlatformConfig } from '@/api/platform';

interface RuleTemplate {
  id: string;
  name: string;
  description?: string;
  slots: { name: string; startTime: string; endTime: string; basePoints: number }[];
}

const FLAG_DESCRIPTIONS: Record<string, { label: string; description: string }> = {
  enable_checkin: { label: '启用打卡功能', description: '允许用户进行爬楼打卡' },
  enable_mall: { label: '启用积分商城', description: '显示积分兑换商城入口' },
  enable_consecutive_bonus: { label: '启用连续打卡奖励', description: '连续打卡可获得额外积分奖励' },
  enable_special_date: { label: '启用特殊日期倍率', description: '节假日等特殊日期积分翻倍' },
  enable_leaderboard: { label: '启用排行榜', description: '显示用户积分排行榜' },
  enable_invite: { label: '启用邀请注册', description: '允许用户邀请新用户注册' },
  require_phone_verify: { label: '注册需手机验证', description: '新用户注册需要完成手机验证' },
  enable_auto_upgrade: { label: '启用自动等级升级', description: '达到门槛自动提升用户等级' },
};

const PlatformConfigPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [templates, setTemplates] = useState<RuleTemplate[]>([]);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
  const [ruleTemplateModalOpen, setRuleTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RuleTemplate | null>(null);
  const [templateForm] = Form.useForm();
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);

  const { data: configData, isLoading: configLoading } = useQuery({
    queryKey: ['platform-config'],
    queryFn: getPlatformConfig,
    onSuccess: (data: any) => {
      if (data?.data) {
        const configs = data.data;
        const flags: Record<string, boolean> = {};
        const templateList: RuleTemplate[] = [];

        configs.forEach((c: PlatformConfig) => {
          if (c.group === 'feature_flag') {
            flags[c.key] = c.value as boolean;
          }
          if (c.group === 'rule_template') {
            try {
              const parsed = JSON.parse(c.value as string);
              templateList.push({ id: c.key, name: parsed.name || c.key, description: parsed.description, slots: parsed.slots || [] });
            } catch {
              templateList.push({ id: c.key, name: c.key, slots: [] });
            }
          }
        });

        setFeatureFlags(flags);
        setTemplates(templateList);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: updatePlatformConfig,
    onSuccess: () => {
      message.success('配置保存成功');
      queryClient.invalidateQueries({ queryKey: ['platform-config'] });
    },
    onError: () => {
      message.error('保存失败，请重试');
    },
  });

  const handleFlagChange = (key: string, value: boolean) => {
    setFeatureFlags((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveFlags = () => {
    const configs = Object.entries(featureFlags).map(([key, value]) => ({
      key,
      value,
      group: 'feature_flag' as const,
      description: FLAG_DESCRIPTIONS[key]?.description,
    }));
    setIsLoading(true);
    updateMutation.mutate(configs, {
      onSettled: () => setIsLoading(false),
    });
  };

  const handleSaveParams = (values: Record<string, unknown>) => {
    const configs = [
      { key: 'defaultDailyCap', value: values.defaultDailyCap as number, group: 'platform_params', description: '默认每日积分上限' },
      { key: 'defaultLevelCoef', value: values.defaultLevelCoef as number, group: 'platform_params', description: '默认等级系数' },
      { key: 'tokenExpireMinutes', value: values.tokenExpireMinutes as number, group: 'platform_params', description: 'AccessToken 有效期（分钟）' },
      { key: 'refreshTokenExpireDays', value: values.refreshTokenExpireDays as number, group: 'platform_params', description: 'RefreshToken 有效期（天）' },
    ];
    setIsLoading(true);
    updateMutation.mutate(configs, {
      onSettled: () => setIsLoading(false),
    });
  };

  const handleSaveTemplate = (values: { name: string; description?: string; slots: RuleTemplate['slots'] }) => {
    const templateId = editingTemplate?.id || `template_${Date.now()}`;
    const templateData = {
      name: values.name,
      description: values.description,
      slots: values.slots,
    };
    const configs = [
      {
        key: templateId,
        value: JSON.stringify(templateData),
        group: 'rule_template',
        description: `规则模板: ${values.name}`,
      },
    ];
    setIsLoading(true);
    updateMutation.mutate(configs, {
      onSuccess: () => {
        message.success(editingTemplate ? '模板更新成功' : '模板创建成功');
        setRuleTemplateModalOpen(false);
        setEditingTemplate(null);
        templateForm.resetFields();
      },
      onSettled: () => setIsLoading(false),
    });
  };

  const handleDeleteTemplate = (template: RuleTemplate) => {
    // Mark as inactive by removing from list (in real implementation, call delete API)
    setTemplates((prev) => prev.filter((t) => t.id !== template.id));
    message.success('模板已删除');
  };

  const openEditTemplate = (template: RuleTemplate) => {
    setEditingTemplate(template);
    templateForm.setFieldsValue({
      name: template.name,
      description: template.description,
      slots: template.slots,
    });
    setRuleTemplateModalOpen(true);
  };

  const openCreateTemplate = () => {
    setEditingTemplate(null);
    templateForm.resetFields();
    setRuleTemplateModalOpen(true);
  };

  const templateColumns = [
    { title: '模板名称', dataIndex: 'name' },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    {
      title: '时段数',
      render: (_: unknown, record: RuleTemplate) => record.slots?.length || 0,
    },
    {
      title: '状态',
      render: () => <Tag color="blue">未激活</Tag>,
    },
    {
      title: '操作',
      width: 180,
      render: (_: unknown, record: RuleTemplate) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditTemplate(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除该模板？" onConfirm={() => handleDeleteTemplate(record)} okText="确认" cancelText="取消">
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Build slot fields for template form
  const SlotFields: React.FC<{ slots: RuleTemplate['slots']; onChange: (slots: RuleTemplate['slots']) => void }> = ({ slots, onChange }) => {
    return (
      <div>
        {slots.map((slot, index) => (
          <Card key={index} size="small" style={{ marginBottom: 8 }} title={`时段 ${index + 1}`}>
            <Space align="start" style={{ width: '100%' }}>
              <Form.Item label="时段名称" style={{ marginBottom: 0 }}>
                <Input
                  value={slot.name}
                  placeholder="如：上午"
                  onChange={(e) => {
                    const newSlots = [...slots];
                    newSlots[index] = { ...slot, name: e.target.value };
                    onChange(newSlots);
                  }}
                  style={{ width: 120 }}
                />
              </Form.Item>
              <Form.Item label="开始时间" style={{ marginBottom: 0 }}>
                <Input
                  value={slot.startTime}
                  placeholder="09:00"
                  onChange={(e) => {
                    const newSlots = [...slots];
                    newSlots[index] = { ...slot, startTime: e.target.value };
                    onChange(newSlots);
                  }}
                  style={{ width: 100 }}
                />
              </Form.Item>
              <Form.Item label="结束时间" style={{ marginBottom: 0 }}>
                <Input
                  value={slot.endTime}
                  placeholder="12:00"
                  onChange={(e) => {
                    const newSlots = [...slots];
                    newSlots[index] = { ...slot, endTime: e.target.value };
                    onChange(newSlots);
                  }}
                  style={{ width: 100 }}
                />
              </Form.Item>
              <Form.Item label="基础积分" style={{ marginBottom: 0 }}>
                <InputNumber
                  value={slot.basePoints}
                  min={0}
                  onChange={(value) => {
                    const newSlots = [...slots];
                    newSlots[index] = { ...slot, basePoints: value || 0 };
                    onChange(newSlots);
                  }}
                  style={{ width: 100 }}
                />
              </Form.Item>
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => onChange(slots.filter((_, i) => i !== index))}
              >
                删除
              </Button>
            </Space>
          </Card>
        ))}
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => onChange([...slots, { name: '', startTime: '', endTime: '', basePoints: 100 }])}
          block
        >
          添加时段
        </Button>
      </div>
    );
  };

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>平台配置</h2>

      <Card title="功能开关" style={{ marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {Object.entries(FLAG_DESCRIPTIONS).map(([key, { label, description }]) => (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: '#f5f5f5',
                borderRadius: 8,
              }}
            >
              <div>
                <div>{label}</div>
                <div style={{ fontSize: 12, color: '#999' }}>{description}</div>
              </div>
              <Switch
                checked={featureFlags[key] ?? false}
                onChange={(checked) => handleFlagChange(key, checked)}
              />
            </div>
          ))}
        </div>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          style={{ marginTop: 16 }}
          onClick={handleSaveFlags}
          loading={isLoading}
        >
          保存功能开关
        </Button>
      </Card>

      <Card
        title="默认规则模板"
        extra={
          <Button type="primary" icon={<PlusOutlined />} size="small" onClick={openCreateTemplate}>
            新建模板
          </Button>
        }
        style={{ marginBottom: 24 }}
      >
        {templates.length > 0 ? (
          <Table
            columns={templateColumns}
            dataSource={templates}
            rowKey="id"
            pagination={false}
            loading={configLoading}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#999' }}>
            暂无规则模板
          </div>
        )}
        <p style={{ color: '#999', fontSize: 12, marginTop: 8 }}>
          提示：新企业开通时将自动应用选定的规则模板，可创建多个模板供选择
        </p>
      </Card>

      <Card title="平台参数">
        <Form
          layout="vertical"
          form={form}
          onFinish={handleSaveParams}
          initialValues={{
            defaultDailyCap: 500,
            defaultLevelCoef: 1.0,
            tokenExpireMinutes: 30,
            refreshTokenExpireDays: 7,
          }}
        >
          <Space direction="vertical">
            <Space>
              <Form.Item name="defaultDailyCap" label="默认每日积分上限">
                <InputNumber min={0} max={10000} style={{ width: 160 }} />
              </Form.Item>
              <Form.Item name="defaultLevelCoef" label="默认等级系数">
                <InputNumber min={0.1} max={5} step={0.1} style={{ width: 160 }} />
              </Form.Item>
            </Space>
            <Space>
              <Form.Item name="tokenExpireMinutes" label="AccessToken 有效期（分钟）">
                <InputNumber min={5} style={{ width: 160 }} />
              </Form.Item>
              <Form.Item name="refreshTokenExpireDays" label="RefreshToken 有效期（天）">
                <InputNumber min={1} style={{ width: 160 }} />
              </Form.Item>
            </Space>
          </Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={() => form.submit()}
            loading={isLoading}
          >
            保存参数
          </Button>
        </Form>
      </Card>

      {/* Rule Template Create/Edit Modal */}
      <Modal
        title={editingTemplate ? '编辑规则模板' : '新建规则模板'}
        open={ruleTemplateModalOpen}
        onCancel={() => {
          setRuleTemplateModalOpen(false);
          setEditingTemplate(null);
          templateForm.resetFields();
        }}
        footer={null}
        width={640}
      >
        <Form
          form={templateForm}
          layout="vertical"
          onFinish={handleSaveTemplate}
          initialValues={{ name: '', description: '', slots: [] }}
        >
          <Form.Item
            name="name"
            label="模板名称"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="如：标准打卡规则" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="模板描述（选填）" />
          </Form.Item>
          <Form.Item label="时段配置">
            <SlotFields slots={templateForm.getFieldValue('slots') || []} onChange={(slots) => templateForm.setFieldValue('slots', slots)} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={isLoading} icon={<CheckOutlined />}>
                {editingTemplate ? '保存修改' : '确认创建'}
              </Button>
              <Button onClick={() => { setRuleTemplateModalOpen(false); setEditingTemplate(null); templateForm.resetFields(); }} icon={<CloseOutlined />}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PlatformConfigPage;