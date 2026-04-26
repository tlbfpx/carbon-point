import React, { useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Alert, Typography } from 'antd';
import ChainFlowCanvas from './ChainFlowCanvas';
import NodePalette from './NodePalette';
import { RULE_NODE_LABELS } from './chain-utils';

const { Text } = Typography;

export interface VisualRuleChainEditorProps {
  /** Ordered list of node names (snake_case) currently in the chain */
  ruleChain: string[];
  /** Per-node config: key = "nodeName-index", value = JSON string */
  ruleChainConfigs: Record<string, string>;
  /** All available rule node types not yet in the chain */
  availableNodes: Array<{ name: string; description?: string }>;
  /** Fires when chain order/content changes */
  onChange?: (chain: string[], configs: Record<string, string>) => void;
  /** Fires when user wants to configure a node */
  onNodeConfig?: (nodeName: string, index: number) => void;
  disabled?: boolean;
}

const VisualRuleChainEditor: React.FC<VisualRuleChainEditorProps> = ({
  ruleChain,
  ruleChainConfigs,
  availableNodes,
  onChange,
  onNodeConfig,
  disabled = false,
}) => {
  const updateChain = useCallback(
    (newChain: string[], newConfigs?: Record<string, string>) => {
      onChange?.(newChain, newConfigs || ruleChainConfigs);
    },
    [onChange, ruleChainConfigs],
  );

  // Add a node at a specific position
  const handleAddNode = useCallback(
    (nodeName: string, atIndex: number) => {
      const newChain = [...ruleChain];
      newChain.splice(atIndex, 0, nodeName);
      updateChain(newChain);
    },
    [ruleChain, updateChain],
  );

  // Remove node by index
  const handleRemoveNode = useCallback(
    (index: number) => {
      const nodeName = ruleChain[index];
      const newChain = ruleChain.filter((_, i) => i !== index);
      const newConfigs = { ...ruleChainConfigs };
      delete newConfigs[`${nodeName}-${index}`];
      // Re-key remaining configs for shifted indices
      const remappedConfigs: Record<string, string> = {};
      for (const [key, val] of Object.entries(newConfigs)) {
        const match = key.match(/^(.+)-(\d+)$/);
        if (match) {
          const [, name, idxStr] = match;
          const oldIdx = parseInt(idxStr, 10);
          const newIdx = oldIdx > index ? oldIdx - 1 : oldIdx;
          remappedConfigs[`${name}-${newIdx}`] = val;
        } else {
          remappedConfigs[key] = val;
        }
      }
      updateChain(newChain, remappedConfigs);
    },
    [ruleChain, ruleChainConfigs, updateChain],
  );

  // Reorder: move node from fromIndex to toIndex
  const handleReorderNode = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      const newChain = [...ruleChain];
      const [moved] = newChain.splice(fromIndex, 1);
      newChain.splice(toIndex, 0, moved);
      updateChain(newChain);
    },
    [ruleChain, updateChain],
  );

  // Click on node → open config modal
  const handleNodeClick = useCallback(
    (index: number) => {
      const nodeName = ruleChain[index];
      onNodeConfig?.(nodeName, index);
    },
    [ruleChain, onNodeConfig],
  );

  return (
    <div>
      <Alert
        type="info"
        message="可视化规则链编辑器"
        description="拖拽左侧节点到画布中添加，拖动画布中的节点调整顺序，点击节点打开配置。"
        style={{ marginBottom: 12 }}
        showIcon
      />

      <div style={{ display: 'flex', border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden', minHeight: 400 }}>
        <NodePalette
          availableNodes={availableNodes}
          onAddNode={(name) => handleAddNode(name, ruleChain.length)}
          disabled={disabled}
        />

        <ReactFlowProvider>
          <ChainFlowCanvas
            ruleChain={ruleChain}
            configs={ruleChainConfigs}
            onAddNode={handleAddNode}
            onRemoveNode={handleRemoveNode}
            onReorderNode={handleReorderNode}
            onNodeClick={handleNodeClick}
            disabled={disabled}
          />
        </ReactFlowProvider>
      </div>

      {ruleChain.length === 0 && (
        <div style={{ textAlign: 'center', padding: '16px 0', color: '#bfbfbf' }}>
          规则链为空 — 从左侧拖拽节点到画布开始配置
        </div>
      )}

      <div style={{ marginTop: 8, color: '#8c8c8c', fontSize: 12 }}>
        当前链路: {ruleChain.length > 0
          ? ruleChain.map((n, i) => `${i + 1}. ${RULE_NODE_LABELS[n] || n}`).join(' → ')
          : '空'}
      </div>
    </div>
  );
};

export default VisualRuleChainEditor;
