# 企业端套餐驱动菜单显示设计

> 日期: 2026-04-21
> 状态: Approved
> 范围: 企业管理端（enterprise-frontend）侧边栏菜单根据企业购买的套餐动态显示
> 依赖: `docs/superpowers/specs/2026-04-20-platform-admin-frontend-redesign-design.md`

## 1. 背景

企业购买不同套餐后，企业管理端的侧边栏菜单应仅显示该套餐已包含的产品菜单组。

当前架构存在以下问题：
- `EnterpriseMenuItems` 是硬编码的静态菜单
- `hasWalkingProduct` 仅支持产品级的简单过滤（boolean）
- 缺乏完整的 套餐 → 产品 → 菜单 的链路

本方案采用**后端全控**方案：后端根据企业套餐计算完整菜单配置返回给前端。

## 2. 设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 菜单配置存储 | 后端管理 | 管理员可在平台后台配置任意菜单组合 |
| 数据传输格式 | 纯数据（不含 React 组件） | 图标用字符串标识，前端映射到组件 |
| API 设计 | `GET /enterprise/package/menus` | 单一端点，返回完整菜单配置 |
| 前后端职责 | 后端计算菜单，前端渲染 | 前端只负责渲染，不关心菜单来源 |

## 3. API 设计

### Endpoint

```
GET /enterprise/package/menus
```

### Response

```typescript
{
  packageId: string;       // 套餐ID
  packageName: string;     // 套餐名称
  menus: MenuItem[];       // 完整菜单配置
}

interface MenuItem {
  key: string;             // 菜单路径或分组key
  label: string;           // 菜单名称
  icon?: string;           // 图标名称（字符串），如 "DashboardOutlined"
  children?: MenuItem[];   // 子菜单
}
```

### 响应示例

```json
{
  "packageId": "pkg_standard",
  "packageName": "标准版",
  "menus": [
    { "key": "/dashboard", "label": "数据看板", "icon": "DashboardOutlined" },
    { "key": "/members", "label": "员工管理", "icon": "TeamOutlined" },
    {
      "key": "stair-group",
      "label": "爬楼积分管理",
      "icon": "SettingOutlined",
      "children": [
        { "key": "/rules", "label": "规则配置" }
      ]
    },
    {
      "key": "walking-group",
      "label": "走路积分管理",
      "icon": "WomanOutlined",
      "children": [
        { "key": "/walking/step-config", "label": "步数换算" },
        { "key": "/walking/fun-equiv", "label": "趣味等价物" }
      ]
    }
  ]
}
```

## 4. 前端改动

### 4.1 新增 API 函数

**文件:** `enterprise-frontend/src/api/packageMenus.ts`

```typescript
import { request } from '@/utils/request';

export interface MenuItem {
  key: string;
  label: string;
  icon?: string;
  children?: MenuItem[];
}

export interface PackageMenusResponse {
  packageId: string;
  packageName: string;
  menus: MenuItem[];
}

export const getPackageMenus = () => {
  return request.get<PackageMenusResponse>('/enterprise/package/menus');
};
```

### 4.2 图标映射配置

**文件:** `enterprise-frontend/src/config/menuIcons.ts`

```typescript
import {
  DashboardOutlined,
  TeamOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingOutlined,
  TrophyOutlined,
  BarChartOutlined,
  SafetyOutlined,
  BellOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SkinOutlined,
  AppstoreOutlined,
  BookOutlined,
  FileTextOutlined,
  WomanOutlined,
  SwapOutlined,
  SmileOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';

const ICON_MAP: Record<string, React.ReactNode> = {
  DashboardOutlined: <DashboardOutlined />,
  TeamOutlined: <TeamOutlined />,
  SettingOutlined: <SettingOutlined />,
  ShopOutlined: <ShopOutlined />,
  ShoppingOutlined: <ShoppingOutlined />,
  TrophyOutlined: <TrophyOutlined />,
  BarChartOutlined: <BarChartOutlined />,
  SafetyOutlined: <SafetyOutlined />,
  BellOutlined: <BellOutlined />,
  LogoutOutlined: <LogoutOutlined />,
  UserOutlined: <UserOutlined />,
  MenuFoldOutlined: <MenuFoldOutlined />,
  MenuUnfoldOutlined: <MenuUnfoldOutlined />,
  SkinOutlined: <SkinOutlined />,
  AppstoreOutlined: <AppstoreOutlined />,
  BookOutlined: <BookOutlined />,
  FileTextOutlined: <FileTextOutlined />,
  WomanOutlined: <WomanOutlined />,
  SwapOutlined: <SwapOutlined />,
  SmileOutlined: <SmileOutlined />,
  ClockCircleOutlined: <ClockCircleOutlined />,
};

export const getIcon = (iconName?: string): React.ReactNode => {
  if (!iconName) return null;
  return ICON_MAP[iconName] || null;
};
```

### 4.3 App.tsx 改造

**改动点：**

1. 移除硬编码 `EnterpriseMenuItems`（第75-105行）
2. 移除 `ENTERPRISE_PERMISSION_MAP`（第56-73行）
3. 移除 `hasWalkingProduct` 逻辑（第128-134行）
4. 新增 `useQuery` 调用 `getPackageMenus()`
5. 菜单渲染逻辑改为使用后端返回的菜单数据

**改造后的菜单渲染逻辑：**

```typescript
const { data: menuData, isLoading: menusLoading } = useQuery({
  queryKey: ['package-menus'],
  queryFn: getPackageMenus,
  enabled: isAuthenticated,
  retry: 1,
});

const menuItems = useMemo(() => {
  if (!menuData?.menus) return [];
  return menuData.menus.map(item => ({
    ...item,
    icon: getIcon(item.icon),
    onClick: () => {
      if (item.key && !item.children) {
        navigate(item.key);
      }
    },
    children: item.children?.map(child => ({
      ...child,
      icon: getIcon(child.icon),
      onClick: () => child.key && navigate(child.key),
    })),
  }));
}, [menuData, navigate]);
```

## 5. 后端改动

### 5.1 套餐→菜单映射配置

**表结构假设：**

```sql
-- 套餐与菜单的关联表（需确认是否已存在）
CREATE TABLE package_menu (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  package_id VARCHAR(64) NOT NULL,
  menu_key VARCHAR(128) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 5.2 Service 实现

**文件:** `carbon-package/.../PackageMenuService.java`

```java
@Service
public class PackageMenuService {

    @Autowired
    private PackageMenuMapper packageMenuMapper;

    @Autowired
    private TenantPackageMapper tenantPackageMapper;

    public PackageMenusDTO getMenusByTenantId(Long tenantId) {
        // 1. 获取企业当前套餐
        TenantPackage tenantPackage = tenantPackageMapper.selectByTenantId(tenantId);

        // 2. 获取套餐包含的菜单key列表
        List<String> menuKeys = packageMenuMapper.selectKeysByPackageId(tenantPackage.getPackageId());

        // 3. 构建完整菜单配置
        List<MenuItemDTO> menus = buildMenuTree(menuKeys);

        return PackageMenusDTO.builder()
            .packageId(tenantPackage.getPackageId())
            .packageName(tenantPackage.getPackageName())
            .menus(menus)
            .build();
    }

    private List<MenuItemDTO> buildMenuTree(List<String> allowedKeys) {
        // 从预定义菜单配置中过滤出允许的菜单
        // 并构建层级结构
    }
}
```

### 5.3 Controller Endpoint

**文件:** `carbon-app/.../PackageMenuController.java`

```java
@RestController
@RequestMapping("/enterprise/package")
public class PackageMenuController {

    @Autowired
    private PackageMenuService packageMenuService;

    @GetMapping("/menus")
    public R<PackageMenusDTO> getPackageMenus() {
        Long tenantId = getCurrentTenantId();
        return R.ok(packageMenuService.getMenusByTenantId(tenantId));
    }
}
```

## 6. 数据流

```
企业登录
    ↓
后端验证 + 获取 tenantId
    ↓
PackageMenuService.getMenusByTenantId(tenantId)
    ↓
查询企业套餐 → 获取套餐ID
    ↓
查询套餐菜单关联 → 获取 menuKeys
    ↓
构建菜单树 → 返回 { packageId, packageName, menus }
    ↓
前端 getPackageMenus()
    ↓
App.tsx 渲染侧边栏
```

## 7. 渐进式迁移策略

由于涉及菜单系统的较大改造，建议分阶段实施：

### Phase 1: 后端 API（仅数据返回）
- 实现 `GET /enterprise/package/menus` 接口
- 暂时返回与现有硬编码菜单完全一致的数据
- 前端仅调用 API，但 fallback 到硬编码

### Phase 2: 前端切换
- 前端完全切换到 API 获取菜单
- 移除硬编码 `EnterpriseMenuItems`

### Phase 3: 平台后台配置化
- 在平台后台增加套餐菜单配置界面
- 将套餐菜单关联数据从配置文件迁移到数据库

## 8. 不涉及变更的部分

- H5 前端 - 不在本方案范围内
- 平台后台的套餐管理 UI - 保持不变
- 现有 `getTenantProducts` API - 保持不变
- 数据库表结构 - 假设 `package_menu` 表已存在或由 DBA 创建

## 9. 实现优先级

1. **后端 API 实现**（新增 `PackageMenuService` + `Controller`）
2. **前端 API 调用层**（新增 `getPackageMenus`）
3. **前端图标映射配置**（新增 `menuIcons.ts`）
4. **App.tsx 改造**（移除硬编码，接入新 API）
5. **平台后台配置化**（可选，作为 Phase 3）
