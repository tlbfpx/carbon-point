import React, { useState } from 'react';
import {
  Card,
  Button,
  Space,
  List,
  Typography,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SettingOutlined,
  UpOutlined,
  DownOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

export interface RuleNodeItem {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  configJson?: string;
}

interface RuleChainEditorProps {
  ruleNodes: RuleNodeItem[];
  availableRuleNodes: Array<{ name: string; description: string }>;
  onChange?: (nodes: RuleNodeItem[]) => void;
  onNodeConfig?: (node: RuleNodeItem) => void;
  disabled?: boolean;
}

const RuleChainEditor: React.FC<RuleChainEditorProps> = ({
  ruleNodes,
  availableRuleNodes,
  onChange,
  onNodeConfig,
  disabled = false,
}) => {
  const [nodes, setNodes] = useState<RuleNodeItem[]>(ruleNodes);

  const moveNode = (index: number, direction: 'up' | 'down') => {
    if (disabled) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= nodes.length) return;

    const items = Array.from(nodes);
    const [item] = items.splice(index, 1);
    items.splice(newIndex, 0, item);

    const reordered = items.map((item, i) => ({
      ...item,
      sortOrder: i + 1,
    }));

    setNodes(reordered);
    onChange?.(reordered);
  };

  const handleAddNode = (ruleNodeName: string) => {
    const newNode: RuleNodeItem = {
      id: `node-${Date.now()}`,
      name: ruleNodeName,
      sortOrder: nodes.length + 1,
    };
    const updated = [...nodes, newNode];
    setNodes(updated);
    onChange?.(updated);
  };

  const handleRemoveNode = (id: string) => {
    const updated = nodes
      .filter((n) => n.id !== id)
      .map((item, index) => ({
        ...item,
        sortOrder: index + 1,
      }));
    setNodes(updated);
    onChange?.(updated);
  };

  const handleConfigNode = (node: RuleNodeItem) => {
    onNodeConfig?.(node);
  };

  return (
    <Card>
      <div style={{ display: 'flex', gap: 24 }}>
        {/* Left: Available Rule Nodes */}
        <div style={{ flex: 1 }}>
          <Title level={5}>可用规则节点</Title>
          <List
            dataSource={availableRuleNodes}
            renderItem={(node) => (
              <List.Item
                actions={[
                  <Button
                    type="text"
                    icon={<PlusOutlined />}
                    onClick={() => handleAddNode(node.name)}
                    disabled={disabled}
                  >
                    添加
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={node.name}
                  description={node.description}
                />
              </List.Item>
            )}
          />
        </div>

        {/* Right: Current Rule Chain */}
        <div style={{ flex: 1 }}>
          <Title level={5}>规则链</Title>
          <div>
            {nodes.map((node, index) => (
              <Card
                key={node.id}
                size="small"
                style={{
                  marginBottom: 8,
                }}
                extra={
                  <Space>
                    <Tooltip title="上移">
                      <Button
                        type="text"
                        icon={<UpOutlined />}
                        onClick={() => moveNode(index, 'up')}
                        disabled={disabled || index === 0}
                      />
                    </Tooltip>
                    <Tooltip title="下移">
                      <Button
                        type="text"
                        icon={<DownOutlined />}
                        onClick={() => moveNode(index, 'down')}
                        disabled={disabled || index === nodes.length - 1}
                      />
                    </Tooltip>
                    <Tooltip title="配置">
                      <Button
                        type="text"
                        icon={<SettingOutlined />}
                        onClick={() => handleConfigNode(node)}
                        disabled={disabled}
                      />
                    </Tooltip>
                    <Tooltip title="删除">
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveNode(node.id)}
                        disabled={disabled}
                      />
                    </Tooltip>
                  </Space>
                }
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div>
                    <Text strong>{node.sortOrder}. {node.name}</Text>
                    {node.description && (
                      <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                        {node.description}
                      </Text>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {nodes.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              从左侧添加规则节点
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default RuleChainEditor;
