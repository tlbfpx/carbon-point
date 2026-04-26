import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Badge, Tag, Space, Button, Tooltip } from 'antd';
import {
  SettingOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { ChainNodeData } from './chain-utils';

const ChainNode: React.FC<NodeProps<ChainNodeData>> = ({ data }) => {
  const { displayName, stepIndex, hasConfig, isShortCircuit, description } = data;

  return (
    <div
      style={{
        width: 220,
        padding: '10px 14px',
        background: '#fff',
        borderRadius: 8,
        border: isShortCircuit
          ? '2px solid #FA8C16'
          : '1px solid #d9d9d9',
        boxShadow: isShortCircuit
          ? '0 2px 8px rgba(250, 140, 22, 0.25)'
          : '0 1px 4px rgba(0, 0, 0, 0.08)',
        cursor: 'grab',
        position: 'relative',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: isShortCircuit ? '#FA8C16' : '#722ED1',
          width: 8,
          height: 8,
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Badge
          count={stepIndex}
          style={{ backgroundColor: '#722ED1', fontSize: 11 }}
          size="small"
        />
        <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{displayName}</span>
        {isShortCircuit && (
          <Tooltip title="可短路终止">
            <Tag
              icon={<ThunderboltOutlined />}
              color="orange"
              style={{ fontSize: 11, lineHeight: '18px', margin: 0, padding: '0 4px' }}
            >
              短路
            </Tag>
          </Tooltip>
        )}
        {hasConfig && (
          <CheckCircleOutlined style={{ color: '#52C41A', fontSize: 14 }} />
        )}
      </div>

      {description && (
        <div style={{ color: '#8C8C8C', fontSize: 11, lineHeight: '16px' }}>
          {description}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: isShortCircuit ? '#FA8C16' : '#722ED1',
          width: 8,
          height: 8,
        }}
      />
    </div>
  );
};

export default memo(ChainNode);
