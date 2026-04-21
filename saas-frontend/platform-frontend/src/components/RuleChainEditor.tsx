import React, { useState } from 'react';
import {
  Card,
  Button,
  Space,
  List,
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  Typography,
  Tooltip,
} from 'antd';
import {
  HolderOutlined,
  PlusOutlined,
  DeleteOutlined,
  SettingOutlined,
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

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || disabled) return;

    const items = Array.from(nodes);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const reordered = items.map((item, index) => ({
      ...item,
      sortOrder: index + 1,
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
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="rule-chain">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {nodes.map((node, index) => (
                    <Draggable
                      key={node.id}
                      draggableId={node.id}
                      index={index}
                      isDragDisabled={disabled}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          style={{
                            ...provided.draggableProps.style,
                            marginBottom: 8,
                          }}
                        >
                          <Card
                            size="small"
                            style={{
                              background: snapshot.isDragging ? '#e6f7ff' : '#fff',
                            }}
                            extra={
                              <Space>
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
                              {...provided.dragHandleProps}
                            >
                              <HolderOutlined style={{ cursor: 'grab', color: '#999' }} />
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
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {nodes.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              从左侧拖拽添加规则节点
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default RuleChainEditor;
