/**
 * Maps feature type IDs to enterprise admin menu paths.
 * Used in EnterpriseManagement permission overview to show
 * which menus each feature enables.
 */
export const FEATURE_MENU_MAP: Record<string, string[]> = {
  // Stair climbing product features
  'checkin.stairs': ['爬楼打卡'],
  'points.exchange': ['积分商城'],
  'mall.virtual': ['虚拟商品'],
  'honor.badge': ['徽章体系'],
  'honor.leaderboard': ['排行榜'],

  // Walking product features
  'checkin.walking': ['走路打卡'],
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
  'checkin.stairs': '爬楼梯打卡',
  'checkin.walking': '步行打卡',
  'points.exchange': '积分兑换',
  'mall.virtual': '虚拟商品兑换',
  'honor.badge': '徽章体系',
  'honor.leaderboard': '排行榜',
};

/**
 * Product category display config.
 */
export const CATEGORY_CONFIG: Record<string, { label: string; color: string; triggerLabel: string }> = {
  stairs_climbing: { label: '爬楼积分', color: 'blue', triggerLabel: '爬楼打卡' },
  walking: { label: '走路积分', color: 'green', triggerLabel: '走路计步' },
};
