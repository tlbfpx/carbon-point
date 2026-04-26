import React from 'react';
import { List, Button, Tag, Typography } from 'antd';
import { PlusOutlined, DragOutlined } from '@ant-design/icons';
import { RULE_NODE_LABELS, RULE_NODE_DESCRIPTIONS, SHORT_CIRCUIT_NODES } from './chain-utils';

const { Text } = Typography;

interface AvailableNode {
  name: string;
  description?: string;
}

interface NodePaletteProps {
  availableNodes: AvailableNode[];
  onAddNode: (nodeName: string) => void;
  disabled?: boolean;
}

const NodePalette: React.FC<NodePaletteProps> = ({ availableNodes, onAddNode, disabled }) => {
  const handleDragStart = (e: React.DragEvent, nodeName: string) => {
    e.dataTransfer.setData('application/reactflow', nodeName);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      style={{
        width: 260,
        borderRight: '1px solid #f0f0f0',
        padding: '12px',
        overflowY: 'auto',
        background: '#fafafa',
      }}
    >
      <div style={{ marginBottom: 12, fontWeight: 600, fontSize: 14 }}>
        可用规则节点
      </div>

      {availableNodes.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#bfbfbf', padding: 24 }}>
          所有节点已添加到链中
        </div>
      ) : (
        <List
          size="small"
          dataSource={availableNodes}
          renderItem={(node) => {
            const isSc = SHORT_CIRCUIT_NODES.has(node.name);
            return (
              <div
                draggable={!disabled}
                onDragStart={(e) => handleDragStart(e, node.name)}
                style={{
                  padding: '8px 10px',
                  marginBottom: 4,
                  background: '#fff',
                  borderRadius: 6,
                  border: `1px dashed ${isSc ? '#FA8C16' : '#d9d9d9'}`,
                  cursor: disabled ? 'not-allowed' : 'grab',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <DragOutlined style={{ color: '#bfbfbf', fontSize: 12 }} />
                    <Tag color={isSc ? 'orange' : 'purple'} style={{ margin: 0 }}>
                      {RULE_NODE_LABELS[node.name] || node.name}
                    </Tag>
                  </div>
                  <div style={{ color: '#8c8c8c', fontSize: 11, marginTop: 2 }}>
                    {node.description || RULE_NODE_DESCRIPTIONS[node.name] || ''}
                  </div>
                </div>
                <Button
                  type="link"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => onAddNode(node.name)}
                  disabled={disabled}
                />
              </div>
            );
          }}
        />
      )}
    </div>
  );
};

export default NodePalette;
