package com.carbonpoint.system;

import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.system.dto.req.RoleCreateReq;
import com.carbonpoint.system.dto.req.RoleUpdateReq;
import com.carbonpoint.system.entity.*;
import com.carbonpoint.system.mapper.*;
import com.carbonpoint.system.security.CurrentUser;
import com.carbonpoint.system.security.PermissionService;
import com.carbonpoint.system.service.impl.RoleServiceImpl;
import org.junit.jupiter.api.AfterEach;
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

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * RolePermissionValidationTest 集成测试。
 *
 * 测试场景：
 * 1. 运营角色更新权限时 subset 校验成功
 * 2. 运营角色更新权限超出超管范围 → 403
 * 3. 禁止从企业侧分配超管角色
 * 4. 超管角色不可编辑权限
 *
 * 基于: docs/superpowers/specs/2026-04-12-enterprise-role-permission-design.md §4.4
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RolePermissionValidationTest {

    @Mock
    private RoleMapper roleMapper;

    @Mock
    private RolePermissionMapper rolePermissionMapper;

    @Mock
    private UserRoleMapper userRoleMapper;

    @Mock
    private UserMapper userMapper;

    @Mock
    private PermissionService permissionService;

    @Mock
    private CurrentUser currentUser;

    @Mock
    private PermissionPackageMapper permissionPackageMapper;

    @Mock
    private PackagePermissionMapper packagePermissionMapper;

    @InjectMocks
    private RoleServiceImpl roleService;

    private static final Long TENANT_ID = 100L;

    private Role superAdminRole;
    private Role operatorRole;
    private Role customRole;
    private User testUser;

    @BeforeEach
    void setUp() {
        // Set tenant context
        TenantContext.setTenantId(TENANT_ID);

        superAdminRole = new Role();
        superAdminRole.setId(10L);
        superAdminRole.setTenantId(TENANT_ID);
        superAdminRole.setName("超级管理员");
        superAdminRole.setRoleType("super_admin");
        superAdminRole.setIsEditable(false);
        superAdminRole.setIsPreset(true);

        operatorRole = new Role();
        operatorRole.setId(20L);
        operatorRole.setTenantId(TENANT_ID);
        operatorRole.setName("运营管理员");
        operatorRole.setRoleType("operator");
        operatorRole.setIsEditable(true);
        operatorRole.setIsPreset(false);

        customRole = new Role();
        customRole.setId(30L);
        customRole.setTenantId(TENANT_ID);
        customRole.setName("自定义角色");
        customRole.setRoleType("custom");
        customRole.setIsEditable(true);
        customRole.setIsPreset(false);

        testUser = new User();
        testUser.setId(1L);
        testUser.setTenantId(TENANT_ID);
        testUser.setStatus("active");
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    // ===== 权限 Subset 校验测试 =====

    @Nested
    @DisplayName("testUpdateOperatorPermissionSubsetOfSuperAdmin")
    class OperatorPermissionSubsetTests {

        @Test
        @DisplayName("运营角色更新为超管权限子集应成功")
        void shouldSucceedWhenOperatorPermissionsSubsetOfSuperAdmin() {
            // Given: super_admin has all dashboard + member permissions
            List<String> superAdminPerms = List.of(
                    "enterprise:dashboard:view",
                    "enterprise:member:list",
                    "enterprise:member:create",
                    "enterprise:member:edit",
                    "enterprise:rule:view"
            );

            // Operator wants to update to a subset
            List<String> newOperatorPerms = List.of(
                    "enterprise:dashboard:view",
                    "enterprise:member:list"
            );

            when(roleMapper.selectById(20L)).thenReturn(operatorRole);
            when(roleMapper.selectOne(any())).thenReturn(superAdminRole); // super_admin role query
            when(rolePermissionMapper.selectPermissionCodesByRoleId(10L)).thenReturn(superAdminPerms);
            when(rolePermissionMapper.selectPermissionCodesByRoleId(20L)).thenReturn(List.of("enterprise:dashboard:view"));
            when(userRoleMapper.selectUserIdsByRoleId(20L)).thenReturn(List.of(1L));

            // When
            roleService.updateRolePermissions(20L, newOperatorPerms);

            // Then: old permissions deleted and new ones inserted
            verify(rolePermissionMapper).deleteByRoleId(20L);
            verify(rolePermissionMapper, times(newOperatorPerms.size())).insert(any(RolePermission.class));
            // Cache refreshed
            verify(permissionService).refreshUserCache(1L);
        }

        @Test
        @DisplayName("创建自定义角色时权限必须为超管子集")
        void shouldSucceedWhenCreatingCustomRoleWithSubsetPermissions() {
            // Given: super_admin has dashboard + member perms
            List<String> superAdminPerms = List.of(
                    "enterprise:dashboard:view",
                    "enterprise:member:list"
            );

            // New custom role requests a subset
            RoleCreateReq req = new RoleCreateReq();
            req.setName("只读角色");
            req.setRoleType("custom");
            req.setPermissionCodes(List.of("enterprise:dashboard:view"));

            when(roleMapper.selectCount(any())).thenReturn(0L);
            when(roleMapper.selectOne(any())).thenReturn(superAdminRole); // super_admin query
            when(rolePermissionMapper.selectPermissionCodesByRoleId(10L)).thenReturn(superAdminPerms);
            when(roleMapper.insert(any(Role.class))).thenAnswer(inv -> {
                Role r = inv.getArgument(0);
                r.setId(31L);
                return 1;
            });
            when(roleMapper.selectById(31L)).thenAnswer(inv -> {
                Role r = new Role();
                r.setId(31L);
                r.setTenantId(TENANT_ID);
                r.setName("只读角色");
                r.setRoleType("custom");
                r.setIsEditable(true);
                r.setIsPreset(false);
                return r;
            });
            when(rolePermissionMapper.selectPermissionCodesByRoleId(31L)).thenReturn(List.of("enterprise:dashboard:view"));

            // When
            var result = roleService.create(req);

            // Then
            assertNotNull(result);
            assertEquals("只读角色", result.getName());
            assertEquals("custom", result.getRoleType());
        }
    }

    @Nested
    @DisplayName("testUpdateOperatorPermissionExceedsSuperAdmin")
    class ExceedPermissionTests {

        @Test
        @DisplayName("运营角色更新超出超管权限范围应返回403")
        void shouldRejectWhenOperatorPermissionsExceedSuperAdmin() {
            // Given: super_admin only has dashboard:view
            List<String> superAdminPerms = List.of("enterprise:dashboard:view");

            // Operator tries to get member:create (not in super_admin's permissions)
            when(roleMapper.selectById(20L)).thenReturn(operatorRole);
            when(roleMapper.selectOne(any())).thenReturn(superAdminRole);
            when(rolePermissionMapper.selectPermissionCodesByRoleId(10L)).thenReturn(superAdminPerms);

            // When / Then
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> roleService.updateRolePermissions(20L, List.of(
                            "enterprise:dashboard:view",
                            "enterprise:member:create" // not in super_admin's perms
                    )));
            assertEquals(ErrorCode.ROLE_PERMISSION_EXCEED_PACKAGE.getCode(), ex.getCode());
            assertTrue(ex.getMessage().contains("超出套餐范围"));
        }

        @Test
        @DisplayName("运营角色尝试获取超管完全不具备的权限应拒绝")
        void shouldRejectWhenOperatorRequestsTotallyUnauthorizedPermission() {
            // Given: super_admin has only dashboard:view
            List<String> superAdminPerms = List.of("enterprise:dashboard:view");

            when(roleMapper.selectById(20L)).thenReturn(operatorRole);
            when(roleMapper.selectOne(any())).thenReturn(superAdminRole);
            when(rolePermissionMapper.selectPermissionCodesByRoleId(10L)).thenReturn(superAdminPerms);

            // When / Then: trying to get point:add which super_admin doesn't have
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> roleService.updateRolePermissions(20L, List.of("enterprise:point:add")));
            assertEquals(ErrorCode.ROLE_PERMISSION_EXCEED_PACKAGE.getCode(), ex.getCode());
        }
    }

    // ===== 超管角色保护测试 =====

    @Nested
    @DisplayName("testAssignUsersToSuperAdminRejected")
    class AssignSuperAdminTests {

        @Test
        @DisplayName("从企业侧分配超管角色应返回403")
        void shouldRejectAssigningSuperAdminRole() {
            // Given: super_admin role
            when(roleMapper.selectById(10L)).thenReturn(superAdminRole);

            // When / Then: enterprise-side assignUsers should be blocked
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> roleService.assignUsers(10L, List.of(1L)));
            assertEquals(ErrorCode.ROLE_SUPER_ADMIN_ASSIGN_FORBIDDEN.getCode(), ex.getCode());
        }

        @Test
        @DisplayName("分配普通角色（运营）应成功")
        void shouldAllowAssigningOperatorRole() {
            // Given: operator role
            when(roleMapper.selectById(20L)).thenReturn(operatorRole);
            when(userMapper.selectById(1L)).thenReturn(testUser);

            // When
            roleService.assignUsers(20L, List.of(1L));

            // Then: user should be assigned
            ArgumentCaptor<UserRole> urCaptor = ArgumentCaptor.forClass(UserRole.class);
            verify(userRoleMapper).insert(urCaptor.capture());
            UserRole captured = urCaptor.getValue();
            assertEquals(1L, captured.getUserId());
            assertEquals(20L, captured.getRoleId());
            verify(permissionService).refreshUserCache(1L);
        }

        @Test
        @DisplayName("分配给不同租户的用户应返回错误")
        void shouldRejectAssigningUserFromDifferentTenant() {
            // Given: user belongs to a different tenant
            User otherTenantUser = new User();
            otherTenantUser.setId(2L);
            otherTenantUser.setTenantId(999L); // different tenant

            when(roleMapper.selectById(20L)).thenReturn(operatorRole);
            when(userMapper.selectById(2L)).thenReturn(otherTenantUser);

            // When / Then
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> roleService.assignUsers(20L, List.of(2L)));
            assertEquals(ErrorCode.USER_NOT_IN_TENANT.getCode(), ex.getCode());
        }
    }

    // ===== 超管角色不可编辑测试 =====

    @Nested
    @DisplayName("testSuperAdminRoleNotEditable")
    class SuperAdminEditProtectionTests {

        @Test
        @DisplayName("尝试更新超管角色权限应返回错误")
        void shouldRejectUpdatingSuperAdminPermissions() {
            // Given
            when(roleMapper.selectById(10L)).thenReturn(superAdminRole);

            // When / Then
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> roleService.updateRolePermissions(10L, List.of("enterprise:dashboard:view")));
            assertEquals(ErrorCode.ROLE_SUPER_ADMIN_IMMUTABLE.getCode(), ex.getCode());
        }

        @Test
        @DisplayName("尝试通过update接口修改超管角色应返回错误")
        void shouldRejectUpdatingSuperAdminViaUpdateApi() {
            // Given
            RoleUpdateReq req = new RoleUpdateReq();
            req.setName("新名称");
            when(roleMapper.selectById(10L)).thenReturn(superAdminRole);

            // When / Then
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> roleService.update(10L, req));
            assertEquals(ErrorCode.ROLE_SUPER_ADMIN_IMMUTABLE.getCode(), ex.getCode());
        }

        @Test
        @DisplayName("尝试删除超管角色应返回错误")
        void shouldRejectDeletingSuperAdminRole() {
            // Given: super_admin role (immutable)
            when(roleMapper.selectById(10L)).thenReturn(superAdminRole);

            // When / Then: should reject immediately due to immutable role type
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> roleService.delete(10L));
            assertEquals(ErrorCode.ROLE_SUPER_ADMIN_IMMUTABLE.getCode(), ex.getCode());
        }

        @Test
        @DisplayName("从企业侧创建超管角色应被拒绝")
        void shouldRejectCreatingSuperAdminRoleFromEnterprise() {
            // Given
            RoleCreateReq req = new RoleCreateReq();
            req.setName("非法超管");
            req.setRoleType("super_admin"); // explicitly requesting super_admin

            when(roleMapper.selectCount(any())).thenReturn(0L);

            // When / Then
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> roleService.create(req));
            assertEquals(ErrorCode.ROLE_SUPER_ADMIN_IMMUTABLE.getCode(), ex.getCode());
        }

        @Test
        @DisplayName("运营角色应该可以正常更新")
        void operatorRoleShouldBeEditable() {
            // Given
            RoleUpdateReq req = new RoleUpdateReq();
            req.setName("运营管理员v2");
            req.setPermissionCodes(List.of("enterprise:dashboard:view"));

            when(roleMapper.selectById(20L)).thenReturn(operatorRole);
            when(roleMapper.selectCount(any())).thenReturn(0L);
            when(roleMapper.selectOne(any())).thenReturn(superAdminRole);
            when(rolePermissionMapper.selectPermissionCodesByRoleId(10L)).thenReturn(
                    List.of("enterprise:dashboard:view", "enterprise:member:list"));
            when(rolePermissionMapper.selectPermissionCodesByRoleId(20L)).thenReturn(
                    List.of("enterprise:dashboard:view"));
            when(userRoleMapper.selectUserIdsByRoleId(20L)).thenReturn(List.of(1L));

            // When
            var result = roleService.update(20L, req);

            // Then
            assertNotNull(result);
            assertEquals("运营管理员v2", result.getName());
        }
    }
}
