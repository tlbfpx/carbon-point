import type { Node, Edge } from '@xyflow/react';

// ── Constants ──────────────────────────────────────────────────────────────

/** Node dimensions and layout */
export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 72;
export const NODE_GAP = 56;
export const START_Y = 80;
export const CENTER_X = 280;

/** Nodes that can short-circuit the chain (stop execution) */
export const SHORT_CIRCUIT_NODES = new Set([
  'workdayFilter', 'workday_filter',
  'quizCheck', 'quiz_check',
]);

/** Display name mapping: camelCase/snake_case → Chinese label */
export const RULE_NODE_LABELS: Record<string, string> = {
  timeSlotMatch: '时段匹配',
  time_slot_match: '时段匹配',
  randomBase: '随机基数',
  random_base: '随机基数',
  specialDateMultiplier: '特殊日期倍率',
  special_date_multiplier: '特殊日期倍率',
  levelCoefficient: '等级系数',
  level_coefficient: '等级系数',
  round: '取整',
  thresholdFilter: '阈值过滤',
  threshold_filter: '阈值过滤',
  formulaCalc: '公式计算',
  formula_calc: '公式计算',
  dailyCap: '每日上限',
  daily_cap: '每日上限',
  workdayFilter: '工作日过滤',
  workday_filter: '工作日过滤',
  floorPoints: '楼层积分',
  floor_points: '楼层积分',
  stepTierMatch: '步数梯度匹配',
  step_tier_match: '步数梯度匹配',
  funConversion: '趣味换算',
  fun_conversion: '趣味换算',
  quizCheck: '答题检查',
  quiz_check: '答题检查',
  quizPoints: '答题积分',
  quiz_points: '答题积分',
};

/** Node descriptions for palette */
export const RULE_NODE_DESCRIPTIONS: Record<string, string> = {
  timeSlotMatch: '检查当前时间是否在有效时段内',
  randomBase: '在配置区间内生成随机基础积分',
  specialDateMultiplier: '特殊日期积分倍率加成',
  levelCoefficient: '根据用户等级应用积分系数',
  round: '对积分结果进行取整处理',
  dailyCap: '限制每日积分上限',
  thresholdFilter: '过滤低于阈值的步数',
  formulaCalc: '按公式计算步数对应积分',
  workdayFilter: '仅在工作日/自定义日期生效',
  floorPoints: '按楼层层数计算额外积分',
  stepTierMatch: '匹配步数所在梯度区间',
  funConversion: '将步数换算为趣味等价物（仅展示）',
  quizCheck: '检查每日答题次数是否已达上限',
  quizPoints: '根据答题正确性发放积分',
};

// ── Types ──────────────────────────────────────────────────────────────────

export interface ChainNodeData extends Record<string, unknown> {
  nodeName: string;       // camelCase name (e.g. "timeSlotMatch")
  displayName: string;    // Chinese label
  stepIndex: number;      // 1-based position
  hasConfig: boolean;
  isShortCircuit: boolean;
  description: string;
}

// ── Utility Functions ──────────────────────────────────────────────────────

/** Convert ruleChain + configs into React Flow Nodes */
export function chainToFlowNodes(
  ruleChain: string[],
  configs: Record<string, string>,
): Node<ChainNodeData>[] {
  const chainNodes: Node<ChainNodeData>[] = ruleChain.map((nodeName, i) => ({
    id: `chain-${i}`,
    type: 'chainNode' as const,
    position: { x: CENTER_X, y: START_Y + i * (NODE_HEIGHT + NODE_GAP) },
    data: {
      nodeName,
      displayName: RULE_NODE_LABELS[nodeName] || nodeName,
      stepIndex: i + 1,
      hasConfig: !!configs[`${nodeName}-${i}`],
      isShortCircuit: SHORT_CIRCUIT_NODES.has(nodeName),
      description: RULE_NODE_DESCRIPTIONS[nodeName] || '',
    },
    draggable: true,
    deletable: true,
  }));

  // Prepend Start node
  const startNode: Node = {
    id: 'start',
    type: 'startNode',
    position: { x: CENTER_X, y: 0 },
    data: { label: '输入' },
    draggable: false,
    deletable: false,
  };

  // Append End node
  const endY = START_Y + ruleChain.length * (NODE_HEIGHT + NODE_GAP);
  const endNode: Node = {
    id: 'end',
    type: 'endNode',
    position: { x: CENTER_X, y: endY },
    data: { label: '输出' },
    draggable: false,
    deletable: false,
  };

  return [startNode, ...chainNodes, endNode] as Node<ChainNodeData>[];
}

/** Generate edges connecting sequential nodes */
export function chainToFlowEdges(nodes: Node[]): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const sourceData = nodes[i].data as ChainNodeData | { label: string };
    const isAfterShortCircuit = 'isShortCircuit' in sourceData && sourceData.isShortCircuit;
    edges.push({
      id: `edge-${nodes[i].id}-${nodes[i + 1].id}`,
      source: nodes[i].id,
      target: nodes[i + 1].id,
      type: 'smoothstep',
      animated: true,
      style: {
        stroke: isAfterShortCircuit ? '#FA8C16' : '#722ED1',
        strokeWidth: 2,
      },
    });
  }
  return edges;
}

/** Determine insertion index from drop Y-coordinate */
export function getInsertionIndex(dropY: number, chainLength: number): number {
  if (chainLength === 0) return 0;
  // Map Y to chain position
  const relativeY = dropY - START_Y;
  const step = NODE_HEIGHT + NODE_GAP;
  const index = Math.round(relativeY / step);
  return Math.max(0, Math.min(chainLength, index));
}

/** Recalculate node positions after chain change */
export function recalculatePositions(nodes: Node<ChainNodeData>[]): Node<ChainNodeData>[] {
  const chainNodes = nodes.filter(n => n.id.startsWith('chain-'));
  const startNode = nodes.find(n => n.id === 'start');
  const endNode = nodes.find(n => n.id === 'end');

  const updated = chainNodes.map((node, i) => ({
    ...node,
    position: { x: CENTER_X, y: START_Y + i * (NODE_HEIGHT + NODE_GAP) },
    data: {
      ...node.data,
      stepIndex: i + 1,
    },
  }));

  const endY = START_Y + chainNodes.length * (NODE_HEIGHT + NODE_GAP);

  return [
    { ...startNode!, position: { x: CENTER_X, y: 0 } },
    ...updated,
    { ...endNode!, position: { x: CENTER_X, y: endY } },
  ] as Node<ChainNodeData>[];
}

/** Compute canvas height based on chain length */
export function getCanvasHeight(chainLength: number): number {
  return START_Y + chainLength * (NODE_HEIGHT + NODE_GAP) + 120;
}
