# 企业端套餐驱动菜单显示实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 企业管理端侧边栏菜单根据企业购买的套餐动态显示，后端返回完整菜单配置，前端负责渲染。

**Architecture:** 后端新增 `/enterprise/package/menus` 接口，根据企业套餐计算出可用菜单返回；前端新增 API 调用和图标映射配置，改造 App.tsx 移除硬编码菜单，接入新 API。

**Tech Stack:** Spring Boot (后端), React + Ant Design (前端)

---

## 文件结构

### 后端新增文件

| 文件 | 职责 |
|------|------|
| `carbon-package/src/main/java/.../dto/PackageMenusDTO.java` | 菜单响应 DTO |
| `carbon-package/src/main/java/.../mapper/PackageMenuMapper.java` | 套餐菜单关联 Mapper |
| `carbon-package/src/main/java/.../service/PackageMenuService.java` | 套餐菜单 Service |

### 后端修改文件

| 文件 | 变更 |
|------|------|
| `carbon-app/src/main/java/.../controller/EnterprisePackageController.java` | 新增 GET `/enterprise/package/menus` 端点 |

### 前端新增文件

| 文件 | 职责 |
|------|------|
| `enterprise-frontend/src/api/packageMenus.ts` | `getPackageMenus()` API 函数 |
| `enterprise-frontend/src/config/menuIcons.ts` | 图标名称→React组件映射 |

### 前端修改文件

| 文件 | 变更 |
|------|------|
| `enterprise-frontend/src/App.tsx` | 移除硬编码菜单，接入新 API |

---

## Phase 1: 后端 API

### Task 1: 创建 PackageMenusDTO

**Files:**
- Create: `saas-backend/carbon-package/src/main/java/com/carbon/point/dto/PackageMenusDTO.java`

- [ ] **Step 1: 创建 DTO 类**

```java
package com.carbon.point.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class PackageMenusDTO {

    private String packageId;       // 套餐ID
    private String packageName;     // 套餐名称
    private List<MenuItemDTO> menus; // 菜单列表

    @Data
    @Builder
    public static class MenuItemDTO {
        private String key;          // 菜单key（路径或分组key）
        private String label;       // 菜单名称
        private String icon;        // 图标名称
        private List<MenuItemDTO> children; // 子菜单
    }
}
```

- [ ] **Step 2: 提交**

```bash
git add saas-backend/carbon-package/src/main/java/com/carbon/point/dto/PackageMenusDTO.java
git commit -m "feat(package): add PackageMenusDTO for menu response"
```

---

### Task 2: 创建 PackageMenuMapper

**Files:**
- Create: `saas-backend/carbon-package/src/main/java/com/carbon/point/mapper/PackageMenuMapper.java`
- Modify: `saas-backend/carbon-package/src/main/resources/mapper/PackageMenuMapper.xml`

- [ ] **Step 1: 创建 Mapper 接口**

```java
package com.carbon.point.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbon.point.entity.PackageMenuEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface PackageMenuMapper extends BaseMapper<PackageMenuEntity> {

    /**
     * 根据套餐ID查询菜单key列表
     */
    List<String> selectKeysByPackageId(@Param("packageId") String packageId);
}
```

- [ ] **Step 2: 创建 Mapper XML**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.carbon.point.mapper.PackageMenuMapper">

    <select id="selectKeysByPackageId" resultType="java.lang.String">
        SELECT menu_key FROM package_menu
        WHERE package_id = #{packageId}
        ORDER BY sort_order
    </select>

</mapper>
```

- [ ] **Step 3: 提交**

```bash
git add saas-backend/carbon-package/src/main/java/com/carbon/point/mapper/PackageMenuMapper.java
git add saas-backend/carbon-package/src/main/resources/mapper/PackageMenuMapper.xml
git commit -m "feat(package): add PackageMenuMapper for package-menu relation"
```

---

### Task 3: 创建 PackageMenuService

**Files:**
- Create: `saas-backend/carbon-package/src/main/java/com/carbon/point/service/PackageMenuService.java`

- [ ] **Step 1: 创建 Service**

```java
package com.carbon.point.service;

import com.carbon.point.dto.PackageMenusDTO;
import com.carbon.point.dto.PackageMenusDTO.MenuItemDTO;
import com.carbon.point.mapper.PackageMenuMapper;
import com.carbon.point.mapper.TenantPackageMapper;
import com.carbon.point.entity.TenantPackageEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PackageMenuService {

    private final PackageMenuMapper packageMenuMapper;
    private final TenantPackageMapper tenantPackageMapper;

    /**
     * 预定义的完整菜单配置（用于过滤）
     */
    private static final List<MenuItemDTO> ALL_MENUS = Arrays.asList(
        MenuItemDTO.builder().key("/dashboard").label("数据看板").icon("DashboardOutlined").build(),
        MenuItemDTO.builder().key("/members").label("员工管理").icon("TeamOutlined").build(),
        MenuItemDTO.builder()
            .key("stair-group")
            .label("爬楼积分管理")
            .icon("SettingOutlined")
            .children(Arrays.asList(
                MenuItemDTO.builder().key("/rules").label("规则配置").build()
            ))
            .build(),
        MenuItemDTO.builder()
            .key("walking-group")
            .label("走路积分管理")
            .icon("WomanOutlined")
            .children(Arrays.asList(
                MenuItemDTO.builder().key("/walking/step-config").label("步数换算").icon("SwapOutlined").build(),
                MenuItemDTO.builder().key("/walking/fun-equiv").label("趣味等价物").icon("SmileOutlined").build()
            ))
            .build(),
        MenuItemDTO.builder().key("/products").label("产品管理").icon("ShopOutlined").build(),
        MenuItemDTO.builder().key("/orders").label("订单管理").icon("ShoppingOutlined").build(),
        MenuItemDTO.builder().key("/points").label("积分运营").icon("TrophyOutlined").build(),
        MenuItemDTO.builder().key("/point-expiration").label("积分过期配置").icon("ClockCircleOutlined").build(),
        MenuItemDTO.builder().key("/reports").label("数据报表").icon("BarChartOutlined").build(),
        MenuItemDTO.builder().key("/roles").label("角色管理").icon("SafetyOutlined").build(),
        MenuItemDTO.builder().key("/feature-matrix").label("功能点阵").icon("AppstoreOutlined").build(),
        MenuItemDTO.builder().key("/dict-management").label("字典管理").icon("BookOutlined").build(),
        MenuItemDTO.builder().key("/branding").label("品牌配置").icon("SkinOutlined").build(),
        MenuItemDTO.builder().key("/operation-log").label("操作日志").icon("FileTextOutlined").build()
    );

    public PackageMenusDTO getMenusByTenantId(Long tenantId) {
        // 1. 获取企业当前套餐
        TenantPackageEntity tenantPackage = tenantPackageMapper.selectByTenantId(tenantId);
        if (tenantPackage == null) {
            return PackageMenusDTO.builder()
                .packageId("")
                .packageName("未购买套餐")
                .menus(List.of())
                .build();
        }

        // 2. 获取套餐包含的菜单key列表
        List<String> allowedKeys = packageMenuMapper.selectKeysByPackageId(tenantPackage.getPackageId());

        // 3. 过滤并构建菜单树
        List<MenuItemDTO> filteredMenus = buildMenuTree(allowedKeys);

        return PackageMenusDTO.builder()
            .packageId(tenantPackage.getPackageId())
            .packageName(tenantPackage.getPackageName())
            .menus(filteredMenus)
            .build();
    }

    private List<MenuItemDTO> buildMenuTree(List<String> allowedKeys) {
        return ALL_MENUS.stream()
            .filter(menu -> allowedKeys.contains(menu.getKey()))
            .map(menu -> {
                if (menu.getChildren() != null && !menu.getChildren().isEmpty()) {
                    List<MenuItemDTO> filteredChildren = menu.getChildren().stream()
                        .filter(child -> allowedKeys.contains(child.getKey()))
                        .collect(Collectors.toList());
                    return MenuItemDTO.builder()
                        .key(menu.getKey())
                        .label(menu.getLabel())
                        .icon(menu.getIcon())
                        .children(filteredChildren)
                        .build();
                }
                return menu;
            })
            .collect(Collectors.toList());
    }
}
```

- [ ] **Step 2: 提交**

```bash
git add saas-backend/carbon-package/src/main/java/com/carbon/point/service/PackageMenuService.java
git commit -m "feat(package): add PackageMenuService for dynamic menu calculation"
```

---

### Task 4: 创建 PackageMenuController

**Files:**
- Modify: `saas-backend/carbon-app/src/main/java/com/carbon/point/controller/EnterprisePackageController.java`

- [ ] **Step 1: 添加 Controller 端点**

在 `EnterprisePackageController`（或新建）中添加：

```java
@Autowired
private PackageMenuService packageMenuService;

/**
 * 获取企业套餐对应的菜单配置
 */
@GetMapping("/package/menus")
public R<PackageMenusDTO> getPackageMenus() {
    Long tenantId = getCurrentTenantId(); // 从上下文获取当前租户ID
    return R.ok(packageMenuService.getMenusByTenantId(tenantId));
}
```

- [ ] **Step 2: 提交**

```bash
git add saas-backend/carbon-app/src/main/java/com/carbon/point/controller/EnterprisePackageController.java
git commit -m "feat(package): add GET /enterprise/package/menus endpoint"
```

---

## Phase 2: 前端 API + 图标配置

### Task 5: 创建前端 API 函数

**Files:**
- Create: `enterprise-frontend/src/api/packageMenus.ts`

- [ ] **Step 1: 创建 API 函数**

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

- [ ] **Step 2: 提交**

```bash
git add enterprise-frontend/src/api/packageMenus.ts
git commit -m "feat(frontend): add getPackageMenus API function"
```

---

### Task 6: 创建图标映射配置

**Files:**
- Create: `enterprise-frontend/src/config/menuIcons.ts`

- [ ] **Step 1: 创建图标映射配置**

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
import React from 'react';

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

- [ ] **Step 2: 提交**

```bash
git add enterprise-frontend/src/config/menuIcons.ts
git commit -m "feat(frontend): add menuIcons config for icon name mapping"
```

---

## Phase 3: App.tsx 改造

### Task 7: 改造 App.tsx

**Files:**
- Modify: `enterprise-frontend/src/App.tsx`

- [ ] **Step 1: 移除硬编码配置**

移除第 56-73 行：
```typescript
// 删除 ENTERPRISE_PERMISSION_MAP
```

移除第 75-105 行：
```typescript
// 删除 EnterpriseMenuItems
```

移除第 128-134 行：
```typescript
// 删除 hasWalkingProduct 逻辑
```

- [ ] **Step 2: 添加 import**

```typescript
import { getPackageMenus, type MenuItem } from '@/api/packageMenus';
import { getIcon } from '@/config/menuIcons';
```

- [ ] **Step 3: 替换菜单数据获取逻辑**

将第 121-126 行：
```typescript
// 原：
const { data: tenantProducts, isLoading: productsLoading } = useQuery({
  queryKey: ['tenant-products'],
  queryFn: getTenantProducts,
  enabled: isAuthenticated,
  retry: 1,
});
```

替换为：
```typescript
// 新：
const { data: menuData, isLoading: menusLoading } = useQuery({
  queryKey: ['package-menus'],
  queryFn: getPackageMenus,
  enabled: isAuthenticated,
  retry: 1,
});
```

- [ ] **Step 4: 替换菜单过滤和渲染逻辑**

将第 147-176 行：
```typescript
// 原：
const menuItems = EnterpriseMenuItems
  .filter(item => {
    // ... 原有过滤逻辑
  })
  .map(item => {
    // ... 原有映射逻辑
  });
```

替换为：
```typescript
// 新：
const menuItems = useMemo(() => {
  if (!menuData?.menus) return [];
  return menuData.menus.map((item: MenuItem) => ({
    ...item,
    icon: getIcon(item.icon),
    onClick: () => {
      if (item.key && !item.children) {
        navigate(item.key);
      }
    },
    children: item.children?.map((child: MenuItem) => ({
      ...child,
      icon: getIcon(child.icon),
      onClick: () => child.key && navigate(child.key),
    })),
  }));
}, [menuData, navigate]);
```

- [ ] **Step 5: 更新 Menu 组件的 loading 判断**

将第 157 行：
```typescript
if (permissionsLoading || productsLoading) return true;
```

替换为：
```typescript
if (menusLoading) return true;
```

- [ ] **Step 6: 移除不再需要的 import**

```typescript
// 删除：
import { useAuthStore } from '@/store/authStore';
import { getTenantProducts } from '@/api/tenantProducts';
// 从 useAuthStore 中移除 permissions, permissionsLoading 的使用
```

- [ ] **Step 7: 提交**

```bash
git add enterprise-frontend/src/App.tsx
git commit -m "feat(frontend): refactor App.tsx to use dynamic package menus"
```

---

## 验证步骤

### 后端验证

1. 启动后端服务
2. 使用 curl 测试接口：
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8080/enterprise/package/menus
```
3. 验证返回的 JSON 包含 `packageId`, `packageName`, `menus` 字段

### 前端验证

1. 启动前端：`cd saas-frontend/enterprise-frontend && pnpm dev`
2. 登录企业管理端
3. 验证侧边栏菜单正常显示
4. 使用不同套餐的企业账号登录，验证菜单内容不同

---

## 实施顺序

1. Task 1: PackageMenusDTO
2. Task 2: PackageMenuMapper
3. Task 3: PackageMenuService
4. Task 4: PackageMenuController
5. Task 5: 前端 API 函数
6. Task 6: 图标映射配置
7. Task 7: App.tsx 改造
