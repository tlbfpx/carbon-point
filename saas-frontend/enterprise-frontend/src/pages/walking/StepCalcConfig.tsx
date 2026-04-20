import React, { useEffect } from 'react';
import { Form, InputNumber, Button, message, Spin } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWalkingConfig, updateWalkingConfig, WalkingConfig } from '@/api/walking';
import { useBranding } from '@/components/BrandingProvider';
import { GlassCard } from '@carbon-point/design-system';

const StepCalcConfig: React.FC = () => {
  const { primaryColor } = useBranding();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  // Fetch walking config
  const { data, isLoading } = useQuery({
    queryKey: ['walking-config'],
    queryFn: getWalkingConfig,
  });

  // Populate form when data arrives
  useEffect(() => {
    if (data) {
      // Convert integer coefficient to decimal for display
      const displayData = {
        ...data,
        pointsCoefficient: (data.pointsCoefficient || 1) / 100,
      };
      form.setFieldsValue(displayData);
    }
  }, [data, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: WalkingConfig) => {
      return updateWalkingConfig(values);
    },
    onSuccess: () => {
      message.success('步数积分配置已保存');
      queryClient.invalidateQueries({ queryKey: ['walking-config'] });
    },
    onError: () => {
      message.error('保存失败，请重试');
    },
  });

  if (isLoading) {
    return (
      <GlassCard hoverable style={{ padding: 40, textAlign: 'center' }}>
        <Spin />
      </GlassCard>
    );
  }

  return (
    <GlassCard hoverable style={{ padding: 24 }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => {
          // Convert pointsCoefficient to integer (e.g., 0.01 -> 1)
          const formattedValues = {
            ...values,
            pointsCoefficient: Math.round((values.pointsCoefficient || 0.01) * 100),
          };
          saveMutation.mutate(formattedValues as WalkingConfig);
        }}
        initialValues={{ stepsThreshold: 1000, pointsCoefficient: 0.01, dailyCap: 50 }}
      >
        <Form.Item
          name="stepsThreshold"
          label="步数阈值"
          rules={[{ required: true, message: '请输入步数阈值' }]}
          extra="达到该步数后可领取积分"
        >
          <InputNumber
            min={1}
            style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}
            placeholder="例如: 1000"
          />
        </Form.Item>

        <Form.Item
          name="pointsCoefficient"
          label="积分系数"
          rules={[{ required: true, message: '请输入积分系数' }]}
          extra="每步可获得的积分数（例如 0.01 表示每步 0.01 积分）"
          normalize={(value) => {
            // Convert from integer (backend) to decimal (display)
            if (value === undefined || value === null) return 0.01;
            if (typeof value === 'number' && value >= 1) {
              return value / 100;
            }
            return value;
          }}
        >
          <InputNumber
            min={0.001}
            max={1}
            step={0.001}
            precision={3}
            style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}
            placeholder="例如: 0.01"
          />
        </Form.Item>

        <Form.Item
          name="dailyCap"
          label="每日积分上限"
          rules={[{ required: true, message: '请输入每日积分上限' }]}
          extra="走路积分每日领取上限"
        >
          <InputNumber
            min={1}
            style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}
            placeholder="例如: 50"
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={saveMutation.isPending}
            style={{
              borderRadius: 20,
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
              border: 'none',
              fontFamily: 'var(--font-body)',
              fontWeight: 500,
              padding: '4px 32px',
              height: 40,
            }}
          >
            保存配置
          </Button>
        </Form.Item>
      </Form>
    </GlassCard>
  );
};

export default StepCalcConfig;
