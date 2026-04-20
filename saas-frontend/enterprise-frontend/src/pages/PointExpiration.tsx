import React from 'react';
import {
  Card,
  Form,
  Switch,
  InputNumber,
  Select,
  Button,
  Space,
  message,
  Tooltip,
} from 'antd';
import { ClockCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getExpirationConfig,
  updateExpirationConfig,
  ExpirationConfig,
} from '@/api/points';
import { useBranding } from '@/components/BrandingProvider';

const PointExpiration: React.FC = () => {
  const { primaryColor } = useBranding();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const colors = {
    primary: primaryColor,
    warmBorder: '#d4d0c8',
    bgSoft: '#faf8f5',
    textMuted: '#8a857f',
    textHeading: '#2c2825',
  };

  const { data: config, isLoading } = useQuery({
    queryKey: ['expiration-config'],
    queryFn: getExpirationConfig,
  });

  React.useEffect(() => {
    if (config) {
      form.setFieldsValue(config);
    }
  }, [config, form]);

  const updateMutation = useMutation({
    mutationFn: (values: ExpirationConfig) => updateExpirationConfig(values),
    onSuccess: () => {
      message.success('过期配置更新成功');
      queryClient.invalidateQueries({ queryKey: ['expiration-config'] });
    },
    onError: () => message.error('更新失败，请重试'),
  });

  return (
    <div style={{ padding: '0 0 24px 0', fontFamily: 'Noto Sans SC, sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: 28,
          fontWeight: 700,
          color: colors.textHeading,
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <ClockCircleOutlined style={{ color: colors.primary }} />
          积分过期配置
        </h1>
        <p style={{ color: colors.textMuted, marginTop: 8, fontSize: 14 }}>
          配置积分过期策略，支持自动清零、提前通知和用户手动延期
        </p>
      </div>

      <Card
        loading={isLoading}
        style={{
          borderRadius: 16,
          border: `1px solid ${colors.warmBorder}`,
          boxShadow: '0 2px 16px rgba(0, 0, 0, 0.04)',
          maxWidth: 640,
        }}
        styles={{ body: { padding: 32 } }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => updateMutation.mutate(values as ExpirationConfig)}
          initialValues={{
            enabled: false,
            expirationMonths: 12,
            preNoticeDays: 30,
            manualExtensionEnabled: false,
            extensionMonths: 3,
            handling: 'forfeit',
          }}
        >
          <Form.Item
            name="enabled"
            label="启用积分过期"
            valuePropName="checked"
          >
            <Switch
              checkedChildren="开启"
              unCheckedChildren="关闭"
              style={{ background: form.getFieldValue('enabled') ? colors.primary : undefined }}
            />
          </Form.Item>

          <Form.Item
            name="expirationMonths"
            label={
              <Space>
                过期周期
                <Tooltip title="用户最后一次活跃后，积分在指定月份后过期清零">
                  <InfoCircleOutlined style={{ color: colors.textMuted }} />
                </Tooltip>
              </Space>
            }
          >
            <Select style={{ width: 200 }}>
              <Select.Option value={6}>6 个月</Select.Option>
              <Select.Option value={12}>12 个月</Select.Option>
              <Select.Option value={24}>24 个月</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="preNoticeDays"
            label={
              <Space>
                提前通知天数
                <Tooltip title="在积分过期前多少天向用户发送过期提醒通知">
                  <InfoCircleOutlined style={{ color: colors.textMuted }} />
                </Tooltip>
              </Space>
            }
          >
            <InputNumber min={1} max={90} style={{ width: 200 }} addonAfter="天" />
          </Form.Item>

          <Form.Item
            name="manualExtensionEnabled"
            label="允许用户手动延期"
            valuePropName="checked"
          >
            <Switch
              checkedChildren="允许"
              unCheckedChildren="禁止"
              style={{ background: form.getFieldValue('manualExtensionEnabled') ? colors.primary : undefined }}
            />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) => prev.manualExtensionEnabled !== cur.manualExtensionEnabled}
          >
            {({ getFieldValue }) =>
              getFieldValue('manualExtensionEnabled') ? (
                <Form.Item
                  name="extensionMonths"
                  label={
                    <Space>
                      延期时长
                      <Tooltip title="用户手动延期时，过期时间向后延长的月数。每用户仅可延期一次。">
                        <InfoCircleOutlined style={{ color: colors.textMuted }} />
                      </Tooltip>
                    </Space>
                  }
                >
                  <InputNumber min={1} max={12} style={{ width: 200 }} addonAfter="个月" />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item
            name="handling"
            label="过期处理方式"
          >
            <Select style={{ width: 200 }}>
              <Select.Option value="forfeit">直接清零</Select.Option>
              <Select.Option value="donate">捐赠公益</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginTop: 32, marginBottom: 0 }}>
            <Space size={12}>
              <Button
                type="primary"
                size="large"
                htmlType="submit"
                loading={updateMutation.isPending}
                style={{
                  borderRadius: 20,
                  height: 44,
                  paddingLeft: 32,
                  paddingRight: 32,
                  fontWeight: 500,
                }}
              >
                保存配置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default PointExpiration;
