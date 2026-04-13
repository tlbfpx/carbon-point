package com.carbonpoint.system;

import com.carbonpoint.common.tenant.TenantContext;
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
 * SuperAdminInitTest 集成测试。
 *
 * 测试场景：
 * 1. 创建企业时自动初始化超管角色
 * 2. 超管角色应包含套餐全部权限
 * 3. 超管角色设置为不可编辑/不可删除
 * 4. 超管角色应正确关联初始管理员用户
 *
 * 基于: docs/superpowers/specs/2026-04-12-enterprise-role-permission-design.md §4.2
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SuperAdminInitTest {

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
    private static final Long PACKAGE_ID = 1L;
    private static final Long ADMIN_USER_ID = 50L;

    /**
     * Helper: set up mocks so role insertion + retrieval works.
     * The service calls roleMapper.insert() then roleMapper.selectById() to get the role.
     */
    private void mockRoleInsertAndRetrieve(Long roleId, Long tenantId, String roleType, boolean isEditable) {
        doAnswer(inv -> {
            Role r = inv.getArgument(0);
            r.setId(roleId);
            return null;
        }).when(roleMapper).insert(any(Role.class));

        doAnswer(inv -> {
            Role r = new Role();
            r.setId(roleId);
            r.setTenantId(tenantId);
            r.setName("超级管理员");
            r.setRoleType(roleType);
            r.setIsEditable(isEditable);
            r.setIsPreset(true);
            return r;
        }).when(roleMapper).selectById(roleId);
    }

    @BeforeEach
    void setUp() {
        TenantContext.setTenantId(TENANT_ID);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    // ===== 超管角色初始化测试 =====

    @Nested
    @DisplayName("testCreateTenantInitializesSuperAdminRole")
    class TenantInitTests {

        @Test
        @DisplayName("创建企业时应自动创建超管角色")
        void shouldCreateSuperAdminRoleOnTenantCreation() {
            // Given
            List<String> packagePerms = List.of(
                    "enterprise:dashboard:view",
                    "enterprise:member:list",
                    "enterprise:member:create",
                    "enterprise:rule:view"
            );
            when(packagePermissionMapper.selectCodesByPackageId(PACKAGE_ID)).thenReturn(packagePerms);
            mockRoleInsertAndRetrieve(10L, TENANT_ID, "super_admin", false);

            // When
            roleService.initSuperAdminRole(TENANT_ID, PACKAGE_ID, null);

            // Then: super_admin role should be created
            ArgumentCaptor<Role> roleCaptor = ArgumentCaptor.forClass(Role.class);
            verify(roleMapper).insert(roleCaptor.capture());

            Role createdRole = roleCaptor.getValue();
            assertEquals(TENANT_ID, createdRole.getTenantId());
            assertEquals("超级管理员", createdRole.getName());
            assertEquals("super_admin", createdRole.getRoleType());
            assertFalse(createdRole.getIsEditable());
            assertTrue(createdRole.getIsPreset());
        }

        @Test
        @DisplayName("创建企业时若指定初始管理员应自动绑定超管角色")
        void shouldBindInitialAdminToSuperAdminRole() {
            // Given
            List<String> packagePerms = List.of("enterprise:dashboard:view");
            when(packagePermissionMapper.selectCodesByPackageId(PACKAGE_ID)).thenReturn(packagePerms);

            User adminUser = new User();
            adminUser.setId(ADMIN_USER_ID);
            adminUser.setTenantId(TENANT_ID);
            when(userMapper.selectById(ADMIN_USER_ID)).thenReturn(adminUser);

            mockRoleInsertAndRetrieve(10L, TENANT_ID, "super_admin", false);

            // When
            roleService.initSuperAdminRole(TENANT_ID, PACKAGE_ID, ADMIN_USER_ID);

            // Then: admin user should be assigned to super_admin role
            ArgumentCaptor<UserRole> urCaptor = ArgumentCaptor.forClass(UserRole.class);
            verify(userRoleMapper).insert(urCaptor.capture());

            UserRole ur = urCaptor.getValue();
            assertEquals(ADMIN_USER_ID, ur.getUserId());
        }
    }

    @Nested
    @DisplayName("testSuperAdminRoleHasAllPackagePermissions")
    class SuperAdminPermissionTests {

        @Test
        @DisplayName("超管角色应包含套餐的全部权限")
        void superAdminRoleShouldContainAllPackagePermissions() {
            // Given
            List<String> packagePerms = List.of(
                    "enterprise:dashboard:view",
                    "enterprise:member:list",
                    "enterprise:member:create",
                    "enterprise:member:edit",
                    "enterprise:member:disable",
                    "enterprise:rule:view",
                    "enterprise:rule:create",
                    "enterprise:product:list",
                    "enterprise:order:list"
            );
            when(packagePermissionMapper.selectCodesByPackageId(PACKAGE_ID)).thenReturn(packagePerms);
            mockRoleInsertAndRetrieve(10L, TENANT_ID, "super_admin", false);

            // When
            roleService.initSuperAdminRole(TENANT_ID, PACKAGE_ID, null);

            // Then: all package permissions should be inserted for the super_admin role
            ArgumentCaptor<RolePermission> rpCaptor = ArgumentCaptor.forClass(RolePermission.class);
            verify(rolePermissionMapper, times(packagePerms.size())).insert(rpCaptor.capture());

            List<String> insertedPerms = rpCaptor.getAllValues().stream()
                    .map(RolePermission::getPermissionCode)
                    .toList();
            assertTrue(insertedPerms.containsAll(packagePerms),
                    "Super admin should have all package permissions");
        }

        @Test
        @DisplayName("超管角色权限数量应等于套餐权限数量")
        void superAdminRolePermissionCountShouldMatchPackage() {
            // Given
            List<String> packagePerms = List.of(
                    "enterprise:dashboard:view",
                    "enterprise:member:list",
                    "enterprise:member:create"
            );
            when(packagePermissionMapper.selectCodesByPackageId(PACKAGE_ID)).thenReturn(packagePerms);
            mockRoleInsertAndRetrieve(10L, TENANT_ID, "super_admin", false);

            // When
            roleService.initSuperAdminRole(TENANT_ID, PACKAGE_ID, null);

            // Then
            verify(rolePermissionMapper, times(packagePerms.size())).insert(any(RolePermission.class));
        }

        @Test
        @DisplayName("超管角色应正确设置role_type和is_editable字段")
        void superAdminRoleShouldHaveCorrectTypeAndEditableFlag() {
            // Given
            when(packagePermissionMapper.selectCodesByPackageId(PACKAGE_ID)).thenReturn(
                    List.of("enterprise:dashboard:view"));
            mockRoleInsertAndRetrieve(10L, TENANT_ID, "super_admin", false);

            // When
            roleService.initSuperAdminRole(TENANT_ID, PACKAGE_ID, null);

            // Then
            ArgumentCaptor<Role> roleCaptor = ArgumentCaptor.forClass(Role.class);
            verify(roleMapper).insert(roleCaptor.capture());

            Role createdRole = roleCaptor.getValue();
            assertEquals("super_admin", createdRole.getRoleType(),
                    "role_type should be 'super_admin'");
            assertFalse(createdRole.getIsEditable(),
                    "is_editable should be false (0) for super_admin");
            assertTrue(createdRole.getIsPreset(),
                    "is_preset should be true for super_admin (legacy compatibility)");
        }
    }

    // ===== 边界情况测试 =====

    @Nested
    @DisplayName("Edge Cases")
    class EdgeCases {

        @Test
        @DisplayName("套餐权限列表为空时应创建空权限的超管角色")
        void shouldCreateSuperAdminWithEmptyPermissionsWhenPackageHasNone() {
            // Given: package returns empty list (not null)
            when(packagePermissionMapper.selectCodesByPackageId(PACKAGE_ID)).thenReturn(List.of());
            mockRoleInsertAndRetrieve(10L, TENANT_ID, "super_admin", false);

            // When
            roleService.initSuperAdminRole(TENANT_ID, PACKAGE_ID, null);

            // Then: role should be created with no permission entries
            verify(roleMapper).insert(any(Role.class));
            // No permissions inserted for an empty list
            verify(rolePermissionMapper, never()).insert(any(RolePermission.class));
        }

        @Test
        @DisplayName("超管角色应在租户隔离下正确创建")
        void superAdminRoleShouldBeTenantIsolated() {
            // Given
            Long differentTenantId = 200L;
            when(packagePermissionMapper.selectCodesByPackageId(PACKAGE_ID)).thenReturn(
                    List.of("enterprise:dashboard:view"));
            mockRoleInsertAndRetrieve(10L, differentTenantId, "super_admin", false);

            // When
            roleService.initSuperAdminRole(differentTenantId, PACKAGE_ID, null);

            // Then: the role should be created with the correct tenant_id
            ArgumentCaptor<Role> roleCaptor = ArgumentCaptor.forClass(Role.class);
            verify(roleMapper).insert(roleCaptor.capture());

            assertEquals(differentTenantId, roleCaptor.getValue().getTenantId());
        }
    }
}
