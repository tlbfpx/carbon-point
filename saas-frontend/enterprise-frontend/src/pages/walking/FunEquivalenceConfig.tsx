import React, { useState, useMemo, useCallback } from 'react';
import { Input, InputNumber, Button, Table, message, Popconfirm, Typography, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchFunConversions, saveFunConversions, FunConversionItem } from '@/api/walking';
import { useBranding } from '@/components/BrandingProvider';
import { GlassCard } from '@carbon-point/design-system';

const { Text } = Typography;

const CALORIES_PER_STEP = 0.05; // average calories burned per step

const DEFAULT_ITEMS: FunConversionItem[] = [
  { itemName: '大米', unit: '克', caloriesPerUnit: 3.45, icon: '🍚' },
  { itemName: '冰棒', unit: '根', caloriesPerUnit: 80, icon: '🍦' },
  { itemName: '可乐', unit: '瓶', caloriesPerUnit: 140, icon: '🥤' },
  { itemName: '巧克力', unit: '块', caloriesPerUnit: 55, icon: '🍫' },
];

const FunEquivalenceConfig: React.FC = () => {
  const { primaryColor } = useBranding();
  const queryClient = useQueryClient();

  // Fetch fun conversion items
  const { data: serverItems, isLoading } = useQuery({
    queryKey: ['walking-fun-conversions'],
    queryFn: fetchFunConversions,
  });

  // Local editing state
  const [items, setItems] = useState<FunConversionItem[]>([]);
  const [initialized, setInitialized] = useState(false);
  // Steps for preview
  const [previewSteps, setPreviewSteps] = useState<number>(1000);

  // Sync server data to local state once
  React.useEffect(() => {
    if (serverItems && !initialized) {
      setItems(serverItems.length > 0 ? serverItems : DEFAULT_ITEMS);
      setInitialized(true);
    }
  }, [serverItems, initialized]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (itemsToSave: FunConversionItem[]) => {
      return saveFunConversions(itemsToSave);
    },
    onSuccess: () => {
      message.success('趣味换算配置已保存');
      queryClient.invalidateQueries({ queryKey: ['walking-fun-conversions'] });
    },
    onError: () => {
      message.error('保存失败，请重试');
    },
  });

  const handleAddItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { itemName: '', unit: '', caloriesPerUnit: 0, icon: '' },
    ]);
  }, []);

  const handleRemoveItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleFieldChange = useCallback(
    (index: number, field: keyof FunConversionItem, value: string | number) => {
      setItems((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
    },
    [],
  );

  // Compute preview text
  const previewText = useMemo(() => {
    const totalCalories = previewSteps * CALORIES_PER_STEP;
    const equivalences = items
      .filter((item) => item.itemName && item.caloriesPerUnit > 0)
      .map((item) => {
        const amount = totalCalories / item.caloriesPerUnit;
        const display = amount >= 100 ? amount.toFixed(0) : amount.toFixed(1);
        return `${display}${item.unit}${item.itemName}`;
      });

    const caloriesDisplay = totalCalories >= 100
      ? totalCalories.toFixed(0)
      : totalCalories.toFixed(1);

    if (equivalences.length === 0) {
      return `${previewSteps}步 ≈ ${caloriesDisplay}千卡`;
    }
    return `${previewSteps}步 ≈ ${caloriesDisplay}千卡 ≈ ${equivalences.join(' ≈ ')}`;
  }, [previewSteps, items]);

  const handleSave = () => {
    const validItems = items.filter((item) => item.itemName && item.caloriesPerUnit > 0);
    if (validItems.length === 0) {
      message.error('请至少配置一个有效的换算物品');
      return;
    }
    saveMutation.mutate(validItems);
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
      title: '图标',
      dataIndex: 'icon',
      width: 80,
      render: (_: unknown, __: FunConversionItem, index: number) => (
        <Input
          value={items[index]?.icon}
          onChange={(e) => handleFieldChange(index, 'icon', e.target.value)}
          placeholder="emoji"
          style={{
            width: '100%',
            borderRadius: 12,
            textAlign: 'center',
          }}
        />
      ),
    },
    {
      title: '物品名称',
      dataIndex: 'itemName',
      width: 160,
      render: (_: unknown, __: FunConversionItem, index: number) => (
        <Input
          value={items[index]?.itemName}
          onChange={(e) => handleFieldChange(index, 'itemName', e.target.value)}
          placeholder="例如: 大米"
          style={{ width: '100%', borderRadius: 12 }}
        />
      ),
    },
    {
      title: '单位',
      dataIndex: 'unit',
      width: 100,
      render: (_: unknown, __: FunConversionItem, index: number) => (
        <Input
          value={items[index]?.unit}
          onChange={(e) => handleFieldChange(index, 'unit', e.target.value)}
          placeholder="例如: 克"
          style={{ width: '100%', borderRadius: 12 }}
        />
      ),
    },
    {
      title: '千卡/单位',
      dataIndex: 'caloriesPerUnit',
      width: 140,
      render: (_: unknown, __: FunConversionItem, index: number) => (
        <InputNumber
          min={0}
          step={0.1}
          value={items[index]?.caloriesPerUnit}
          onChange={(v) => handleFieldChange(index, 'caloriesPerUnit', v ?? 0)}
          style={{ width: '100%', borderRadius: 12 }}
          placeholder="例如: 3.45"
        />
      ),
    },
    {
      title: '操作',
      width: 80,
      render: (_: unknown, __: unknown, index: number) => (
        <Popconfirm
          title="确认删除该物品？"
          onConfirm={() => handleRemoveItem(index)}
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
        配置步数换算趣味等价物，让用户直观感受运动效果
      </p>

      <Table
        dataSource={items}
        columns={columns}
        rowKey={(_, index) => String(index)}
        pagination={false}
        size="middle"
        style={{ marginBottom: 16 }}
      />

      {/* Preview section */}
      <Divider style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
      <div style={{ marginBottom: 16 }}>
        <Text
          style={{
            color: 'rgba(255,255,255,0.45)',
            fontSize: 13,
            fontFamily: 'var(--font-body)',
            display: 'block',
            marginBottom: 8,
          }}
        >
          预览效果
        </Text>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>输入步数:</Text>
          <InputNumber
            min={0}
            value={previewSteps}
            onChange={(v) => setPreviewSteps(v ?? 0)}
            style={{ width: 160, borderRadius: 12 }}
          />
        </div>
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 12,
            padding: '12px 16px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <Text
            style={{
              color: primaryColor,
              fontSize: 15,
              fontFamily: 'var(--font-body)',
              fontWeight: 500,
            }}
          >
            {previewText}
          </Text>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <Button
          type="dashed"
          onClick={handleAddItem}
          icon={<PlusOutlined />}
          style={{
            borderRadius: 20,
            border: '1px dashed rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.65)',
            fontFamily: 'var(--font-body)',
          }}
        >
          添加物品
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

export default FunEquivalenceConfig;
