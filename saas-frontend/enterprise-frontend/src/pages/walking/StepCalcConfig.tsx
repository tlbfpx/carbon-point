import React, { useEffect } from 'react';
import { Form, InputNumber, Button, message, Spin } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/request';
import { useBranding } from '@/components/BrandingProvider';
import { GlassCard } from '@carbon-point/design-system';

interface StepCalcConfigData {
  stepsThreshold: number;
  pointsCoefficient: number;
  dailyCap: number;
}

const StepCalcConfig: React.FC = () => {
  const { primaryColor } = useBranding();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  // Fetch existing step_calc rule
  const { data, isLoading } = useQuery({
    queryKey: ['walking-step-calc'],
    queryFn: async (): Promise<StepCalcConfigData> => {
      const res = await apiClient.get('/point-rules/list', { params: { type: 'step_calc' } });
      const rules = (res as any)?.data || (res as any) || [];
      const rule = Array.isArray(rules) ? rules.find((r: any) => r.type === 'step_calc') : null;
      if (rule) {
        let config: any = {};
        try { config = JSON.parse(rule.config || '{}'); } catch {}
        return {
          stepsThreshold: config.stepsThreshold || 0,
          pointsCoefficient: config.pointsCoefficient || 0,
          dailyCap: config.dailyCap || 0,
        };
      }
      return { stepsThreshold: 0, pointsCoefficient: 0, dailyCap: 0 };
    },
  });

  // Populate form when data arrives
  useEffect(() => {
    if (data) {
      form.setFieldsValue(data);
    }
  }, [data, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: StepCalcConfigData) => {
      // Try to find existing rule to update
      const listRes = await apiClient.get('/point-rules/list', { params: { type: 'step_calc' } });
      const rules = (listRes as any)?.data || (listRes as any) || [];
      const existing = Array.isArray(rules) ? rules.find((r: any) => r.type === 'step_calc') : null;

      const payload = {
        type: 'step_calc',
        name: '步数积分配置',
        config: JSON.stringify(values),
        enabled: true,
        sortOrder: 0,
      };

      if (existing) {
        return apiClient.put('/point-rules', { id: Number(existing.id), ...payload });
      }
      return apiClient.post('/point-rules', payload);
    },
    onSuccess: () => {
      message.success('步数积分配置已保存');
      queryClient.invalidateQueries({ queryKey: ['walking-step-calc'] });
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
        onFinish={(values) => saveMutation.mutate(values as StepCalcConfigData)}
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
        >
          <InputNumber
            min={0.001}
            max={1}
            step={0.001}
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
