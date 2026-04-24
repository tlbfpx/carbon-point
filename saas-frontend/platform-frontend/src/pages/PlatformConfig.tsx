import React, { useState, useEffect } from 'react';
import { Form, InputNumber, Switch, Button, Space, message, Tag, Tabs, Select, DatePicker, Input } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { getPlatformConfig, updatePlatformConfig, PlatformConfig } from '@/api/platform';

const { TextArea } = Input;

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
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
  const [baseForm] = Form.useForm();
  const [notificationForm] = Form.useForm();
  const [pointsForm] = Form.useForm();
  const [integrationForm] = Form.useForm();
  const [systemForm] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);

  const { data: configData, isLoading: configLoading } = useQuery({
    queryKey: ['platform-config'],
    queryFn: getPlatformConfig,
  });

  useEffect(() => {
    if (configData) {
      const configs = configData as PlatformConfig[];
      const flags: Record<string, boolean> = {};
      const paramsValues: Record<string, unknown> = {};
      const notificationValues: Record<string, unknown> = {};
      const pointsValues: Record<string, unknown> = {};
      const integrationValues: Record<string, unknown> = {};
      const systemValues: Record<string, unknown> = {};

      configs.forEach((c: PlatformConfig) => {
        if (c.group === 'feature_flag') {
          flags[c.key] = c.value as boolean;
        }
        if (c.group === 'platform_params') {
          paramsValues[c.key] = c.value;
        }
        if (c.group === 'notification') {
          notificationValues[c.key] = c.value;
        }
        if (c.group === 'points_rule') {
          pointsValues[c.key] = c.value;
        }
        if (c.group === 'integration') {
          integrationValues[c.key] = c.value;
        }
        if (c.group === 'system') {
          systemValues[c.key] = c.value;
        }
      });

      setFeatureFlags(flags);

      if (Object.keys(paramsValues).length > 0) baseForm.setFieldsValue(paramsValues);
      if (Object.keys(notificationValues).length > 0) notificationForm.setFieldsValue(notificationValues);
      if (Object.keys(pointsValues).length > 0) pointsForm.setFieldsValue(pointsValues);
      if (Object.keys(integrationValues).length > 0) integrationForm.setFieldsValue(integrationValues);
      if (Object.keys(systemValues).length > 0) systemForm.setFieldsValue(systemValues);
    }
  }, [configData]);

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

  const handleSaveNotification = (values: Record<string, unknown>) => {
    const configs = [
      { key: 'notifyEmail', value: values.notifyEmail as string, group: 'notification', description: '通知邮箱' },
      { key: 'enableSms', value: values.enableSms as boolean, group: 'notification', description: '启用短信通知' },
      { key: 'enableEmail', value: values.enableEmail as boolean, group: 'notification', description: '启用邮件通知' },
    ];
    setIsLoading(true);
    updateMutation.mutate(configs, {
      onSuccess: () => message.success('通知设置保存成功'),
      onSettled: () => setIsLoading(false),
    });
  };

  const handleSavePoints = (values: Record<string, unknown>) => {
    const configs = [
      { key: 'pointsPerFloor', value: values.pointsPerFloor as number, group: 'points_rule', description: '每层楼积分' },
      { key: 'pointsPerStep', value: values.pointsPerStep as number, group: 'points_rule', description: '每步积分' },
      { key: 'maxDailyPoints', value: values.maxDailyPoints as number, group: 'points_rule', description: '每日积分上限' },
    ];
    setIsLoading(true);
    updateMutation.mutate(configs, {
      onSuccess: () => message.success('积分规则保存成功'),
      onSettled: () => setIsLoading(false),
    });
  };

  const handleSaveIntegration = (values: Record<string, unknown>) => {
    const configs = [
      { key: 'wechatAppId', value: values.wechatAppId as string, group: 'integration', description: '微信AppId' },
      { key: 'wechatSecret', value: values.wechatSecret as string, group: 'integration', description: '微信Secret' },
      { key: 'apiGatewayUrl', value: values.apiGatewayUrl as string, group: 'integration', description: 'API网关地址' },
    ];
    setIsLoading(true);
    updateMutation.mutate(configs, {
      onSuccess: () => message.success('第三方集成保存成功'),
      onSettled: () => setIsLoading(false),
    });
  };

  const handleSaveSystem = (values: Record<string, unknown>) => {
    const configs = [
      { key: 'systemName', value: values.systemName as string, group: 'system', description: '系统名称' },
      { key: 'maintenanceMode', value: values.maintenanceMode as boolean, group: 'system', description: '维护模式' },
      { key: 'logLevel', value: values.logLevel as string, group: 'system', description: '日志级别' },
      { key: 'systemDescription', value: values.systemDescription as string, group: 'system', description: '系统描述' },
    ];
    if (values.maintenanceStartTime && typeof values.maintenanceStartTime !== 'object' && values.maintenanceStartTime !== null && values.maintenanceStartTime !== undefined) {
      try {
        configs.push({ key: 'maintenanceStartTime', value: dayjs(values.maintenanceStartTime as any).toISOString(), group: 'system', description: '维护开始时间' });
      } catch {
        // ignore invalid date
      }
    }
    if (values.maintenanceEndTime && typeof values.maintenanceEndTime !== 'object' && values.maintenanceEndTime !== null && values.maintenanceEndTime !== undefined) {
      try {
        configs.push({ key: 'maintenanceEndTime', value: dayjs(values.maintenanceEndTime as any).toISOString(), group: 'system', description: '维护结束时间' });
      } catch {
        // ignore invalid date
      }
    }
    setIsLoading(true);
    updateMutation.mutate(configs, {
      onSuccess: () => message.success('系统设置保存成功'),
      onSettled: () => setIsLoading(false),
    });
  };

  const handleResetForm = (formInstance: ReturnType<typeof Form.useForm>[0]) => {
    formInstance.resetFields();
    message.info('已重置表单');
  };

  return (
    <div>
      <h2 style={{ marginBottom: 24, fontSize: 20, fontWeight: 600, color: '#1E293B' }}>平台配置</h2>

      <Tabs defaultActiveKey="basic" items={[
        {
          key: 'basic',
          label: '基础配置',
          children: (
            <Form
              layout="vertical"
              form={baseForm}
              onFinish={handleSaveParams}
              initialValues={{
                defaultDailyCap: 500,
                defaultLevelCoef: 1.0,
                tokenExpireMinutes: 30,
                refreshTokenExpireDays: 7,
              }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
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
                <Space>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={() => baseForm.submit()}
                    loading={isLoading}
                  >
                    保存
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => handleResetForm(baseForm)}
                  >
                    重置
                  </Button>
                </Space>
              </Space>
            </Form>
          ),
        },
        {
          key: 'notification',
          label: '通知设置',
          children: (
            <Form
              layout="vertical"
              form={notificationForm}
              onFinish={handleSaveNotification}
              initialValues={{
                notifyEmail: '',
                enableSms: false,
                enableEmail: true,
              }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Form.Item
                  name="notifyEmail"
                  label="通知邮箱"
                  rules={[
                    { required: true, message: '请输入通知邮箱' },
                    { type: 'email', message: '请输入有效的邮箱地址' },
                  ]}
                >
                  <Input placeholder="请输入通知邮箱" />
                </Form.Item>
                <Form.Item name="enableSms" label="启用短信通知" valuePropName="checked">
                  <Switch />
                </Form.Item>
                <Form.Item name="enableEmail" label="启用邮件通知" valuePropName="checked">
                  <Switch />
                </Form.Item>
                <Space>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={() => notificationForm.submit()}
                    loading={isLoading}
                  >
                    保存
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => handleResetForm(notificationForm)}
                  >
                    重置
                  </Button>
                </Space>
              </Space>
            </Form>
          ),
        },
        {
          key: 'points',
          label: '积分规则',
          children: (
            <Form
              layout="vertical"
              form={pointsForm}
              onFinish={handleSavePoints}
              initialValues={{
                pointsPerFloor: 10,
                pointsPerStep: 0.01,
                maxDailyPoints: 500,
              }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Form.Item name="pointsPerFloor" label="每层楼积分" rules={[{ required: true }]}>
                    <InputNumber min={0} style={{ width: 160 }} />
                  </Form.Item>
                  <Form.Item name="pointsPerStep" label="每步积分" rules={[{ required: true }]}>
                    <InputNumber min={0} step={0.01} style={{ width: 160 }} />
                  </Form.Item>
                </Space>
                <Form.Item name="maxDailyPoints" label="每日积分上限" rules={[{ required: true }]}>
                  <InputNumber min={0} max={10000} style={{ width: 160 }} />
                </Form.Item>
                <Space>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={() => pointsForm.submit()}
                    loading={isLoading}
                  >
                    保存
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => handleResetForm(pointsForm)}
                  >
                    重置
                  </Button>
                </Space>
              </Space>
            </Form>
          ),
        },
        {
          key: 'feature',
          label: '功能开关',
          children: (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 }}>
                {Object.entries(FLAG_DESCRIPTIONS).map(([key, { label, description }]) => (
                  <div
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: '#F8FAFC',
                      borderRadius: 8,
                    }}
                  >
                    <div>
                      <div>{label}</div>
                      <div style={{ fontSize: 12, color: '#94A3B8' }}>{description}</div>
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
                onClick={handleSaveFlags}
                loading={isLoading}
              >
                保存功能开关
              </Button>
            </div>
          ),
        },
        {
          key: 'integration',
          label: '第三方集成',
          children: (
            <Form
              layout="vertical"
              form={integrationForm}
              onFinish={handleSaveIntegration}
              initialValues={{
                wechatAppId: '',
                wechatSecret: '',
                apiGatewayUrl: '',
              }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Form.Item name="wechatAppId" label="微信AppId">
                    <Input placeholder="请输入微信AppId" />
                  </Form.Item>
                  <Form.Item name="wechatSecret" label="微信Secret">
                    <Input.Password placeholder="请输入微信Secret" />
                  </Form.Item>
                </Space>
                <Form.Item
                  name="apiGatewayUrl"
                  label="API网关地址"
                  rules={[{ type: 'url', message: '请输入有效的URL地址' }]}
                >
                  <Input placeholder="https://api.example.com" />
                </Form.Item>
                <Space>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={() => integrationForm.submit()}
                    loading={isLoading}
                  >
                    保存
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => handleResetForm(integrationForm)}
                  >
                    重置
                  </Button>
                </Space>
              </Space>
            </Form>
          ),
        },
        {
          key: 'system',
          label: '系统设置',
          children: (
            <Form
              layout="vertical"
              form={systemForm}
              onFinish={handleSaveSystem}
              initialValues={{
                systemName: '碳积分打卡平台',
                maintenanceMode: false,
                logLevel: 'INFO',
                maintenanceStartTime: null,
                maintenanceEndTime: null,
                systemDescription: '',
              }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Form.Item name="systemName" label="系统名称" rules={[{ required: true }]}>
                  <Input placeholder="请输入系统名称" />
                </Form.Item>
                <Form.Item name="logLevel" label="日志级别">
                  <Select style={{ width: 160 }}>
                    <Select.Option value="DEBUG">DEBUG</Select.Option>
                    <Select.Option value="INFO">INFO</Select.Option>
                    <Select.Option value="WARN">WARN</Select.Option>
                    <Select.Option value="ERROR">ERROR</Select.Option>
                  </Select>
                </Form.Item>
                <Space>
                  <Form.Item name="maintenanceStartTime" label="维护开始时间">
                    <DatePicker showTime style={{ width: 200 }} />
                  </Form.Item>
                  <Form.Item name="maintenanceEndTime" label="维护结束时间">
                    <DatePicker showTime style={{ width: 200 }} />
                  </Form.Item>
                </Space>
                <Form.Item name="maintenanceMode" label="维护模式" valuePropName="checked">
                  <Switch />
                </Form.Item>
                <Form.Item name="systemDescription" label="系统描述">
                  <TextArea rows={4} placeholder="请输入系统描述" />
                </Form.Item>
                <Space>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={() => systemForm.submit()}
                    loading={isLoading}
                  >
                    保存
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => handleResetForm(systemForm)}
                  >
                    重置
                  </Button>
                </Space>
              </Space>
            </Form>
          ),
        },
      ]} />
    </div>
  );
};

export default PlatformConfigPage;