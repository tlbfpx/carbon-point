import React, { useState } from 'react';
import { Card, Form, InputNumber, Switch, Button, Space, message, Table, Tag } from 'antd';
import { SaveOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPlatformConfig, updatePlatformConfig } from '@/shared/api/platform';
import type { PlatformConfig } from '@/shared/api/platform';

interface RuleTemplate {
  id: string;
  name: string;
  slots: { name: string; startTime: string; endTime: string; basePoints: number }[];
}

const PlatformConfigPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [templates, setTemplates] = useState<RuleTemplate[]>([]);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
  const [form] = Form.useForm();

  const { data: configData, isLoading } = useQuery({
    queryKey: ['platform-config'],
    queryFn: getPlatformConfig,
  });

  const updateMutation = useMutation({
    mutationFn: updatePlatformConfig,
    onSuccess: () => {
      message.success('配置保存成功');
      queryClient.invalidateQueries({ queryKey: ['platform-config'] });
    },
  });

  React.useEffect(() => {
    if (configData?.data) {
      const configs = configData.data;
      const flags: Record<string, boolean> = {};
      const templateList: RuleTemplate[] = [];

      configs.forEach((c: PlatformConfig) => {
        if (c.group === 'feature_flag') {
          flags[c.key] = c.value as boolean;
        }
        if (c.group === 'rule_template') {
          try {
            templateList.push({ id: c.key, name: c.key, slots: JSON.parse(c.value as string) });
          } catch {
            templateList.push({ id: c.key, name: c.key, slots: [] });
          }
        }
      });

      setFeatureFlags(flags);
      setTemplates(templateList);
    }
  }, [configData]);

  const handleFlagChange = (key: string, value: boolean) => {
    setFeatureFlags((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveFlags = () => {
    const configs = Object.entries(featureFlags).map(([key, value]) => ({
      key,
      value,
      group: 'feature_flag',
    }));
    updateMutation.mutate(configs);
  };

  const handleSaveParams = (values: unknown) => {
    const params = values as Record<string, number>;
    const configs = [
      { key: 'defaultDailyCap', value: params.defaultDailyCap, group: 'platform_params' },
      { key: 'defaultLevelCoef', value: params.defaultLevelCoef, group: 'platform_params' },
      { key: 'tokenExpireMinutes', value: params.tokenExpireMinutes, group: 'platform_params' },
      { key: 'refreshTokenExpireDays', value: params.refreshTokenExpireDays, group: 'platform_params' },
    ];
    updateMutation.mutate(configs);
  };

  const flagDescriptions: Record<string, string> = {
    enable_checkin: '启用打卡功能',
    enable_mall: '启用积分商城',
    enable_consecutive_bonus: '启用连续打卡奖励',
    enable_special_date: '启用特殊日期倍率',
    enable_leaderboard: '启用排行榜',
    enable_invite: '启用邀请注册',
    require_phone_verify: '注册需手机验证',
    enable_auto_upgrade: '启用自动等级升级',
  };

  const templateColumns = [
    { title: '模板名称', dataIndex: 'name' },
    {
      title: '时段数量',
      render: (_: unknown, record: RuleTemplate) => record.slots?.length || 0,
    },
    { title: '状态', render: () => <Tag color="blue">未激活</Tag> },
    {
      title: '操作',
      render: () => (
        <Button type="link" size="small">
          编辑
        </Button>
      ),
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>平台配置</h2>

      <Card title="功能开关" style={{ marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {Object.entries(flagDescriptions).map(([key, label]) => (
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
              <span>{label}</span>
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
          loading={updateMutation.isPending}
        >
          保存功能开关
        </Button>
      </Card>

      <Card
        title="默认规则模板"
        extra={
          <Button type="primary" icon={<PlusOutlined />} size="small">
            新建模板
          </Button>
        }
        style={{ marginBottom: 24 }}
      >
        <Table
          columns={templateColumns}
          dataSource={templates}
          rowKey="id"
          pagination={false}
          loading={isLoading}
        />
        <p style={{ color: '#999', fontSize: 12, marginTop: 8 }}>
          提示：新企业开通时将自动应用选定的规则模板
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
          <Space>
            <Form.Item name="defaultDailyCap" label="默认每日积分上限">
              <InputNumber min={0} max={10000} />
            </Form.Item>
            <Form.Item name="defaultLevelCoef" label="默认等级系数">
              <InputNumber min={0.1} max={5} step={0.1} />
            </Form.Item>
          </Space>
          <Space>
            <Form.Item name="tokenExpireMinutes" label="AccessToken 有效期（分钟）">
              <InputNumber min={5} />
            </Form.Item>
            <Form.Item name="refreshTokenExpireDays" label="RefreshToken 有效期（天）">
              <InputNumber min={1} />
            </Form.Item>
          </Space>
          <Button type="primary" icon={<SaveOutlined />} onClick={() => form.submit()} loading={updateMutation.isPending}>
            保存参数
          </Button>
        </Form>
      </Card>
    </div>
  );
};

export default PlatformConfigPage;
