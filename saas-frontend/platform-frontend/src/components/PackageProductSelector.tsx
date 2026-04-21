import React, { useState, useEffect } from 'react';
import {
  Card,
  Checkbox,
  List,
  Typography,
  Tag,
  Space,
  Button,
  Collapse,
  Form,
  InputNumber,
  Switch,
  Row,
  Col,
} from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import type { Product, Feature, PackageProductFeature } from '@/api/platform';

const { Title, Text } = Typography;
const { Panel } = Collapse;

export interface PackageProductSelection {
  productId: string;
  sortOrder: number;
  features: Record<string, { enabled: boolean; configValue?: string }>;
}

interface PackageProductSelectorProps {
  products: Product[];
  productFeatures: Record<string, Feature[]>;
  initialSelection?: PackageProductSelection[];
  onChange?: (selection: PackageProductSelection[]) => void;
  disabled?: boolean;
}

const PackageProductSelector: React.FC<PackageProductSelectorProps> = ({
  products,
  productFeatures,
  initialSelection = [],
  onChange,
  disabled = false,
}) => {
  const [selection, setSelection] = useState<PackageProductSelection[]>(initialSelection);

  useEffect(() => {
    setSelection(initialSelection);
  }, [initialSelection]);

  const getProductSelection = (productId: string): PackageProductSelection | undefined => {
    return selection.find((s) => s.productId === productId);
  };

  const isProductSelected = (productId: string): boolean => {
    return selection.some((s) => s.productId === productId);
  };

  const handleToggleProduct = (product: Product, checked: boolean) => {
    let updated: PackageProductSelection[];
    if (checked) {
      const features: Record<string, { enabled: boolean; configValue?: string }> = {};
      const feats = productFeatures[product.id] || [];
      feats.forEach((f) => {
        features[f.id] = { enabled: true };
      });
      updated = [
        ...selection,
        {
          productId: product.id,
          sortOrder: selection.length + 1,
          features,
        },
      ];
    } else {
      updated = selection
        .filter((s) => s.productId !== product.id)
        .map((s, idx) => ({ ...s, sortOrder: idx + 1 }));
    }
    setSelection(updated);
    onChange?.(updated);
  };

  const handleToggleFeature = (productId: string, featureId: string, enabled: boolean) => {
    const updated = selection.map((s) => {
      if (s.productId !== productId) return s;
      return {
        ...s,
        features: {
          ...s.features,
          [featureId]: { ...s.features[featureId], enabled },
        },
      };
    });
    setSelection(updated);
    onChange?.(updated);
  };

  const handleSortOrderChange = (productId: string, sortOrder: number) => {
    const updated = [...selection];
    const idx = updated.findIndex((s) => s.productId === productId);
    if (idx === -1) return;

    const item = updated[idx];
    item.sortOrder = sortOrder;
    updated.sort((a, b) => a.sortOrder - b.sortOrder);

    const reordered = updated.map((s, i) => ({ ...s, sortOrder: i + 1 }));
    setSelection(reordered);
    onChange?.(reordered);
  };

  return (
    <Card>
      <Title level={5}>选择产品</Title>
      <List
        dataSource={products}
        renderItem={(product) => {
          const selected = isProductSelected(product.id);
          const productSelection = getProductSelection(product.id);
          const features = productFeatures[product.id] || [];

          return (
            <List.Item>
              <Card
                size="small"
                style={{ width: '100%' }}
                title={
                  <Space>
                    <Checkbox
                      checked={selected}
                      disabled={disabled}
                      onChange={(e) => handleToggleProduct(product, e.target.checked)}
                    />
                    <Text strong>{product.name}</Text>
                    <Tag color="blue">{product.category}</Tag>
                  </Space>
                }
                extra={
                  selected && (
                    <Space>
                      <Text type="secondary">排序:</Text>
                      <InputNumber
                        min={1}
                        max={products.length}
                        value={productSelection?.sortOrder}
                        onChange={(value) =>
                          handleSortOrderChange(product.id, value || 1)
                        }
                        disabled={disabled}
                        size="small"
                        style={{ width: 70 }}
                      />
                    </Space>
                  )
                }
              >
                {selected && features.length > 0 && (
                  <Collapse ghost>
                    <Panel
                      header={
                        <Space>
                          <SettingOutlined />
                          <Text>功能点配置 ({features.length})</Text>
                        </Space>
                      }
                    >
                      <List
                        size="small"
                        dataSource={features}
                        renderItem={(feature) => {
                          const featureState = productSelection?.features[feature.id];
                          return (
                            <List.Item>
                              <Space>
                                <Switch
                                  checked={featureState?.enabled ?? true}
                                  onChange={(checked) =>
                                    handleToggleFeature(product.id, feature.id, checked)
                                  }
                                  disabled={disabled}
                                />
                                <div>
                                  <Text>{feature.name}</Text>
                                  {feature.type && (
                                    <Tag size="small" style={{ marginLeft: 8 }}>
                                      {feature.type}
                                    </Tag>
                                  )}
                                  {feature.description && (
                                    <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                                      {feature.description}
                                    </Text>
                                  )}
                                </div>
                              </Space>
                            </List.Item>
                          );
                        }}
                      />
                    </Panel>
                  </Collapse>
                )}
              </Card>
            </List.Item>
          );
        }}
      />
    </Card>
  );
};

export default PackageProductSelector;
