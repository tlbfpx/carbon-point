import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  Handle,
  Position,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ChainNode from './ChainNode';
import {
  chainToFlowNodes,
  chainToFlowEdges,
  getInsertionIndex,
  START_Y,
  NODE_HEIGHT,
  NODE_GAP,
  getCanvasHeight,
} from './chain-utils';

// ── Decorative Start/End nodes ─────────────────────────────────────────────

const StartNode: React.FC<NodeProps> = ({ data }) => (
  <div
    style={{
      padding: '6px 20px',
      background: '#F6FFED',
      border: '2px solid #52C41A',
      borderRadius: 20,
      fontWeight: 600,
      fontSize: 12,
      color: '#389E0D',
      textAlign: 'center',
    }}
  >
    <Handle type="source" position={Position.Bottom} style={{ background: '#52C41A', width: 8, height: 8 }} />
    {(data as { label: string }).label}
  </div>
);

const EndNode: React.FC<NodeProps> = ({ data }) => (
  <div
    style={{
      padding: '6px 20px',
      background: '#E6F7FF',
      border: '2px solid #1890FF',
      borderRadius: 20,
      fontWeight: 600,
      fontSize: 12,
      color: '#096DD9',
      textAlign: 'center',
    }}
  >
    <Handle type="target" position={Position.Top} style={{ background: '#1890FF', width: 8, height: 8 }} />
    {(data as { label: string }).label}
  </div>
);

interface ChainFlowCanvasProps {
  ruleChain: string[];
  configs: Record<string, string>;
  onAddNode: (nodeName: string, atIndex: number) => void;
  onRemoveNode: (index: number) => void;
  onReorderNode: (fromIndex: number, toIndex: number) => void;
  onNodeClick: (index: number) => void;
  disabled?: boolean;
}

const nodeTypes = {
  chainNode: ChainNode,
  startNode: StartNode,
  endNode: EndNode,
};

const ChainFlowCanvas: React.FC<ChainFlowCanvasProps> = ({
  ruleChain,
  configs,
  onAddNode,
  onRemoveNode,
  onReorderNode,
  onNodeClick,
  disabled,
}) => {
  const { screenToFlowPosition } = useReactFlow();

  const nodes = useMemo(
    () => chainToFlowNodes(ruleChain, configs),
    [ruleChain, configs],
  );

  const edges = useMemo(
    () => chainToFlowEdges(nodes),
    [nodes],
  );

  const canvasHeight = useMemo(
    () => getCanvasHeight(ruleChain.length),
    [ruleChain.length],
  );

  // Handle palette drop
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const nodeName = e.dataTransfer.getData('application/reactflow');
      if (!nodeName || disabled) return;

      const position = screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });
      const insertIndex = getInsertionIndex(position.y, ruleChain.length);
      onAddNode(nodeName, insertIndex);
    },
    [screenToFlowPosition, ruleChain.length, onAddNode, disabled],
  );

  // Handle node drag stop → reorder
  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (!node.id.startsWith('chain-') || disabled) return;

      const fromIndex = parseInt(node.id.replace('chain-', ''), 10);
      const relativeY = node.position.y - START_Y;
      const toIndex = Math.max(0, Math.min(
        ruleChain.length - 1,
        Math.round(relativeY / (NODE_HEIGHT + NODE_GAP)),
      ));

      if (fromIndex !== toIndex) {
        onReorderNode(fromIndex, toIndex);
      }
    },
    [ruleChain.length, onReorderNode, disabled],
  );

  // Handle node click → configure
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (!node.id.startsWith('chain-') || disabled) return;
      const index = parseInt(node.id.replace('chain-', ''), 10);
      onNodeClick(index);
    },
    [onNodeClick, disabled],
  );

  return (
    <div style={{ flex: 1, height: Math.max(400, canvasHeight) }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={!disabled}
        nodesConnectable={false}
        elementsSelectable={!disabled}
        minZoom={0.5}
        maxZoom={1.5}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
        }}
      >
        <Background gap={16} size={1} color="#f0f0f0" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          style={{ height: 80 }}
        />
      </ReactFlow>
    </div>
  );
};

export default ChainFlowCanvas;
