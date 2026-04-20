/**
 * Maps feature type IDs to enterprise admin menu paths.
 * Used in EnterpriseManagement permission overview to show
 * which menus each feature enables.
 */
export const FEATURE_MENU_MAP: Record<string, string[]> = {
  // Stair climbing product features
  time_slot: ['爬楼积分管理', '时段规则配置'],
  special_date: ['爬楼积分管理', '节假日翻倍配置'],
  weekly_gift: ['爬楼积分管理', '周三活动配置'],
  consecutive_reward: ['爬楼积分管理', '连续打卡奖励配置'],
  points_exchange: ['积分商城'],
  daily_cap: ['爬楼积分管理', '每日上限配置'],
  holiday_bonus: ['爬楼积分管理', '节假日加成配置'],

  // Walking product features
  step_calc_config: ['走路积分管理', '步数换算配置'],
  fun_equivalence: ['走路积分管理', '趣味等价物配置'],
};

/**
 * Extension guidance alert config — reused across multiple pages.
 */
export const EXTENSION_GUIDANCE = {
  title: '需要更多组件？',
  description: '如需新的触发器/规则节点/功能点类型，请联系开发团队扩展积木组件库。',
} as const;

/**
 * Feature type display names in Chinese.
 */
export const FEATURE_TYPE_LABELS: Record<string, string> = {
  consecutive_reward: '连续打卡奖励',
  special_date: '特殊日期',
  fun_equivalence: '趣味等价物',
  points_exchange: '积分兑换',
  time_slot: '时段规则',
  daily_cap: '每日上限',
  holiday_bonus: '节假日加成',
  step_calc_config: '步数换算配置',
};

/**
 * Product category display config.
 */
export const CATEGORY_CONFIG: Record<string, { label: string; color: string; triggerLabel: string }> = {
  stairs_climbing: { label: '爬楼积分', color: 'blue', triggerLabel: '爬楼打卡' },
  walking: { label: '走路积分', color: 'green', triggerLabel: '走路计步' },
};
