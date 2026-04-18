import React from 'react';
import { Button, Form, InputNumber, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getConsecutiveRewards, updateConsecutiveRewards, ConsecutiveReward } from '@/api/rules';
import { useBranding } from '@/components/BrandingProvider';
import { GlassCard } from '@carbon-point/design-system';

interface ConsecutiveTabProps {
  tenantId: string;
}

const ConsecutiveTab: React.FC<ConsecutiveTabProps> = ({ tenantId }) => {
  const { primaryColor } = useBranding();
  const queryClient = useQueryClient();

  const { data: consecutiveData } = useQuery({
    queryKey: ['rules-consecutive', tenantId],
    queryFn: () => getConsecutiveRewards(tenantId),
    enabled: !!tenantId,
  });

  const consecutiveMutation = useMutation({
    mutationFn: (rewards: ConsecutiveReward[]) => updateConsecutiveRewards(tenantId, rewards),
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
        连续打卡奖励配置
      </h3>
      <Form
        layout="vertical"
        initialValues={{
          rewards: consecutiveData || [
            { days: 7, bonusPoints: 50 },
            { days: 14, bonusPoints: 100 },
            { days: 30, bonusPoints: 200 },
          ],
        }}
        onFinish={(values) => consecutiveMutation.mutate(values.rewards)}
      >
        <Form.List name="rewards">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...rest }, index) => (
                <div
                  key={key}
                  style={{
                    background: index % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
                    padding: '20px',
                    borderRadius: 12,
                    marginBottom: 12,
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <Form.Item
                      {...rest}
                      name={[name, 'days']}
                      label={<span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>连续天数</span>}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber min={1} style={{ borderRadius: 12, minWidth: 120 }} placeholder="天数" />
                    </Form.Item>
                    <Form.Item
                      {...rest}
                      name={[name, 'bonusPoints']}
                      label={<span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>奖励积分</span>}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber min={0} style={{ borderRadius: 12, minWidth: 120 }} placeholder="积分" />
                    </Form.Item>
                    <Button onClick={() => remove(name)} danger style={{ borderRadius: 20, height: 38 }}>
                      删除
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                type="dashed"
                onClick={() => add({ days: 0, bonusPoints: 0 })}
                icon={<PlusOutlined />}
                style={{
                  borderRadius: 12,
                  borderColor: 'rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.65)',
                  marginTop: 8,
                }}
              >
                添加规则
              </Button>
            </>
          )}
        </Form.List>
        <Button
          type="primary"
          htmlType="submit"
          style={{
            marginTop: 24,
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

export default ConsecutiveTab;
