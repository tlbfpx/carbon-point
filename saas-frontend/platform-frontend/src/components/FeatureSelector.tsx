import React from 'react';
import {
  Card,
  Checkbox,
  List,
  Typography,
  Tag,
  Tooltip,
  Space,
} from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export interface FeatureItem {
  featureId: string;
  name: string;
  type?: string;
  description?: string;
  required?: boolean;
  enabled: boolean;
  configSchema?: string;
  configValue?: string;
}

interface FeatureSelectorProps {
  features: FeatureItem[];
  onChange?: (features: FeatureItem[]) => void;
  disabled?: boolean;
}

const FeatureSelector: React.FC<FeatureSelectorProps> = ({
  features,
  onChange,
  disabled = false,
}) => {
  const handleToggleFeature = (featureId: string, checked: boolean) => {
    const updated = features.map((f) =>
      f.featureId === featureId ? { ...f, enabled: checked } : f
    );
    onChange?.(updated);
  };

  return (
    <Card>
      <Title level={5}>功能点选择</Title>
      <List
        dataSource={features}
        renderItem={(feature) => (
          <List.Item
            actions={
              feature.required
                ? [
                    <Tag color="orange" key="required">
                      必需
                    </Tag>,
                  ]
                : []
            }
          >
            <List.Item.Meta
              avatar={
                <Checkbox
                  checked={feature.enabled}
                  disabled={disabled || feature.required}
                  onChange={(e) =>
                    handleToggleFeature(feature.featureId, e.target.checked)
                  }
                />
              }
              title={
                <Space>
                  <Text strong>{feature.name}</Text>
                  {feature.type && (
                    <Tag color="blue" size="small">
                      {feature.type}
                    </Tag>
                  )}
                  {feature.description && (
                    <Tooltip title={feature.description}>
                      <QuestionCircleOutlined style={{ color: '#999' }} />
                    </Tooltip>
                  )}
                </Space>
              }
              description={
                feature.configSchema && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    配置项: {feature.configSchema}
                  </Text>
                )
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
};

export default FeatureSelector;
