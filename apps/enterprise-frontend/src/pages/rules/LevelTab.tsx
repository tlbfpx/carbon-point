import React from 'react';
import { Button, Form, InputNumber, message } from 'antd';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getLevelCoefficients, updateLevelCoefficients, LevelCoefficient } from '@/api/rules';
import { useBranding } from '@/components/BrandingProvider';
import { GlassCard } from '@carbon-point/design-system';

interface LevelTabProps {
  tenantId: string;
}

const levelLabels = ['Lv.1 青铜', 'Lv.2 白银', 'Lv.3 黄金', 'Lv.4 铂金', 'Lv.5 钻石'];
const levelColors = ['#8d6e63', '#78909c', '#fbc02d', '#5c6bc0', '#ec407a'];

const LevelTab: React.FC<LevelTabProps> = ({ tenantId }) => {
  const { primaryColor } = useBranding();

  const { data: levelCoefData } = useQuery({
    queryKey: ['rules-level-coef', tenantId],
    queryFn: () => getLevelCoefficients(tenantId),
    enabled: !!tenantId,
  });

  const levelCoefMutation = useMutation({
    mutationFn: (data: LevelCoefficient[]) => updateLevelCoefficients(tenantId, data),
    onSuccess: () => message.success('保存成功'),
  });

  return (
    <GlassCard hoverable>
      <h3
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 16,
          fontWeight: 600,
          marginBottom: 24,
          color: '#fff',
        }}
      >
        等级积分系数配置
      </h3>
      <Form
        layout="vertical"
        initialValues={{
          coefficients: levelCoefData || levelLabels.map((_, i) => ({
            level: i + 1,
            coefficient: 1 + i * 0.2,
          })),
        }}
        onFinish={(values) => levelCoefMutation.mutate(values.coefficients)}
      >
        <Form.List name="coefficients">
          {(fields) => (
            <>
              {fields.map(({ key, name, ...rest }, index) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 24,
                    padding: '16px 20px',
                    borderRadius: 12,
                    marginBottom: 12,
                    background: 'rgba(255,255,255,0.04)',
                    borderLeft: `4px solid ${levelColors[index]}`,
                  }}
                >
                  <span
                    style={{
                      width: 120,
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 600,
                      color: levelColors[index],
                    }}
                  >
                    {levelLabels[name]}
                  </span>
                  <Form.Item {...rest} name={[name, 'level']} hidden>
                    <InputNumber />
                  </Form.Item>
                  <Form.Item
                    {...rest}
                    name={[name, 'coefficient']}
                    label={<span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>系数</span>}
                    style={{ marginBottom: 0, flex: 1 }}
                  >
                    <InputNumber min={0.1} max={5} step={0.1} style={{ borderRadius: 12, width: '100%' }} />
                  </Form.Item>
                </div>
              ))}
            </>
          )}
        </Form.List>
        <Button
          type="primary"
          htmlType="submit"
          style={{
            marginTop: 16,
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
    </GlassCard>
  );
};

export default LevelTab;
