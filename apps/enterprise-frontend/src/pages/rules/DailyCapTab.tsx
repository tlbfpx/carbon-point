import React from 'react';
import { Button, Form, InputNumber, message } from 'antd';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getDailyCap, updateDailyCap, DailyCap } from '@/api/rules';
import { useBranding } from '@/components/BrandingProvider';

interface DailyCapTabProps {
  tenantId: string;
}

const DailyCapTab: React.FC<DailyCapTabProps> = ({ tenantId }) => {
  const { primaryColor } = useBranding();

  const { data: dailyCapData } = useQuery({
    queryKey: ['rules-daily-cap', tenantId],
    queryFn: () => getDailyCap(tenantId),
    enabled: !!tenantId,
  });

  const dailyCapMutation = useMutation({
    mutationFn: (data: DailyCap) => updateDailyCap(tenantId, data),
    onSuccess: () => message.success('保存成功'),
  });

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        padding: '32px',
      }}
    >
      <h3
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 16,
          fontWeight: 600,
          marginBottom: 24,
          color: '#333',
        }}
      >
        每日积分上限配置
      </h3>
      <Form
        layout="vertical"
        initialValues={{ maxPoints: dailyCapData?.maxPoints || 500 }}
        onFinish={(values) => dailyCapMutation.mutate(values)}
        style={{ maxWidth: 500 }}
      >
        <Form.Item
          name="maxPoints"
          label={<span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>每日积分上限</span>}
          rules={[{ required: true, message: '请输入每日积分上限' }]}
        >
          <InputNumber
            min={0}
            max={10000}
            style={{ width: '100%', borderRadius: 12 }}
            placeholder="设置每日可获得的积分上限"
          />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          style={{
            borderRadius: 20,
            background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
            border: 'none',
            boxShadow: `0 4px 12px ${primaryColor}30`,
            fontWeight: 500,
            minWidth: 100,
          }}
        >
          保存
        </Button>
      </Form>
    </div>
  );
};

export default DailyCapTab;
