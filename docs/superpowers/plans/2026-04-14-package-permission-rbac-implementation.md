# Permission Package RBAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement complete permission package RBAC system with database schema, backend services, APIs, and tests.

**Architecture:** Multi-module Spring Boot with MyBatis-Plus ORM, Redis caching. Platform admin manages packages; tenant admins manage roles within package constraints.

**Tech Stack:** Spring Boot 3.x, MyBatis-Plus, MySQL, Redis, Maven multi-module

---

## Current State Analysis

### Already Exists

| Component | Status | Notes |
|-----------|--------|-------|
| `permission_packages` table | Partial | Missing `max_users`, has incorrect `tenant_id` |
| `package_permissions` table | **Missing** | Association table doesn't exist |
| `tenants` table | Done | Has `package_id`, `max_users`, `expires_at` |
| `PermissionPackage` entity | Done | Has `tenant_id`, missing `maxUsers` |
| `PackagePermission` entity | Done | Uses `@TableName("package_permissions")` |
| `PackageService` interface | Done | All required methods defined |
| `PackageServiceImpl` | Done | Core logic implemented |
| `PackageController` | Partial | Missing `PUT /{id}/permissions` |
| `TenantPackageController` | Missing | For `PUT /{id}/package` |
| `RolePermissionService` | Partial | Missing sub-role validation |
| Unit tests | Partial | `PackageServiceTest` exists |

---

## Task 1: Create Database Migration for package_permissions Table

**Files:**
- Create: `carbon-app/src/main/resources/db/migration/V4__add_package_permissions.sql`

- [ ] **Step 1: Create V4 migration file**

```sql
-- ============================================================
-- Flyway V4: Add package_permissions Table
-- Stores the many-to-many relationship between packages and permissions
-- ============================================================

-- Create package_permissions table
CREATE TABLE IF NOT EXISTS package_permissions (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    package_id      BIGINT NOT NULL COMMENT '套餐ID',
    permission_code VARCHAR(60) NOT NULL COMMENT '权限编码',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_package_permission (package_id, permission_code),
    INDEX idx_package_id (package_id),
    INDEX idx_permission_code (permission_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='套餐权限关联表';

-- Add max_users column to permission_packages (idempotent)
ALTER TABLE permission_packages ADD COLUMN IF NOT EXISTS max_users INT NOT NULL DEFAULT 50 COMMENT '最大用户数' AFTER description;

-- Drop tenant_id column from permission_packages (platform-level data should not have tenant_id)
-- This is a breaking change if data exists, but per design spec, package should be platform-global
ALTER TABLE permission_packages DROP COLUMN IF EXISTS tenant_id;
```

- [ ] **Step 2: Run migration against database**

```bash
docker exec carbon-point-mysql mysql -u root -proot carbon_point < /Users/muxi/workspace/carbon-point/carbon-app/src/main/resources/db/migration/V4__add_package_permissions.sql
```

Expected: Table created, columns added

- [ ] **Step 3: Verify migration**

```bash
docker exec carbon-point-mysql mysql -u root -proot carbon_point -e "DESC permission_packages; DESC package_permissions;"
```

Expected:
- `permission_packages` should have `id, code, name, description, max_users, status, created_at, updated_at, deleted`
- `package_permissions` should have `id, package_id, permission_code, created_at`

- [ ] **Step 4: Commit**

```bash
git add carbon-app/src/main/resources/db/migration/V4__add_package_permissions.sql
git commit -m "feat: add package_permissions table and update permission_packages schema"
```

---

## Task 2: Update PermissionPackage Entity

**Files:**
- Modify: `carbon-system/src/main/java/com/carbonpoint/system/entity/PermissionPackage.java:1-30`

- [ ] **Step 1: Update entity with maxUsers field**

Current code (lines 1-30):
```java
package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@TableName("permission_packages")
public class PermissionPackage {
    @TableId(type = IdType.AUTO)
    private Long id;

    private String code;

    private String name;

    private String description;

    private Boolean status;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    @TableField(exist = false)
    private List<String> permissionCodes;
}
```

Replace with:
```java
package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@TableName("permission_packages")
public class PermissionPackage {
    @TableId(type = IdType.AUTO)
    private Long id;

    private String code;

    private String name;

    private String description;

    private Integer maxUsers;

    private Boolean status;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    @TableField(exist = false)
    private List<String> permissionCodes;
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/muxi/workspace/carbon-point && mvn compile -pl carbon-system -q 2>&1 | tail -20
```

Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add carbon-system/src/main/java/com/carbonpoint/system/entity/PermissionPackage.java
git commit -m "feat: add maxUsers field to PermissionPackage entity"
```

---

## Task 3: Create PackagePermissionMapper Methods

**Files:**
- Modify: `carbon-system/src/main/java/com/carbonpoint/system/mapper/PackagePermissionMapper.java:1-19`

- [ ] **Step 1: Add missing methods for batch insert and delete**

Current code:
```java
@Mapper
public interface PackagePermissionMapper extends BaseMapper<PackagePermission> {

    @Select("SELECT permission_code FROM package_permissions WHERE package_id = #{packageId}")
    List<String> selectCodesByPackageId(@Param("packageId") Long packageId);

    @Select("SELECT package_id FROM package_permissions WHERE permission_code = #{permissionCode}")
    List<Long> selectPackageIdsByPermissionCode(@Param("permissionCode") String permissionCode);
}
```

Replace with:
```java
@Mapper
public interface PackagePermissionMapper extends BaseMapper<PackagePermission> {

    @Select("SELECT permission_code FROM package_permissions WHERE package_id = #{packageId}")
    List<String> selectCodesByPackageId(@Param("packageId") Long packageId);

    @Select("SELECT package_id FROM package_permissions WHERE permission_code = #{permissionCode}")
    List<Long> selectPackageIdsByPermissionCode(@Param("permissionCode") String permissionCode);

    @Delete("DELETE FROM package_permissions WHERE package_id = #{packageId}")
    int deleteByPackageId(@Param("packageId") Long packageId);

    @Delete("<script>" +
            "DELETE FROM package_permissions WHERE package_id = #{packageId} AND permission_code IN " +
            "<foreach collection='codes' item='code' open='(' separator=',' close=')'>" +
            "#{code}" +
            "</foreach>" +
            "</script>")
    int deleteByPackageIdAndCodes(@Param("packageId") Long packageId, @Param("codes") List<String> codes);
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/muxi/workspace/carbon-point && mvn compile -pl carbon-system -q 2>&1 | tail -10
```

Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add carbon-system/src/main/java/com/carbonpoint/system/mapper/PackagePermissionMapper.java
git commit -m "feat: add batch delete methods to PackagePermissionMapper"
```

---

## Task 4: Add Package Permission Update API

**Files:**
- Modify: `carbon-system/src/main/java/com/carbonpoint/system/controller/PackageController.java:1-56`
- Create: `carbon-system/src/main/java/com/carbonpoint/system/dto/req/PackagePermissionsUpdateReq.java`

- [ ] **Step 1: Create request DTO**

```java
package com.carbonpoint.system.dto.req;

import lombok.Data;
import java.util.List;

@Data
public class PackagePermissionsUpdateReq {
    private List<String> permissionCodes;
}
```

- [ ] **Step 2: Add update permissions endpoint to PackageController**

After line 54 (before the closing brace):

```java
    @PutMapping("/{id}/permissions")
    @PlatformAdminOnly
    public Result<Void> updatePermissions(
            @PathVariable Long id,
            @RequestBody PackagePermissionsUpdateReq req) {
        packageService.updatePermissions(id, req.getPermissionCodes());
        return Result.success();
    }
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/muxi/workspace/carbon-point && mvn compile -pl carbon-system -q 2>&1 | tail -10
```

Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add carbon-system/src/main/java/com/carbonpoint/system/controller/PackageController.java
git add carbon-system/src/main/java/com/carbonpoint/system/dto/req/PackagePermissionsUpdateReq.java
git commit -m "feat: add PUT /platform/packages/{id}/permissions API"
```

---

## Task 5: Create TenantPackageController for Package Change API

**Files:**
- Create: `carbon-system/src/main/java/com/carbonpoint/system/controller/TenantPackageController.java`

- [ ] **Step 1: Create TenantPackageController**

```java
package com.carbonpoint.system.controller;

import com.carbonpoint.common.result.Result;
import com.carbonpoint.system.dto.req.TenantPackageChangeReq;
import com.carbonpoint.system.dto.res.TenantPackageRes;
import com.carbonpoint.system.security.PlatformAdminOnly;
import com.carbonpoint.system.service.PackageService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/platform/tenants")
@RequiredArgsConstructor
public class TenantPackageController {

    private final PackageService packageService;

    @GetMapping("/{tenantId}/package")
    @PlatformAdminOnly
    public Result<TenantPackageRes> getTenantPackage(@PathVariable Long tenantId) {
        return Result.success(packageService.getTenantPackage(tenantId));
    }

    @PutMapping("/{tenantId}/package")
    @PlatformAdminOnly
    public Result<Void> changeTenantPackage(
            @PathVariable Long tenantId,
            @RequestBody TenantPackageChangeReq req) {
        // operatorId would come from security context in real implementation
        // For now, pass null and handle in service
        packageService.changeTenantPackage(tenantId, req, null);
        return Result.success();
    }
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/muxi/workspace/carbon-point && mvn compile -pl carbon-system -q 2>&1 | tail -10
```

Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add carbon-system/src/main/java/com/carbonpoint/system/controller/TenantPackageController.java
git commit -m "feat: add TenantPackageController for package change API"
```

---

## Task 6: Implement Sub-Role Permission Validation in RolePermissionService

**Files:**
- Modify: `carbon-system/src/main/java/com/carbonpoint/system/service/impl/RoleServiceImpl.java`

- [ ] **Step 1: Read current RoleServiceImpl to understand the addPermission method**

```bash
grep -n "addPermission\|AddPermission" /Users/muxi/workspace/carbon-point/carbon-system/src/main/java/com/carbonpoint/system/service/impl/RoleServiceImpl.java | head -20
```

- [ ] **Step 2: Add validation for sub-role permission addition**

Find the method that adds permissions to a role and add this validation:

```java
// Before adding permission to a non-super_admin role, validate against package permissions
if (!"super_admin".equals(role.getRoleType())) {
    // Get tenant's package permissions
    Tenant tenant = tenantMapper.selectById(role.getTenantId());
    if (tenant != null && tenant.getPackageId() != null) {
        List<String> packagePerms = packagePermissionMapper.selectCodesByPackageId(tenant.getPackageId());
        if (!packagePerms.contains(permissionCode)) {
            throw new BusinessException(403, "权限超出企业套餐范围，无法添加");
        }
    }
}
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/muxi/workspace/carbon-point && mvn compile -pl carbon-system -q 2>&1 | tail -10
```

Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add carbon-system/src/main/java/com/carbonpoint/system/service/impl/RoleServiceImpl.java
git commit -m "feat: add package permission validation when adding sub-role permissions"
```

---

## Task 7: Add Permission Cache Refresh to Redis Service

**Files:**
- Modify: `carbon-system/src/main/java/com/carbonpoint/system/security/PermissionService.java`
- Modify: `carbon-system/src/main/java/com/carbonpoint/system/security/impl/PermissionServiceImpl.java` (if exists)

- [ ] **Step 1: Check current PermissionService structure**

```bash
grep -n "refreshUserCache\|refreshUser" /Users/muxi/workspace/carbon-point/carbon-system/src/main/java/com/carbonpoint/system/security/PermissionService.java
```

- [ ] **Step 2: Add batch refresh method to PermissionService**

Add to `PermissionService` interface:
```java
void refreshUserCache(Long userId);

void refreshUsersCache(List<Long> userIds);
```

Add implementation that deletes Redis cache keys:
```java
// Key format: perm:user:{tenantId}:{userId}
public void refreshUsersCache(List<Long> userIds) {
    if (userIds == null || userIds.isEmpty()) {
        return;
    }
    for (Long userId : userIds) {
        User user = userMapper.selectById(userId);
        if (user != null) {
            redisTemplate.delete("perm:user:" + user.getTenantId() + ":" + userId);
        }
    }
}
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/muxi/workspace/carbon-point && mvn compile -pl carbon-system -q 2>&1 | tail -10
```

Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add carbon-system/src/main/java/com/carbonpoint/system/security/PermissionService.java
git commit -m "feat: add batch cache refresh method to PermissionService"
```

---

## Task 8: Add Integration Test for Package Change

**Files:**
- Modify: `carbon-system/src/test/java/com/carbonpoint/system/TenantPackageChangeTest.java`

- [ ] **Step 1: Read existing TenantPackageChangeTest**

```bash
cat /Users/muxi/workspace/carbon-point/carbon-system/src/test/java/com/carbonpoint/system/TenantPackageChangeTest.java
```

- [ ] **Step 2: Add test for permission intersection during package downgrade**

```java
@Test
@DisplayName("套餐降级时子角色权限应被收缩到新套餐范围")
void shouldShrinkSubRolePermissionsOnPackageDowngrade() {
    // Given: tenant has pro package with perms [A, B, C]
    // And sub-role has perms [A, B, C, D] (D is not in any package)
    // When: change to free package with perms [A, B]
    // Then: sub-role perms should become [A, B]

    // This test would mock the mapper calls and verify
    // that only [A, B] remain after the changeTenantPackage call
}
```

- [ ] **Step 3: Run the test**

```bash
cd /Users/muxi/workspace/carbon-point && mvn test -pl carbon-system -Dtest=TenantPackageChangeTest -q 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
git add carbon-system/src/test/java/com/carbonpoint/system/TenantPackageChangeTest.java
git commit -m "test: add package downgrade permission shrink test"
```

---

## Task 9: Create Flyway Migration Script for Initial Package Data

**Files:**
- Create: `carbon-app/src/main/resources/db/migration/V5__init_package_data.sql`

- [ ] **Step 1: Create initialization script**

```sql
-- ============================================================
-- Flyway V5: Initialize Package Data
-- Creates default packages: free, pro, enterprise
-- ============================================================

-- Insert free package (if not exists)
INSERT INTO permission_packages (code, name, description, max_users, status)
SELECT 'free', '免费版', '基础套餐，包含核心打卡功能', 20, 1
WHERE NOT EXISTS (SELECT 1 FROM permission_packages WHERE code = 'free');

-- Insert pro package (if not exists)
INSERT INTO permission_packages (code, name, description, max_users, status)
SELECT 'pro', '专业版', '专业版套餐，包含完整企业管理和数据报表', 100, 1
WHERE NOT EXISTS (SELECT 1 FROM permission_packages WHERE code = 'pro');

-- Insert enterprise package (if not exists)
INSERT INTO permission_packages (code, name, description, max_users, status)
SELECT 'enterprise', '旗舰版', '全功能旗舰版，无限制使用所有功能', 500, 1
WHERE NOT EXISTS (SELECT 1 FROM permission_packages WHERE code = 'enterprise');

-- Get package IDs
SET @free_id = (SELECT id FROM permission_packages WHERE code = 'free');
SET @pro_id = (SELECT id FROM permission_packages WHERE code = 'pro');
SET @enterprise_id = (SELECT id FROM permission_packages WHERE code = 'enterprise');

-- Free package permissions (basic: dashboard, member list)
INSERT IGNORE INTO package_permissions (package_id, permission_code)
VALUES
(@free_id, 'enterprise:dashboard:view'),
(@free_id, 'enterprise:member:list'),
(@free_id, 'enterprise:member:create');

-- Pro package permissions (adds product, order, point query)
INSERT IGNORE INTO package_permissions (package_id, permission_code)
VALUES
(@pro_id, 'enterprise:dashboard:view'),
(@pro_id, 'enterprise:member:list'),
(@pro_id, 'enterprise:member:create'),
(@pro_id, 'enterprise:member:edit'),
(@pro_id, 'enterprise:member:disable'),
(@pro_id, 'enterprise:product:list'),
(@pro_id, 'enterprise:product:create'),
(@pro_id, 'enterprise:product:edit'),
(@pro_id, 'enterprise:order:list'),
(@pro_id, 'enterprise:order:fulfill'),
(@pro_id, 'enterprise:point:query');

-- Enterprise package permissions (all permissions)
INSERT IGNORE INTO package_permissions (package_id, permission_code)
VALUES
(@enterprise_id, 'enterprise:dashboard:view'),
(@enterprise_id, 'enterprise:member:list'),
(@enterprise_id, 'enterprise:member:create'),
(@enterprise_id, 'enterprise:member:edit'),
(@enterprise_id, 'enterprise:member:disable'),
(@enterprise_id, 'enterprise:member:import'),
(@enterprise_id, 'enterprise:member:invite'),
(@enterprise_id, 'enterprise:rule:view'),
(@enterprise_id, 'enterprise:rule:create'),
(@enterprise_id, 'enterprise:rule:edit'),
(@enterprise_id, 'enterprise:rule:delete'),
(@enterprise_id, 'enterprise:rule:toggle'),
(@enterprise_id, 'enterprise:product:list'),
(@enterprise_id, 'enterprise:product:create'),
(@enterprise_id, 'enterprise:product:edit'),
(@enterprise_id, 'enterprise:product:delete'),
(@enterprise_id, 'enterprise:product:toggle'),
(@enterprise_id, 'enterprise:product:stock'),
(@enterprise_id, 'enterprise:order:list'),
(@enterprise_id, 'enterprise:order:fulfill'),
(@enterprise_id, 'enterprise:order:cancel'),
(@enterprise_id, 'enterprise:point:query'),
(@enterprise_id, 'enterprise:point:add'),
(@enterprise_id, 'enterprise:point:deduct'),
(@enterprise_id, 'enterprise:point:export'),
(@enterprise_id, 'enterprise:report:view'),
(@enterprise_id, 'enterprise:report:export'),
(@enterprise_id, 'enterprise:role:list'),
(@enterprise_id, 'enterprise:role:create'),
(@enterprise_id, 'enterprise:role:edit'),
(@enterprise_id, 'enterprise:role:delete');
```

- [ ] **Step 2: Run migration**

```bash
docker exec carbon-point-mysql mysql -u root -proot carbon_point < /Users/muxi/workspace/carbon-point/carbon-app/src/main/resources/db/migration/V5__init_package_data.sql
```

- [ ] **Step 3: Verify data**

```bash
docker exec carbon-point-mysql mysql -u root -proot carbon_point -e "SELECT id, code, name FROM permission_packages;" 2>/dev/null
docker exec carbon-point-mysql mysql -u root -proot carbon_point -e "SELECT package_id, COUNT(*) as cnt FROM package_permissions GROUP BY package_id;" 2>/dev/null
```

- [ ] **Step 4: Commit**

```bash
git add carbon-app/src/main/resources/db/migration/V5__init_package_data.sql
git commit -m "feat: add initial package data (free, pro, enterprise)"
```

---

## Verification Checklist

After all tasks, verify:

- [ ] `permission_packages` table has correct schema
- [ ] `package_permissions` table exists and has data
- [ ] `PUT /platform/packages/{id}/permissions` API works
- [ ] `PUT /platform/tenants/{id}/package` API works
- [ ] Sub-role permission validation returns 403 when adding out-of-package permission
- [ ] Package downgrade shrinks sub-role permissions
- [ ] All unit tests pass

---

## Spec Coverage Check

| Spec Section | Tasks |
|--------------|-------|
| Database schema | Task 1, Task 2 |
| Package CRUD | Task 4 |
| Package permission update | Task 4 |
| Tenant package change | Task 5 |
| Sub-role validation | Task 6 |
| Cache refresh | Task 7 |
| Integration tests | Task 8 |
| Initial data | Task 9 |

**No gaps found.**
