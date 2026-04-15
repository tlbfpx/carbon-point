package com.carbonpoint.system;

import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.system.dto.req.TenantPackageChangeReq;
import com.carbonpoint.system.dto.res.TenantPackageRes;
import com.carbonpoint.system.entity.*;
import com.carbonpoint.system.mapper.*;
import com.carbonpoint.system.security.PermissionService;
import com.carbonpoint.system.service.impl.PackageServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * TenantPackageChangeTest 集成测试。
 *
 * 测试场景：
 * 1. 套餐升级时超管角色权限更新
 * 2. 套餐降级时运营角色权限取交集
 * 3. 套餐变更日志记录
 *
 * 基于: docs/superpowers/specs/2026-04-12-enterprise-role-permission-design.md §4.3
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TenantPackageChangeTest {

    @Mock
    private PermissionPackageMapper packageMapper;

    @Mock
    private PackagePermissionMapper packagePermissionMapper;

    @Mock
    private PackageChangeLogMapper changeLogMapper;

    @Mock
    private TenantMapper tenantMapper;

    @Mock
    private RoleMapper roleMapper;

    @Mock
    private RolePermissionMapper rolePermissionMapper;

    @Mock
    private UserRoleMapper userRoleMapper;

    @Mock
    private PermissionService permissionService;

    @InjectMocks
    private PackageServiceImpl packageService;

    private Tenant tenant;
    private PermissionPackage freePackage;
    private PermissionPackage proPackage;
    private Role superAdminRole;
    private Role operatorRole;

    @BeforeEach
    void setUp() {
        tenant = new Tenant();
        tenant.setId(100L);
        tenant.setName("测试企业");
        tenant.setPackageId(1L); // currently on free package
        tenant.setStatus("active");

        freePackage = new PermissionPackage();
        freePackage.setId(1L);
        freePackage.setCode("free");
        freePackage.setName("免费版");
        freePackage.setStatus(true);

        proPackage = new PermissionPackage();
        proPackage.setId(2L);
        proPackage.setCode("pro");
        proPackage.setName("专业版");
        proPackage.setStatus(true);

        superAdminRole = new Role();
        superAdminRole.setId(10L);
        superAdminRole.setTenantId(100L);
        superAdminRole.setName("超级管理员");
        superAdminRole.setRoleType("super_admin");
        superAdminRole.setIsEditable(false);
        superAdminRole.setIsPreset(true);

        operatorRole = new Role();
        operatorRole.setId(20L);
        operatorRole.setTenantId(100L);
        operatorRole.setName("运营管理员");
        operatorRole.setRoleType("operator");
        operatorRole.setIsEditable(true);
        operatorRole.setIsPreset(true);
    }

    // ===== 套餐变更测试 =====

    @Nested
    @DisplayName("testUpgradePackageUpdatesSuperAdminPermissions")
    class UpgradePackageTests {

        @Test
        @DisplayName("套餐升级时超管角色应获得新套餐全部权限")
        void upgradeShouldUpdateSuperAdminPermissions() {
            // Given: tenant is on free (only dashboard:view), upgrading to pro (adds member permissions)
            List<String> freePerms = List.of("enterprise:dashboard:view");
            List<String> proPerms = List.of(
                    "enterprise:dashboard:view",
                    "enterprise:member:list",
                    "enterprise:member:create",
                    "enterprise:member:edit"
            );

            when(tenantMapper.selectByIdForPlatform(100L)).thenReturn(tenant);
            when(packageMapper.selectById(2L)).thenReturn(proPackage);
            when(packagePermissionMapper.selectCodesByPackageId(2L)).thenReturn(proPerms);
            when(roleMapper.selectByTenantIdForPlatform(100L)).thenReturn(new ArrayList<>(List.of(superAdminRole, operatorRole)));

            // Super admin current perms: dashboard:view
            when(rolePermissionMapper.selectPermissionCodesByRoleId(10L)).thenReturn(new ArrayList<>(freePerms));
            // Operator current perms: dashboard:view + member:list (subset of pro, no change needed since same count)
            when(rolePermissionMapper.selectPermissionCodesByRoleId(20L)).thenReturn(
                    new ArrayList<>(List.of("enterprise:dashboard:view", "enterprise:member:list")));
            when(userRoleMapper.selectUserIdsByRoleIds(List.of(10L))).thenReturn(new ArrayList<>(List.of(1L)));

            TenantPackageChangeReq req = new TenantPackageChangeReq();
            req.setPackageId(2L);
            req.setReason("测试升级");

            // When
            packageService.changeTenantPackage(100L, req, 999L);

            // Then: super_admin permissions should be replaced with new package perms
            verify(rolePermissionMapper).batchInsertRolePerms(argThat((List<RolePermission> list) ->
                    list.size() == proPerms.size() &&
                    list.stream().allMatch(rp -> rp.getRoleId().equals(10L)) &&
                    list.stream().map(RolePermission::getPermissionCode).toList().containsAll(proPerms)));

            // Cache should be refreshed for super admin (operator's permissions unchanged so no refresh)
            verify(permissionService).refreshUsersCache(List.of(1L)); // super admin user
        }

        @Test
        @DisplayName("套餐升级后超管角色权限数应等于新套餐权限数")
        void upgradeShouldSetSuperAdminPermCountToNewPackage() {
            // Given
            List<String> freePerms = List.of("enterprise:dashboard:view");
            List<String> proPerms = List.of(
                    "enterprise:dashboard:view",
                    "enterprise:member:list",
                    "enterprise:member:create"
            );

            when(tenantMapper.selectByIdForPlatform(100L)).thenReturn(tenant);
            when(packageMapper.selectById(2L)).thenReturn(proPackage);
            when(packagePermissionMapper.selectCodesByPackageId(2L)).thenReturn(proPerms);
            when(roleMapper.selectByTenantIdForPlatform(100L)).thenReturn(new ArrayList<>(List.of(superAdminRole)));
            when(rolePermissionMapper.selectPermissionCodesByRoleId(10L)).thenReturn(new ArrayList<>(freePerms));
            when(userRoleMapper.selectUserIdsByRoleId(10L)).thenReturn(new ArrayList<>(List.of(1L)));

            TenantPackageChangeReq req = new TenantPackageChangeReq();
            req.setPackageId(2L);

            // When
            packageService.changeTenantPackage(100L, req, 999L);

            // Then: old perms deleted and new perms inserted
            verify(rolePermissionMapper).deleteByRoleIds(List.of(10L)); // clear old
            verify(rolePermissionMapper).batchInsertRolePerms(argThat((List<RolePermission> list) ->
                    list.size() == proPerms.size() &&
                    list.stream().allMatch(rp -> rp.getRoleId().equals(10L)) &&
                    list.stream().map(RolePermission::getPermissionCode).toList().containsAll(proPerms)));
        }
    }

    @Nested
    @DisplayName("testDowngradePackageIntersectsOperatorPermissions")
    class DowngradePackageTests {

        @Test
        @DisplayName("套餐降级时运营角色权限应与新套餐取交集")
        void downgradeShouldIntersectOperatorPermissions() {
            // Given: tenant on pro, downgrading to free
            // Operator has: dashboard:view, member:list, member:create
            // After downgrade should only keep: dashboard:view (intersection)
            List<String> freePerms = List.of("enterprise:dashboard:view");
            List<String> proPerms = List.of(
                    "enterprise:dashboard:view",
                    "enterprise:member:list",
                    "enterprise:member:create"
            );

            when(tenantMapper.selectByIdForPlatform(100L)).thenReturn(tenant);
            when(packageMapper.selectById(1L)).thenReturn(freePackage);
            when(packagePermissionMapper.selectCodesByPackageId(1L)).thenReturn(freePerms);
            when(roleMapper.selectByTenantIdForPlatform(100L)).thenReturn(new ArrayList<>(List.of(superAdminRole, operatorRole)));

            // Super admin currently has pro perms
            when(rolePermissionMapper.selectPermissionCodesByRoleId(10L)).thenReturn(new ArrayList<>(proPerms));
            // Mock selectByRoleIds for operator role - returns RolePermission objects
            when(rolePermissionMapper.selectByRoleIds(List.of(20L))).thenReturn(new ArrayList<>(List.of(
                    createRolePermission(20L, "enterprise:dashboard:view"),
                    createRolePermission(20L, "enterprise:member:list"),
                    createRolePermission(20L, "enterprise:member:create")
            )));
            when(userRoleMapper.selectUserIdsByRoleId(10L)).thenReturn(new ArrayList<>(List.of(1L)));
            when(userRoleMapper.selectUserIdsByRoleId(20L)).thenReturn(new ArrayList<>(List.of(2L)));

            TenantPackageChangeReq req = new TenantPackageChangeReq();
            req.setPackageId(1L); // downgrade to free
            req.setReason("测试降级");

            // When
            packageService.changeTenantPackage(100L, req, 999L);

            // Then: operator permissions should be intersected (only dashboard:view)
            // Verify operator's old permissions were deleted
            verify(rolePermissionMapper).deleteByRoleIds(List.of(20L));
            // Operator gets 1 intersected perm via batch
            verify(rolePermissionMapper).batchInsertRolePerms(argThat((List<RolePermission> list) ->
                    list.size() == 1 &&
                    list.get(0).getRoleId().equals(20L) &&
                    list.get(0).getPermissionCode().equals("enterprise:dashboard:view")));
        }

        private RolePermission createRolePermission(Long roleId, String permCode) {
            RolePermission rp = new RolePermission();
            rp.setRoleId(roleId);
            rp.setPermissionCode(permCode);
            return rp;
        }

        @Test
        @DisplayName("套餐降级时运营超出范围的权限应被移除")
        void downgradeShouldRemoveExceedingPermissions() {
            // Given: operator has member:create (not in free package)
            // After downgrade to free, member:create should be removed
            List<String> freePerms = List.of("enterprise:dashboard:view");
            List<String> proPerms = List.of(
                    "enterprise:dashboard:view",
                    "enterprise:member:list",
                    "enterprise:member:create"
            );

            when(tenantMapper.selectByIdForPlatform(100L)).thenReturn(tenant);
            when(packageMapper.selectById(1L)).thenReturn(freePackage);
            when(packagePermissionMapper.selectCodesByPackageId(1L)).thenReturn(freePerms);
            when(roleMapper.selectByTenantIdForPlatform(100L)).thenReturn(new ArrayList<>(List.of(superAdminRole, operatorRole)));
            when(rolePermissionMapper.selectPermissionCodesByRoleId(10L)).thenReturn(new ArrayList<>(proPerms));
            // Operator has all pro perms including member:create (not in free)
            when(rolePermissionMapper.selectByRoleIds(List.of(20L))).thenReturn(new ArrayList<>(List.of(
                    createRolePermission(20L, "enterprise:dashboard:view"),
                    createRolePermission(20L, "enterprise:member:list"),
                    createRolePermission(20L, "enterprise:member:create")
            )));
            when(userRoleMapper.selectUserIdsByRoleId(10L)).thenReturn(new ArrayList<>(List.of(1L)));
            when(userRoleMapper.selectUserIdsByRoleId(20L)).thenReturn(new ArrayList<>(List.of(2L)));

            TenantPackageChangeReq req = new TenantPackageChangeReq();
            req.setPackageId(1L);

            // When
            packageService.changeTenantPackage(100L, req, 999L);

            // Verify operator's old permissions were deleted
            verify(rolePermissionMapper).deleteByRoleIds(List.of(20L));
            // Verify intersected permissions were inserted via batch
            verify(rolePermissionMapper).batchInsertRolePerms(argThat((List<RolePermission> list) ->
                    list.size() == 1 &&
                    list.get(0).getRoleId().equals(20L) &&
                    list.get(0).getPermissionCode().equals("enterprise:dashboard:view")));
        }

        @Test
        @DisplayName("套餐降级时超管角色权限应收缩至新套餐交集范围")
        void downgradeShouldShrinkSuperAdminPermissions() {
            // Given: super_admin has all pro perms, downgrading to free
            // super_admin should also shrink (intersect), not keep all pro perms
            List<String> freePerms = List.of("enterprise:dashboard:view");
            List<String> proPerms = List.of(
                    "enterprise:dashboard:view",
                    "enterprise:member:list",
                    "enterprise:member:create",
                    "enterprise:member:edit"
            );

            when(tenantMapper.selectByIdForPlatform(100L)).thenReturn(tenant);
            when(packageMapper.selectById(1L)).thenReturn(freePackage);
            when(packagePermissionMapper.selectCodesByPackageId(1L)).thenReturn(freePerms);
            when(roleMapper.selectByTenantIdForPlatform(100L)).thenReturn(new ArrayList<>(List.of(superAdminRole, operatorRole)));
            // Super admin has all pro perms (4)
            when(rolePermissionMapper.selectPermissionCodesByRoleId(10L)).thenReturn(new ArrayList<>(proPerms));
            // Operator has all pro perms (4) - mock selectByRoleIds for other roles branch
            when(rolePermissionMapper.selectByRoleIds(List.of(20L))).thenReturn(new ArrayList<>(List.of(
                    createRolePermission(20L, "enterprise:dashboard:view"),
                    createRolePermission(20L, "enterprise:member:list"),
                    createRolePermission(20L, "enterprise:member:create"),
                    createRolePermission(20L, "enterprise:member:edit")
            )));
            when(userRoleMapper.selectUserIdsByRoleIds(List.of(10L))).thenReturn(new ArrayList<>(List.of(1L)));
            when(userRoleMapper.selectUserIdsByRoleIds(List.of(20L))).thenReturn(new ArrayList<>(List.of(2L)));

            TenantPackageChangeReq req = new TenantPackageChangeReq();
            req.setPackageId(1L);
            req.setReason("测试降级收缩");

            // When
            packageService.changeTenantPackage(100L, req, 999L);

            // Then: super_admin's old permissions should be deleted
            verify(rolePermissionMapper).deleteByRoleIds(List.of(10L));
            // super_admin should only get 1 intersected perm (dashboard:view)
            verify(rolePermissionMapper).batchInsertRolePerms(argThat((List<RolePermission> list) ->
                    list.size() == 1 &&
                    list.get(0).getRoleId().equals(10L) &&
                    list.get(0).getPermissionCode().equals("enterprise:dashboard:view")));
            // Operator should only get 1 intersected perm (dashboard:view)
            verify(rolePermissionMapper).batchInsertRolePerms(argThat((List<RolePermission> list) ->
                    list.size() == 1 &&
                    list.get(0).getRoleId().equals(20L) &&
                    list.get(0).getPermissionCode().equals("enterprise:dashboard:view")));
            // Cache refresh for both users (super_admin and operator)
            verify(permissionService).refreshUsersCache(List.of(1L, 2L));
        }
    }

    @Nested
    @DisplayName("testPackageChangeLogsAuditTrail")
    class PackageChangeLogTests {

        @Test
        @DisplayName("套餐变更应记录审计日志")
        void shouldLogPackageChange() {
            // Given
            List<String> freePerms = List.of("enterprise:dashboard:view");
            List<String> proPerms = List.of("enterprise:dashboard:view", "enterprise:member:list");

            when(tenantMapper.selectByIdForPlatform(100L)).thenReturn(tenant);
            when(packageMapper.selectById(2L)).thenReturn(proPackage);
            when(packagePermissionMapper.selectCodesByPackageId(2L)).thenReturn(proPerms);
            when(roleMapper.selectByTenantIdForPlatform(100L)).thenReturn(new ArrayList<>(List.of(superAdminRole)));
            when(rolePermissionMapper.selectPermissionCodesByRoleId(10L)).thenReturn(new ArrayList<>(freePerms));
            when(userRoleMapper.selectUserIdsByRoleId(10L)).thenReturn(new ArrayList<>(List.of(1L)));

            TenantPackageChangeReq req = new TenantPackageChangeReq();
            req.setPackageId(2L);
            req.setReason("企业申请升级");

            // When
            packageService.changeTenantPackage(100L, req, 999L);

            // Then: audit log should be created
            ArgumentCaptor<PackageChangeLog> logCaptor = ArgumentCaptor.forClass(PackageChangeLog.class);
            verify(changeLogMapper).insert(logCaptor.capture());

            PackageChangeLog log = logCaptor.getValue();
            assertEquals(100L, log.getTenantId());
            assertEquals(1L, log.getOldPackageId()); // old package
            assertEquals(2L, log.getNewPackageId()); // new package
            assertEquals(999L, log.getOperatorId()); // platform admin
            assertEquals("platform_admin", log.getOperatorType());
            assertEquals("企业申请升级", log.getReason());
        }

        @Test
        @DisplayName("应拒绝切换到不存在的套餐")
        void shouldRejectChangeToNonExistentPackage() {
            // Given
            when(tenantMapper.selectByIdForPlatform(100L)).thenReturn(tenant);
            when(packageMapper.selectById(999L)).thenReturn(null);

            TenantPackageChangeReq req = new TenantPackageChangeReq();
            req.setPackageId(999L);

            // When / Then
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> packageService.changeTenantPackage(100L, req, 999L));
            assertEquals(ErrorCode.PACKAGE_NOT_FOUND.getCode(), ex.getCode());
        }

        @Test
        @DisplayName("应拒绝切换不存在的企业的套餐")
        void shouldRejectChangeForNonExistentTenant() {
            // Given
            when(tenantMapper.selectByIdForPlatform(999L)).thenReturn(null);

            TenantPackageChangeReq req = new TenantPackageChangeReq();
            req.setPackageId(2L);

            // When / Then
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> packageService.changeTenantPackage(999L, req, 999L));
            assertEquals(ErrorCode.TENANT_NOT_FOUND.getCode(), ex.getCode());
        }

        @Test
        @DisplayName("getTenantPackage应返回当前套餐信息和变更历史")
        void shouldReturnTenantPackageWithHistory() {
            // Given
            when(tenantMapper.selectByIdForPlatform(100L)).thenReturn(tenant);
            when(packageMapper.selectById(1L)).thenReturn(freePackage);
            when(packagePermissionMapper.selectCodesByPackageId(1L)).thenReturn(
                    List.of("enterprise:dashboard:view"));

            PackageChangeLog log = new PackageChangeLog();
            log.setTenantId(100L);
            log.setOldPackageId(null);
            log.setNewPackageId(1L);
            log.setOperatorId(999L);
            log.setOperatorType("platform_admin");
            log.setReason("initial");
            log.setCreatedAt(LocalDateTime.now().minusDays(5));

            when(changeLogMapper.selectByTenantId(100L)).thenReturn(new ArrayList<>(List.of(log)));

            // When
            TenantPackageRes result = packageService.getTenantPackage(100L);

            // Then
            assertEquals(100L, result.getTenantId());
            assertEquals(1L, result.getPackageId());
            assertEquals("免费版", result.getPackageName());
            assertEquals("free", result.getPackageCode());
            assertEquals(List.of("enterprise:dashboard:view"), result.getPermissionCodes());
            assertEquals(999L, result.getOperatorId());
            assertEquals("initial", result.getReason());
        }
    }
}
