# Platform Admin Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign four platform admin pages (BlockLibrary, ProductManagement, PackageManagement, EnterpriseManagement) to match the multi-product SaaS platform design spec.

**Architecture:** Frontend-only changes in `saas-frontend/platform-frontend/`. No backend API changes. Each page is modified in-place. New constant file for feature→menu mapping shared across pages.

**Tech Stack:** React 18, TypeScript, Ant Design 5, @tanstack/react-query, Vite

**Design Spec:** `docs/superpowers/specs/2026-04-20-platform-admin-frontend-redesign-design.md`

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `src/constants/feature-menu-map.ts` | Create | Feature ID → enterprise menu path mapping |
| `src/pages/BlockLibrary.tsx` | Modify | Add extension guidance alerts + improve empty states |
| `src/pages/ProductManagement.tsx` | Modify | Reposition wizard, add alerts, add package column |
| `src/pages/PackageManagement.tsx` | Modify | Restructure product config modal to tree collapse panels |
| `src/pages/EnterpriseManagement.tsx` | Modify | Add permission overview tab with chain visualization |
| `src/api/platform.ts` | Modify | Add `getProductPackages` API function |

---

## Chunk 1: Shared Constants + BlockLibrary

### Task 1: Create Feature-Menu Mapping Constants

**Files:**
- Create: `saas-frontend/platform-frontend/src/constants/feature-menu-map.ts`

- [ ] **Step 1: Create the constants file**

```typescript
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
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/muxi/workspace/carbon-point/saas-frontend && pnpm --filter @carbon-point/platform-frontend build`
Expected: Build succeeds (may have warnings, no errors)

- [ ] **Step 3: Commit**

```bash
git add saas-frontend/platform-frontend/src/constants/feature-menu-map.ts
git commit -m "feat(platform-frontend): add feature-menu mapping and shared constants"
```

---

### Task 2: BlockLibrary — Add Extension Guidance + Empty State Improvements

**Files:**
- Modify: `saas-frontend/platform-frontend/src/pages/BlockLibrary.tsx`

**Current state:** BlockLibrary.tsx has three tabs (triggers/ruleNodes/features) with read-only tables. No extension guidance. Empty states use generic Ant Design `Empty`.

- [ ] **Step 1: Add import for EXTENSION_GUIDANCE and Alert**

In `BlockLibrary.tsx`, add to imports:

```typescript
import { Alert } from 'antd'; // add Alert to existing import
import { EXTENSION_GUIDANCE } from '@/constants/feature-menu-map';
```

- [ ] **Step 2: Add extension guidance Alert after each table**

For each tab's `<Table>` component, wrap it in a fragment and add an Alert below:

Triggers tab — after the `<Table>` inside the triggers tab children, add:
```tsx
<Alert
  type="info"
  showIcon
  message={EXTENSION_GUIDANCE.title}
  description={EXTENSION_GUIDANCE.description}
  style={{ marginTop: 16 }}
/>
```

Rule nodes tab — same Alert after the `<Table>`.

Features tab — same Alert after the `<Table>`.

- [ ] **Step 3: Improve empty state messages**

For each table's `locale.emptyText`, change the Empty description:

- Triggers: `"暂无已注册的触发器。请联系开发团队添加新的触发器类型。"`
- Rule nodes: `"暂无已注册的规则节点。请联系开发团队添加新的规则节点类型。"`
- Features: `"暂无已注册的功能点模板。请联系开发团队添加新的功能点类型。"`

- [ ] **Step 4: Verify build and visual check**

Run: `cd /Users/muxi/workspace/carbon-point/saas-frontend && pnpm --filter @carbon-point/platform-frontend build`

Start dev server: `pnpm --filter @carbon-point/platform-frontend dev`

Open http://localhost:3001/platform/features/blocks — verify:
- Each tab shows an info Alert at the bottom
- Empty states (if no data) show the improved messages

- [ ] **Step 5: Commit**

```bash
git add saas-frontend/platform-frontend/src/pages/BlockLibrary.tsx
git commit -m "feat(platform-frontend): add extension guidance alerts to BlockLibrary"
```

---

## Chunk 2: ProductManagement Repositioning

### Task 3: ProductManagement — Add API for Product-Package Association

**Files:**
- Modify: `saas-frontend/platform-frontend/src/api/platform.ts`

- [ ] **Step 1: Add getProductPackages API function**

Add at the end of the Product APIs section (after `deleteProduct`):

```typescript
/** Get packages that include a specific product */
export const getProductPackages = async (productId: string) => {
  const res = await platformApiClient.get(`/products/${productId}/packages`);
  return res.data;
};
```

- [ ] **Step 2: Add PackageSummary interface**

Add before the `getProductPackages` function:

```typescript
export interface PackageSummary {
  id: string;
  code: string;
  name: string;
  status: number;
}
```

- [ ] **Step 3: Commit**

```bash
git add saas-frontend/platform-frontend/src/api/platform.ts
git commit -m "feat(platform-frontend): add getProductPackages API and PackageSummary type"
```

---

### Task 4: ProductManagement — Reposition Wizard and Add Alerts

**Files:**
- Modify: `saas-frontend/platform-frontend/src/pages/ProductManagement.tsx`

This is a large file (1066 lines). Changes are targeted.

- [ ] **Step 1: Add imports**

Add to the import block:

```typescript
import { Alert } from 'antd'; // add to existing antd import
import { EXTENSION_GUIDANCE, CATEGORY_CONFIG } from '@/constants/feature-menu-map';
import { getProductPackages, PackageSummary } from '@/api/platform';
```

Remove the local `CATEGORY_OPTIONS` and `TRIGGER_TYPE_MAP` constants if they duplicate `CATEGORY_CONFIG`. Keep `RULE_NODE_LABELS` and `FEATURE_LABELS` as they are local to this page.

**Note:** `CATEGORY_OPTIONS` has a different shape (value/label/color). Replace usages with `CATEGORY_CONFIG` where appropriate. For the `<Select>` options, derive from `CATEGORY_CONFIG`:

```typescript
const CATEGORY_OPTIONS = Object.entries(CATEGORY_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
  color: cfg.color,
}));
```

Keep the existing `TRIGGER_TYPE_MAP` — it maps category to trigger label/color, which is different from `CATEGORY_CONFIG`.

- [ ] **Step 2: Change button text "新建产品向导" → "配置产品"**

Find the button with `icon={<PlusOutlined />} onClick={openWizard}` and change its label:
```tsx
// Before:
<Button type="primary" icon={<PlusOutlined />} onClick={openWizard}>
  新建产品向导
</Button>

// After:
<Button type="primary" icon={<PlusOutlined />} onClick={openWizard}>
  配置产品
</Button>
```

- [ ] **Step 3: Add guidance Alert to wizard Modal, Step 0**

Inside the wizard Modal, before the Steps component, add:

```tsx
<Alert
  type="info"
  showIcon
  message="本向导基于已注册的产品模块配置产品实例"
  description="如需全新产品类型，请联系开发团队扩展积木组件库。"
  style={{ marginBottom: 16 }}
/>
```

- [ ] **Step 4: Add extension guidance Alert to Step 1 (trigger selection)**

After the trigger selection grid (`wizardModules.map(...)`) and the Empty fallback, add:

```tsx
<Alert
  type="info"
  showIcon
  message={EXTENSION_GUIDANCE.title}
  description={EXTENSION_GUIDANCE.description}
  style={{ marginTop: 16 }}
/>
```

- [ ] **Step 5: Add extension guidance Alert to Step 2 (rule chain assembly)**

In the "Available rule nodes" section (right column), after the list of available nodes, add:

```tsx
<Alert
  type="info"
  showIcon
  message={EXTENSION_GUIDANCE.title}
  description={EXTENSION_GUIDANCE.description}
  style={{ marginTop: 12 }}
/>
```

- [ ] **Step 6: Add extension guidance Alert to Step 3 (feature selection)**

After the feature selection list, add:

```tsx
<Alert
  type="info"
  showIcon
  message={EXTENSION_GUIDANCE.title}
  description={EXTENSION_GUIDANCE.description}
  style={{ marginTop: 16 }}
/>
```

- [ ] **Step 7: Add "关联套餐" column to product table**

Add a new query to fetch package associations for the product list:

```typescript
const { data: packagesData } = useQuery({
  queryKey: ['packages'],
  queryFn: () => getPackages({ size: 100 }),
  retry: false,
  refetchOnWindowFocus: false,
});
```

Derive a product→packages map:
```typescript
const packageList = packagesData?.data?.records || packagesData?.data || [];
```

Add column before the "操作" column:

```typescript
{
  title: '关联套餐',
  dataIndex: 'id',
  width: 150,
  render: (productId: string) => {
    // Filter packages that include this product from packageList
    // Since we don't have a direct API for bulk product-package lookup,
    // show a tooltip indicating to check detail
    return <Text type="secondary">—</Text>;
  },
},
```

**Note:** The full product→package reverse lookup requires backend support or client-side mapping from package details. For MVP, show a "查看详情" link that opens the detail drawer where packages are listed. If backend provides `product.packages` field, render as Tags. Otherwise, this column shows "—" with a plan to add the backend field.

- [ ] **Step 8: Verify build and visual check**

Run: `cd /Users/muxi/workspace/carbon-point/saas-frontend && pnpm --filter @carbon-point/platform-frontend build`

Start dev server, navigate to http://localhost:3001/platform/features/products:
- "配置产品" button (was "新建产品向导")
- Wizard Step 0 shows the "配置产品实例" Alert
- Steps 1-3 show extension guidance Alerts
- Product list shows "关联套餐" column

- [ ] **Step 9: Commit**

```bash
git add saas-frontend/platform-frontend/src/pages/ProductManagement.tsx
git commit -m "feat(platform-frontend): reposition product wizard as config wizard with guidance alerts"
```

---

## Chunk 3: PackageManagement Tree Collapse

### Task 5: PackageManagement — Restructure Product Config Modal

**Files:**
- Modify: `saas-frontend/platform-frontend/src/pages/PackageManagement.tsx`

**Current state:** The product config modal uses a flat list of checkboxes with expandable sub-sections per product. Need to restructure to Ant Design `Collapse` panels.

- [ ] **Step 1: Add Collapse to antd imports**

```typescript
import { Collapse } from 'antd'; // add to existing antd import
```

- [ ] **Step 2: Replace the product list in the Modal body**

Replace the `allProducts.map(...)` block inside the `<GlassCard>` in the product config Modal with a Collapse component:

```tsx
<Collapse
  activeKey={expandedProducts}
  onChange={(keys) => setExpandedProducts(keys as string[])}
  style={{ background: 'transparent' }}
  items={allProducts
    .filter((product: Product) => selectedProducts.includes(product.id))
    .map((product: Product) => {
      const features = packageProductFeatures[product.id] || {};
      const featureList = Object.values(features) as ProductFeature[];
      const requiredCount = featureList.filter((pf) => pf.isRequired).length;
      const enabledCount = featureList.filter((pf) => pf.isEnabled).length;

      return {
        key: product.id,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong>{product.name}</strong>
            <Tag color={product.category === 'stairs_climbing' ? 'blue' : 'green'}>
              {product.category === 'stairs_climbing' ? '爬楼积分' : '走路积分'}
            </Tag>
            <span style={{ fontSize: 12, color: '#666' }}>
              {enabledCount}/{featureList.length} 功能点已启用
            </span>
          </div>
        ),
        children: (
          <div>
            <Alert
              type="info"
              showIcon
              icon={<LockOutlined />}
              message="必需功能点不可关闭，可选功能点可自由开关"
              style={{ marginBottom: 8, padding: '4px 12px' }}
              banner
            />
            {featureList.map((pf) => (
              <div
                key={pf.featureId}
                style={{
                  padding: '6px 0',
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Space>
                  <Switch
                    size="small"
                    checked={pf.isEnabled}
                    disabled={pf.isRequired}
                    onChange={(checked) => {
                      setPackageProductFeatures((prev) => ({
                        ...prev,
                        [product.id]: {
                          ...prev[product.id],
                          [pf.featureId]: { ...pf, isEnabled: checked },
                        },
                      }));
                    }}
                  />
                  <Text strong>{pf.feature?.name || pf.featureId}</Text>
                  <Tag color={pf.feature?.type === 'permission' ? 'blue' : 'orange'}>
                    {pf.feature?.type === 'permission' ? '权限' : '配置'}
                  </Tag>
                  {pf.isRequired ? (
                    <Tag color="red" icon={<LockOutlined />}>必需</Tag>
                  ) : (
                    <Tag color="default">可选</Tag>
                  )}
                </Space>
                {pf.feature?.type === 'config' && pf.isEnabled && !pf.isRequired && (
                  <div style={{ minWidth: 160 }}>
                    {pf.feature.valueType === 'boolean' ? (
                      <Switch
                        size="small"
                        checked={pf.configValue === 'true' || pf.configValue === '1'}
                        onChange={(checked) => {
                          setPackageProductFeatures((prev) => ({
                            ...prev,
                            [product.id]: {
                              ...prev[product.id],
                              [pf.featureId]: { ...pf, configValue: String(checked) },
                            },
                          }));
                        }}
                        checkedChildren="开"
                        unCheckedChildren="关"
                      />
                    ) : (
                      <Input
                        size="small"
                        value={pf.configValue || ''}
                        placeholder={pf.feature?.defaultValue || '配置值'}
                        onChange={(e) => {
                          setPackageProductFeatures((prev) => ({
                            ...prev,
                            [product.id]: {
                              ...prev[product.id],
                              [pf.featureId]: { ...pf, configValue: e.target.value },
                            },
                          }));
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
            <Button
              type="primary"
              size="small"
              style={{ marginTop: 8 }}
              icon={<CheckCircleOutlined />}
              onClick={() => {
                const features = Object.values(packageProductFeatures[product.id] || {}).map((pf: ProductFeature) => ({
                  featureId: pf.featureId,
                  configValue: pf.configValue,
                  isEnabled: pf.isEnabled,
                }));
                updateProductFeaturesMutation.mutate({
                  packageId: selectedPackage?.id,
                  productId: product.id,
                  features,
                });
              }}
              loading={updateProductFeaturesMutation.isPending}
            >
              保存该产品功能点
            </Button>
          </div>
        ),
      };
    })
  }
/>
```

- [ ] **Step 3: Keep the product selection checkboxes above the Collapse**

Above the Collapse, keep the product selection area as checkboxes:

```tsx
<div style={{ marginBottom: 16 }}>
  <h4>选择产品</h4>
  {allProducts.length === 0 ? (
    <Empty description="暂无可用产品" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  ) : (
    <Space wrap>
      {allProducts.map((product: Product) => (
        <Checkbox
          key={product.id}
          checked={selectedProducts.includes(product.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedProducts([...selectedProducts, product.id]);
              setExpandedProducts([...expandedProducts, product.id]);
            } else {
              setSelectedProducts(selectedProducts.filter((id) => id !== product.id));
              setExpandedProducts(expandedProducts.filter((id) => id !== product.id));
              const newFeatures = { ...packageProductFeatures };
              delete newFeatures[product.id];
              setPackageProductFeatures(newFeatures);
            }
          }}
        >
          {product.name}
          <Tag color={product.category === 'stairs_climbing' ? 'blue' : 'green'} style={{ marginLeft: 4 }}>
            {product.category === 'stairs_climbing' ? '爬楼积分' : '走路积分'}
          </Tag>
        </Checkbox>
      ))}
    </Space>
  )}
</div>
```

- [ ] **Step 4: Verify build and visual check**

Run: `cd /Users/muxi/workspace/carbon-point/saas-frontend && pnpm --filter @carbon-point/platform-frontend build`

Start dev server, navigate to http://localhost:3001/platform/packages:
- Click "配置产品" on a package
- Products shown as checkboxes at top
- Checked products appear as Collapse panels below
- Expand a panel to see feature list with switches
- Feature toggle and save work correctly

- [ ] **Step 5: Commit**

```bash
git add saas-frontend/platform-frontend/src/pages/PackageManagement.tsx
git commit -m "feat(platform-frontend): restructure package product config to tree collapse panels"
```

---

## Chunk 4: EnterpriseManagement Permission Overview

### Task 6: EnterpriseManagement — Add Permission Overview Tab

**Files:**
- Modify: `saas-frontend/platform-frontend/src/pages/EnterpriseManagement.tsx`

**Current state:** Enterprise detail modal has 3 tabs (info/users/products). Need to add 4th tab "权限总览" with chain visualization and product permission panels.

- [ ] **Step 1: Add imports**

```typescript
import { Collapse } from 'antd'; // add to existing antd import
import { FEATURE_MENU_MAP } from '@/constants/feature-menu-map';
```

- [ ] **Step 2: Add new queries for permission data**

After the existing `tenantProductsData` query, add:

```typescript
const { data: packageDetailData, isLoading: packageDetailLoading } = useQuery({
  queryKey: ['package-detail-for-permission', editingEnterprise?.packageId],
  queryFn: () => getPackageDetail(editingEnterprise!.packageId!),
  enabled: !!editingEnterprise?.packageId && detailModalOpen && detailActiveTab === 'permissions',
  retry: false,
});
```

- [ ] **Step 3: Implement renderPermissionOverview function**

Add a new render function after `renderDetailProducts`:

```typescript
const renderPermissionOverview = () => {
  if (!editingEnterprise?.packageId) {
    return (
      <Empty
        description="该企业尚未绑定套餐，无法查看权限信息"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  if (packageDetailLoading || tenantProductsLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 32 }}>
        <Spin tip="加载中..." />
      </div>
    );
  }

  const products = tenantProductsData?.data || [];
  const packageDetail = packageDetailData?.data;
  const packageProducts = packageDetail?.products || [];

  // Calculate stats
  let totalFeatures = 0;
  let enabledFeatures = 0;
  let totalMenus = 0;

  products.forEach((product: TenantProductInfo) => {
    const pkgProduct = packageProducts.find(
      (pp: PackageProduct) => pp.productId === product.productId
    );
    const features = pkgProduct?.features || [];
    features.forEach((f: PackageProductFeature) => {
      totalFeatures++;
      if (f.isEnabled) {
        enabledFeatures++;
        const menus = FEATURE_MENU_MAP[f.featureId];
        if (menus) totalMenus++;
      }
    });
  });

  // Chain visualization
  const chainItems = [
    {
      label: '套餐',
      value: editingEnterprise.packageName || '—',
      color: '#ddf4ff',
      borderColor: '#0969da',
      textColor: '#0969da',
    },
    {
      label: '包含产品',
      value: `${products.length} 个`,
      color: '#dafbe1',
      borderColor: '#1a7f37',
      textColor: '#1a7f37',
    },
    {
      label: '启用功能点',
      value: `${enabledFeatures} 个`,
      color: '#fff8c5',
      borderColor: '#bf8700',
      textColor: '#9a6700',
    },
    {
      label: '企业菜单',
      value: `${totalMenus} 个`,
      color: '#f1e8ff',
      borderColor: '#8250df',
      textColor: '#8250df',
    },
  ];

  // Build collapse panels for each product
  const collapseItems = products.map((product: TenantProductInfo) => {
    const pkgProduct = packageProducts.find(
      (pp: PackageProduct) => pp.productId === product.productId
    );
    const features = pkgProduct?.features || [];
    const enabledCount = features.filter((f: PackageProductFeature) => f.isEnabled).length;

    return {
      key: product.productId || product.productCode,
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600 }}>{product.productName}</span>
          <Tag color={CATEGORY_COLOR_MAP[product.category] || 'default'}>
            {CATEGORY_LABEL_MAP[product.category] || product.category}
          </Tag>
          <span style={{ fontSize: 12, color: '#666' }}>
            {enabledCount}/{features.length} 已启用
          </span>
        </div>
      ),
      children: features.length === 0 ? (
        <Empty description="暂无功能点配置" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
              <th style={{ padding: '6px 8px', textAlign: 'left', width: 60 }}>类型</th>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>功能点</th>
              <th style={{ padding: '6px 8px', textAlign: 'center', width: 60 }}>状态</th>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>对应企业菜单</th>
            </tr>
          </thead>
          <tbody>
            {features.map((f: PackageProductFeature) => {
              const menus = FEATURE_MENU_MAP[f.featureId];
              return (
                <tr key={f.featureId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '6px 8px' }}>
                    <Tag color={f.isEnabled ? undefined : 'default'} style={{ fontSize: 11 }}>
                      {/* required detection: if feature is not in the optional list, treat as required */}
                      {f.isEnabled ? '启用' : '禁用'}
                    </Tag>
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    {f.feature?.name || f.featureId}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                    {f.isEnabled ? (
                      <span style={{ color: '#1a7f37' }}>●</span>
                    ) : (
                      <span style={{ color: '#8b949e' }}>○</span>
                    )}
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    {f.isEnabled && menus ? (
                      <span style={{ color: '#656d76' }}>{menus.join(' / ')}</span>
                    ) : (
                      <span style={{ color: '#8b949e', fontStyle: 'italic' }}>
                        {f.isEnabled ? '— 菜单映射未定义' : '— 未启用，无菜单'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ),
    };
  });

  return (
    <div>
      {/* Chain visualization */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        marginBottom: 24,
        padding: '16px 0',
      }}>
        {chainItems.map((item, index) => (
          <React.Fragment key={item.label}>
            <div style={{
              background: item.color,
              border: `1px solid ${item.borderColor}`,
              borderRadius: index === 0 ? '8px 0 0 8px' : index === chainItems.length - 1 ? '0 8px 8px 0' : '0',
              padding: '12px 20px',
              textAlign: 'center',
              minWidth: 120,
            }}>
              <div style={{ fontSize: 11, color: '#656d76' }}>{item.label}</div>
              <div style={{ fontWeight: 'bold', color: item.textColor }}>{item.value}</div>
            </div>
            {index < chainItems.length - 1 && (
              <span style={{ color: '#d0d7de', fontSize: 20, margin: '0 4px' }}>→</span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Product permission detail panels */}
      {products.length === 0 ? (
        <Empty
          description="该企业尚未启用任何产品"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <Collapse items={collapseItems} defaultActiveKey={products.map((p: TenantProductInfo) => p.productId || p.productCode)} />
      )}
    </div>
  );
};
```

- [ ] **Step 4: Add the "权限总览" tab to the detail Modal Tabs**

In the `<Tabs>` inside the detail Modal, add a new tab item:

```tsx
{
  key: 'permissions',
  label: '权限总览',
  children: renderPermissionOverview(),
},
```

- [ ] **Step 5: Verify build and visual check**

Run: `cd /Users/muxi/workspace/carbon-point/saas-frontend && pnpm --filter @carbon-point/platform-frontend build`

Start dev server, navigate to http://localhost:3001/platform/enterprises:
- Click "详情" on an enterprise that has a package bound
- See 4 tabs: 基本信息 / 用户管理 / 已启用产品 / 权限总览
- Click "权限总览" tab
- Verify chain visualization shows: 套餐 → 包含产品 → 启用功能点 → 企业菜单
- Verify product collapse panels show feature details with menu mapping

- [ ] **Step 6: Commit**

```bash
git add saas-frontend/platform-frontend/src/pages/EnterpriseManagement.tsx
git commit -m "feat(platform-frontend): add permission overview tab with chain visualization"
```

---

## Implementation Sequencing

```
Task 1 (constants) ──→ Task 2 (BlockLibrary)
                     ──→ Task 3 (API) ──→ Task 4 (ProductManagement)
                     ──→ Task 5 (PackageManagement)
                     ──→ Task 6 (EnterpriseManagement)
```

**Tasks 2, 5, 6 are independent** — can be parallelized once Task 1 (shared constants) is complete.

Task 3 (API addition) and Task 4 (ProductManagement) should be sequential.

## Verification Checklist

After all tasks complete:

- [ ] `pnpm --filter @carbon-point/platform-frontend build` passes with no errors
- [ ] BlockLibrary: each tab shows extension guidance Alert at bottom
- [ ] ProductManagement: button says "配置产品", wizard shows guidance alerts, "关联套餐" column visible
- [ ] PackageManagement: product config modal uses Collapse panels, feature toggles work
- [ ] EnterpriseManagement: "权限总览" tab shows chain visualization and product permission details
- [ ] No regression in existing functionality (CRUD, navigation, status toggles)
