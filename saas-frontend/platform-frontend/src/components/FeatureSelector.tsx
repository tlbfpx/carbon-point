import React from 'react';
import {
  Card,
  Checkbox,
  List,
  Typography,
  Tag,
  Tooltip,
  Space,
  Switch,
  InputNumber,
  Input,
  Select,
  Divider,
} from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export type FeatureParamType = 'boolean' | 'number' | 'string' | 'multi-select';

export interface FeatureParamDef {
  key: string;
  label: string;
  type: FeatureParamType;
  defaultValue?: unknown;
  min?: number;
  max?: number;
  options?: { label: string; value: string }[];
  placeholder?: string;
}

export interface FeatureItem {
  featureId: string;
  code: string;
  name: string;
  type?: string;
  description?: string;
  required?: boolean;
  enabled: boolean;
  configSchema?: string;
  configValue?: string;
  params?: FeatureParamDef[];
  paramValues?: Record<string, unknown>;
  group?: string;
}

interface FeatureSelectorProps {
  features: FeatureItem[];
  onChange?: (features: FeatureItem[]) => void;
  disabled?: boolean;
  grouped?: boolean;
}

const renderParamInput = (
  param: FeatureParamDef,
  value: unknown,
  onChange: (val: unknown) => void,
  disabled: boolean,
) => {
  switch (param.type) {
    case 'boolean':
      return (
        <Switch
          size="small"
          checked={value === true || value === 'true'}
          onChange={(checked) => onChange(checked)}
          disabled={disabled}
          checkedChildren="开"
          unCheckedChildren="关"
        />
      );
    case 'number':
      return (
        <InputNumber
          size="small"
          min={param.min}
          max={param.max}
          value={typeof value === 'number' ? value : (param.defaultValue as number)}
          onChange={(v) => onChange(v)}
          disabled={disabled}
          placeholder={param.placeholder}
          style={{ width: 120 }}
        />
      );
    case 'multi-select':
      return (
        <Select
          mode="multiple"
          size="small"
          value={(value as string[]) || (param.defaultValue as string[]) || []}
          onChange={(v) => onChange(v)}
          disabled={disabled}
          options={param.options}
          placeholder={param.placeholder}
          style={{ minWidth: 180 }}
        />
      );
    case 'string':
    default:
      return (
        <Input
          size="small"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={param.placeholder || param.defaultValue as string}
          style={{ width: 180 }}
        />
      );
  }
};

const FeatureSelector: React.FC<FeatureSelectorProps> = ({
  features,
  onChange,
  disabled = false,
  grouped = false,
}) => {
  const handleToggleFeature = (featureId: string, checked: boolean) => {
    const updated = features.map((f) =>
      f.featureId === featureId ? { ...f, enabled: checked } : f
    );
    onChange?.(updated);
  };

  const handleParamChange = (featureId: string, paramKey: string, value: unknown) => {
    const updated = features.map((f) => {
      if (f.featureId !== featureId) return f;
      return {
        ...f,
        paramValues: { ...f.paramValues, [paramKey]: value },
      };
    });
    onChange?.(updated);
  };

  const renderFeatureItem = (feature: FeatureItem) => (
    <List.Item
      key={feature.featureId}
      style={{ padding: '8px 0' }}
    >
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Switch
              size="small"
              checked={feature.enabled}
              disabled={disabled || feature.required}
              onChange={(checked) => handleToggleFeature(feature.featureId, checked)}
            />
            <Text strong>{feature.name}</Text>
            {feature.code && (
              <Tag style={{ fontSize: 11 }}>{feature.code}</Tag>
            )}
            {feature.type && (
              <Tag color={feature.type === 'permission' ? 'blue' : 'orange'}>
                {feature.type === 'permission' ? '权限' : '配置'}
              </Tag>
            )}
            {feature.required ? (
              <Tag color="red">必需</Tag>
            ) : (
              <Tag color="default">可选</Tag>
            )}
            {feature.description && (
              <Tooltip title={feature.description}>
                <QuestionCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            )}
          </div>
        </div>
        {feature.enabled && feature.params && feature.params.length > 0 && (
          <div style={{ marginTop: 8, paddingLeft: 40 }}>
            {feature.params.map((param) => (
              <div
                key={param.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <Text type="secondary" style={{ fontSize: 12, minWidth: 100 }}>
                  {param.label}:
                </Text>
                {renderParamInput(
                  param,
                  feature.paramValues?.[param.key] ?? param.defaultValue,
                  (val) => handleParamChange(feature.featureId, param.key, val),
                  disabled,
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </List.Item>
  );

  if (grouped) {
    const groups = new Map<string, FeatureItem[]>();
    features.forEach((f) => {
      const g = f.group || 'default';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(f);
    });

    return (
      <Card>
        <Title level={5}>功能点选择</Title>
        {Array.from(groups.entries()).map(([group, items]) => (
          <div key={group}>
            {group !== 'default' && (
              <>
                <Divider orientation="left" style={{ margin: '8px 0', fontSize: 13 }}>
                  {group}
                </Divider>
              </>
            )}
            <List
              dataSource={items}
              renderItem={renderFeatureItem}
              split
            />
          </div>
        ))}
      </Card>
    );
  }

  return (
    <Card>
      <Title level={5}>功能点选择</Title>
      <List
        dataSource={features}
        renderItem={renderFeatureItem}
        split
      />
    </Card>
  );
};

export default FeatureSelector;
