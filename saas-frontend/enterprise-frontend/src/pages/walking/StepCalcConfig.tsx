import React, { useState, useCallback, useMemo } from 'react';
import { InputNumber, Button, Table, message, Popconfirm, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTierRules, saveTierRules, StepTier } from '@/api/walking';
import { useBranding } from '@/components/BrandingProvider';
import { GlassCard } from '@carbon-point/design-system';

const { Text } = Typography;

const DEFAULT_TIERS: StepTier[] = [
  { minSteps: 0, maxSteps: 2000, points: 0 },
  { minSteps: 2000, maxSteps: 3000, points: 5 },
  { minSteps: 3000, maxSteps: 5000, points: 10 },
  { minSteps: 5000, maxSteps: null, points: 15 },
];

const StepCalcConfig: React.FC = () => {
  const { primaryColor } = useBranding();
  const queryClient = useQueryClient();

  // Fetch tier rules
  const { data: serverTiers, isLoading } = useQuery({
    queryKey: ['walking-tier-rules'],
    queryFn: fetchTierRules,
  });

  // Local editing state
  const [tiers, setTiers] = useState<StepTier[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Sync server data to local state once
  React.useEffect(() => {
    if (serverTiers && !initialized) {
      setTiers(serverTiers.length > 0 ? serverTiers : DEFAULT_TIERS);
      setInitialized(true);
    }
  }, [serverTiers, initialized]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (tiersToSave: StepTier[]) => {
      return saveTierRules(tiersToSave);
    },
    onSuccess: () => {
      message.success('步数梯度配置已保存');
      queryClient.invalidateQueries({ queryKey: ['walking-tier-rules'] });
    },
    onError: () => {
      message.error('保存失败，请重试');
    },
  });

  // Validate tiers for gaps/overlaps
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    for (let i = 0; i < tiers.length; i++) {
      const tier = tiers[i];
      if (tier.minSteps < 0) {
        errors.push(`第 ${i + 1} 行: 最小步数不能为负`);
      }
      if (tier.maxSteps !== null && tier.maxSteps <= tier.minSteps) {
        errors.push(`第 ${i + 1} 行: 最大步数必须大于最小步数`);
      }
      if (i > 0) {
        const prev = tiers[i - 1];
        if (prev.maxSteps === null) {
          errors.push(`第 ${i} 行已设为无上限，不能在其后添加更多梯度`);
        } else if (tier.minSteps !== prev.maxSteps) {
          errors.push(`第 ${i + 1} 行: 最小步数(${tier.minSteps})应等于上一行最大步数(${prev.maxSteps})`);
        }
      } else if (tier.minSteps !== 0) {
        errors.push(`第 1 行: 最小步数应从 0 开始`);
      }
    }
    return errors;
  }, [tiers]);

  const handleAddTier = useCallback(() => {
    setTiers((prev) => {
      const last = prev[prev.length - 1];
      const newMin = last?.maxSteps ?? 0;
      return [
        ...prev,
        { minSteps: newMin, maxSteps: null, points: 0 },
      ];
    });
  }, []);

  const handleRemoveTier = useCallback((index: number) => {
    setTiers((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleFieldChange = useCallback(
    (index: number, field: keyof StepTier, value: number | null) => {
      setTiers((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
    },
    [],
  );

  const handleSave = () => {
    if (validationErrors.length > 0) {
      message.error(validationErrors[0]);
      return;
    }
    saveMutation.mutate(tiers);
  };

  if (isLoading) {
    return (
      <GlassCard hoverable style={{ padding: 40, textAlign: 'center' }}>
        <Text style={{ color: 'rgba(255,255,255,0.45)' }}>加载中...</Text>
      </GlassCard>
    );
  }

  const columns = [
    {
      title: '梯度',
      dataIndex: 'index',
      width: 60,
      render: (_: unknown, __: unknown, index: number) => (
        <Text style={{ color: 'rgba(255,255,255,0.65)' }}>{index + 1}</Text>
      ),
    },
    {
      title: '最小步数',
      dataIndex: 'minSteps',
      width: 160,
      render: (_: unknown, __: StepTier, index: number) => (
        <InputNumber
          min={0}
          value={tiers[index]?.minSteps}
          onChange={(v) => handleFieldChange(index, 'minSteps', v ?? 0)}
          style={{
            width: '100%',
            borderRadius: 12,
          }}
          placeholder="例如: 0"
        />
      ),
    },
    {
      title: '最大步数',
      dataIndex: 'maxSteps',
      width: 180,
      render: (_: unknown, __: StepTier, index: number) => (
        <InputNumber
          min={0}
          value={tiers[index]?.maxSteps}
          onChange={(v) => handleFieldChange(index, 'maxSteps', v)}
          placeholder="留空=无上限"
          style={{
            width: '100%',
            borderRadius: 12,
          }}
        />
      ),
    },
    {
      title: '获得积分',
      dataIndex: 'points',
      width: 140,
      render: (_: unknown, __: StepTier, index: number) => (
        <InputNumber
          min={0}
          value={tiers[index]?.points}
          onChange={(v) => handleFieldChange(index, 'points', v ?? 0)}
          style={{
            width: '100%',
            borderRadius: 12,
          }}
          placeholder="例如: 5"
        />
      ),
    },
    {
      title: '操作',
      width: 80,
      render: (_: unknown, __: unknown, index: number) => (
        <Popconfirm
          title="确认删除该梯度？"
          onConfirm={() => handleRemoveTier(index)}
          okText="确认"
          cancelText="取消"
        >
          <Button type="text" danger icon={<DeleteOutlined />} style={{ borderRadius: 8 }} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <GlassCard hoverable style={{ padding: 24 }}>
      <p
        style={{
          color: 'rgba(255,255,255,0.65)',
          fontSize: 14,
          fontFamily: 'var(--font-body)',
          marginBottom: 24,
        }}
      >
        配置步数梯度积分规则，不同步数区间获得不同积分。最大步数留空表示无上限。
      </p>

      <Table
        dataSource={tiers}
        columns={columns}
        rowKey={(_, index) => String(index)}
        pagination={false}
        size="middle"
        style={{ marginBottom: 16 }}
      />

      {validationErrors.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {validationErrors.map((err, i) => (
            <Text key={i} type="danger" style={{ display: 'block', fontSize: 12 }}>
              {err}
            </Text>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <Button
          type="dashed"
          onClick={handleAddTier}
          icon={<PlusOutlined />}
          style={{
            borderRadius: 20,
            border: '1px dashed rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.65)',
            fontFamily: 'var(--font-body)',
          }}
        >
          添加梯度
        </Button>
        <Button
          type="primary"
          onClick={handleSave}
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
      </div>
    </GlassCard>
  );
};

export default StepCalcConfig;
