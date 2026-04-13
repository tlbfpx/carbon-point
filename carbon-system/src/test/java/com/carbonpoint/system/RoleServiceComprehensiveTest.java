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
 * RoleServiceImpl 全面测试。
 * 补充 SuperAdminInitTest 和 RolePermissionValidationTest 未覆盖的场景：
 * - getAvailablePermissions()
 * - getById / list 响应字段 (roleType, isEditable)
 * - create 角色默认值
 * - assignPermissions 独立调用
 * - 错误路径 (角色不存在)
 *
 * 基于: docs/superpowers/specs/2026-04-12-enterprise-role-permission-design.md
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RoleServiceComprehensiveTest {

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

    // ===== getAvailablePermissions 测试 =====

    @Nested
    @DisplayName("testGetAvailablePermissions")
    class GetAvailablePermissionsTests {

        @Test
        @DisplayName("应返回超管角色的所有权限")
        void shouldReturnSuperAdminPermissions() {
            // Given
            List<String> superAdminPerms = List.of(
                    "enterprise:dashboard:view",
                    "enterprise:member:list",
                    "enterprise:member:create"
            );
            when(roleMapper.selectOne(any())).thenReturn(superAdminRole);
            when(rolePermissionMapper.selectPermissionCodesByRoleId(10L)).thenReturn(superAdminPerms);

            // When
            List<String> result = roleService.getAvailablePermissions();

            // Then
            assertEquals(3, result.size());
            assertTrue(result.contains("enterprise:dashboard:view"));
            assertTrue(result.contains("enterprise:member:list"));
            assertTrue(result.contains("enterprise:member:create"));
        }

        @Test
        @DisplayName("超管角色不存在时应返回空列表")
        void shouldReturnEmptyListWhenSuperAdminNotFound() {
            // Given: no super_admin role exists for this tenant
            when(roleMapper.selectOne(any())).thenReturn(null);

            // When
            List<String> result = roleService.getAvailablePermissions();

            // Then
            assertTrue(result.isEmpty());
        }

        @Test
        @DisplayName("应正确处理超管角色权限边界情况")
        void shouldHandleEdgeCasesForSuperAdminPermissions() {
            // Case 1: empty permissions
            when(roleMapper.selectOne(any())).thenReturn(superAdminRole);
            when(rolePermissionMapper.selectPermissionCodesByRoleId(10L)).thenReturn(List.of());

            List<String> result = roleService.getAvailablePermissions();
            assertTrue(result.isEmpty());

            // Case 2: single permission
            when(rolePermissionMapper.selectPermissionCodesByRoleId(10L)).thenReturn(
                    List.of("enterprise:dashboard:view"));

            result = roleService.getAvailablePermissions();
            assertEquals(1, result.size());
            assertEquals("enterprise:dashboard:view", result.get(0));
        }
    }

    // ===== getById / list 响应字段测试 =====

    @Nested
    @DisplayName("testGetByIdReturnsRoleTypeAndIsEditable")
    class GetByIdResponseFieldsTests {

        @Test
        @DisplayName("getById 应返回 roleType 和 isEditable 字段")
        void getByIdShouldReturnRoleTypeAndIsEditable() {
            // Given
            when(roleMapper.selectById(20L)).thenReturn(operatorRole);
            when(rolePermissionMapper.selectPermissionCodesByRoleId(20L))
                    .thenReturn(List.of("enterprise:dashboard:view"));

            // When
            var result = roleService.getById(20L);

            // Then
            assertEquals("operator", result.getRoleType());
            assertTrue(result.getIsEditable());
            assertFalse(result.getIsPreset());
        }

        @Test
        @DisplayName("getById 应返回超管角色的正确字段")
        void getByIdShouldReturnCorrectFieldsForSuperAdmin() {
            // Given
            when(roleMapper.selectById(10L)).thenReturn(superAdminRole);
            when(rolePermissionMapper.selectPermissionCodesByRoleId(10L))
                    .thenReturn(List.of("enterprise:dashboard:view"));

            // When
            var result = roleService.getById(10L);

            // Then
            assertEquals("super_admin", result.getRoleType());
            assertFalse(result.getIsEditable());
            assertTrue(result.getIsPreset());
            assertEquals("超级管理员", result.getName());
        }

        @Test
        @DisplayName("list 应返回所有角色的 roleType 和 isEditable 字段")
        void listShouldReturnRoleTypeAndIsEditableForAllRoles() {
            // Given
            when(roleMapper.selectList(any())).thenReturn(
                    List.of(superAdminRole, operatorRole, customRole));
            when(rolePermissionMapper.selectPermissionCodesByRoleId(10L))
                    .thenReturn(List.of("enterprise:dashboard:view"));
            when(rolePermissionMapper.selectPermissionCodesByRoleId(20L))
                    .thenReturn(List.of("enterprise:member:list"));
            when(rolePermissionMapper.selectPermissionCodesByRoleId(30L))
                    .thenReturn(List.of());

            // When
            var result = roleService.list(null);

            // Then
            assertEquals(3, result.size());

            // Super admin
            assertEquals("super_admin", result.get(0).getRoleType());
            assertFalse(result.get(0).getIsEditable());
            // Operator
            assertEquals("operator", result.get(1).getRoleType());
            assertTrue(result.get(1).getIsEditable());
            // Custom
            assertEquals("custom", result.get(2).getRoleType());
            assertTrue(result.get(2).getIsEditable());
        }

        @Test
        @DisplayName("getById 角色不存在应抛出异常")
        void getByIdShouldThrowWhenRoleNotFound() {
            // Given
            when(roleMapper.selectById(999L)).thenReturn(null);

            // When / Then
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> roleService.getById(999L));
            assertEquals(ErrorCode.NOT_FOUND.getCode(), ex.getCode());
        }
    }

    // ===== create 角色默认值测试 =====

    @Nested
    @DisplayName("testCreateRoleDefaults")
    class CreateRoleDefaultsTests {

        @Test
        @DisplayName("创建角色时未指定 roleType 应默认为 custom")
        void shouldDefaultRoleTypeToCustom() {
            // Given
            RoleCreateReq req = new RoleCreateReq();
            req.setName("测试角色");
            req.setPermissionCodes(List.of("enterprise:dashboard:view"));

            when(roleMapper.selectCount(any())).thenReturn(0L);
            when(roleMapper.selectOne(any())).thenReturn(superAdminRole);
            when(rolePermissionMapper.selectPermissionCodesByRoleId(10L))
                    .thenReturn(List.of("enterprise:dashboard:view"));
            when(roleMapper.insert(any(Role.class))).thenAnswer(inv -> {
                Role r = inv.getArgument(0);
                r.setId(31L);
                return 1;
            });
            when(roleMapper.selectById(31L)).thenAnswer(inv -> {
                Role r = new Role();
                r.setId(31L);
                r.setTenantId(TENANT_ID);
                r.setName("测试角色");
                r.setRoleType("custom");
                r.setIsEditable(true);
                r.setIsPreset(false);
                return r;
            });
            when(rolePermissionMapper.selectPermissionCodesByRoleId(31L))
                    .thenReturn(List.of("enterprise:dashboard:view"));

            // When
            var result = roleService.create(req);

            // Then
            ArgumentCaptor<Role> roleCaptor = ArgumentCaptor.forClass(Role.class);
            verify(roleMapper).insert(roleCaptor.capture());

            Role created = roleCaptor.getValue();
            assertEquals("custom", created.getRoleType(),
                    "Default roleType should be 'custom'");
            assertTrue(created.getIsEditable(),
                    "Default isEditable should be true");
        }

        @Test
        @DisplayName("创建 operator 类型角色应成功")
        void shouldCreateOperatorRole() {
            // Given
            RoleCreateReq req = new RoleCreateReq();
            req.setName("运营角色");
            req.setRoleType("operator");
            req.setPermissionCodes(List.of("enterprise:dashboard:view"));

            when(roleMapper.selectCount(any())).thenReturn(0L);
            when(roleMapper.selectOne(any())).thenReturn(superAdminRole);
            when(rolePermissionMapper.selectPermissionCodesByRoleId(10L))
                    .thenReturn(List.of("enterprise:dashboard:view"));
            when(roleMapper.insert(any(Role.class))).thenAnswer(inv -> {
                Role r = inv.getArgument(0);
                r.setId(31L);
                return 1;
            });
            when(roleMapper.selectById(31L)).thenAnswer(inv -> {
                Role r = new Role();
                r.setId(31L);
                r.setTenantId(TENANT_ID);
                r.setName("运营角色");
                r.setRoleType("operator");
                r.setIsEditable(true);
                r.setIsPreset(false);
                return r;
            });
            when(rolePermissionMapper.selectPermissionCodesByRoleId(31L))
                    .thenReturn(List.of("enterprise:dashboard:view"));

            // When
            var result = roleService.create(req);

            // Then
            assertEquals("operator", result.getRoleType());
            assertTrue(result.getIsEditable());
        }

        @Test
        @DisplayName("创建自定义角色时未提供权限列表应成功创建空权限角色")
        void shouldCreateRoleWithEmptyPermissions() {
            // Given
            RoleCreateReq req = new RoleCreateReq();
            req.setName("空权限角色");
            // permissionCodes is null

            when(roleMapper.selectCount(any())).thenReturn(0L);
            when(roleMapper.insert(any(Role.class))).thenAnswer(inv -> {
                Role r = inv.getArgument(0);
                r.setId(31L);
                return 1;
            });
            when(roleMapper.selectById(31L)).thenAnswer(inv -> {
                Role r = new Role();
                r.setId(31L);
                r.setTenantId(TENANT_ID);
                r.setName("空权限角色");
                r.setRoleType("custom");
                r.setIsEditable(true);
                return r;
            });
            when(rolePermissionMapper.selectPermissionCodesByRoleId(31L)).thenReturn(List.of());

            // When
            var result = roleService.create(req);

            // Then
            assertNotNull(result);
            assertEquals("空权限角色", result.getName());
            assertTrue(result.getPermissionCodes().isEmpty());
        }
    }

    // ===== assignPermissions 独立测试 =====

    @Nested
    @DisplayName("testAssignPermissions")
    class AssignPermissionsTests {

        @Test
        @DisplayName("assignPermissions 应正确更新角色权限")
        void assignPermissionsShouldUpdateRolePermissions() {
            // Given
            List<String> newPerms = List.of(
                    "enterprise:dashboard:view",
                    "enterprise:member:list"
            );
            when(roleMapper.selectById(20L)).thenReturn(operatorRole);
            when(roleMapper.selectOne(any())).thenReturn(superAdminRole);
            when(rolePermissionMapper.selectPermissionCodesByRoleId(10L))
                    .thenReturn(newPerms);
            when(userRoleMapper.selectUserIdsByRoleId(20L)).thenReturn(List.of(1L));

            // When
            roleService.assignPermissions(20L, newPerms);

            // Then
            verify(rolePermissionMapper).deleteByRoleId(20L);
            verify(rolePermissionMapper, times(2)).insert(any(RolePermission.class));
            verify(permissionService).refreshUserCache(1L);
        }

        @Test
        @DisplayName("assignPermissions 传入空列表应清空所有权限")
        void assignPermissionsWithEmptyListShouldClearPermissions() {
            // Given
            when(roleMapper.selectById(20L)).thenReturn(operatorRole);
            when(userRoleMapper.selectUserIdsByRoleId(20L)).thenReturn(List.of(1L));

            // When
            roleService.assignPermissions(20L, List.of());

            // Then
            verify(rolePermissionMapper).deleteByRoleId(20L);
            // No insert calls for empty list
            verify(rolePermissionMapper, never()).insert(any(RolePermission.class));
        }

        @Test
        @DisplayName("assignPermissions 用于超管角色应被拒绝")
        void assignPermissionsForSuperAdminShouldBeRejected() {
            // Given
            when(roleMapper.selectById(10L)).thenReturn(superAdminRole);

            // When / Then
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> roleService.assignPermissions(10L, List.of("enterprise:dashboard:view")));
            assertEquals(ErrorCode.ROLE_SUPER_ADMIN_IMMUTABLE.getCode(), ex.getCode());
        }
    }

    // ===== 错误路径测试 =====

    @Nested
    @DisplayName("testErrorPaths")
    class ErrorPathTests {

        @Test
        @DisplayName("updateRolePermissions 角色不存在应抛出异常")
        void updateRolePermissionsShouldThrowWhenRoleNotFound() {
            // Given
            when(roleMapper.selectById(999L)).thenReturn(null);

            // When / Then
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> roleService.updateRolePermissions(999L, List.of("enterprise:dashboard:view")));
            assertEquals(ErrorCode.NOT_FOUND.getCode(), ex.getCode());
        }

        @Test
        @DisplayName("assignUsers 角色不存在应抛出异常")
        void assignUsersShouldThrowWhenRoleNotFound() {
            // Given
            when(roleMapper.selectById(999L)).thenReturn(null);

            // When / Then
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> roleService.assignUsers(999L, List.of(1L)));
            assertEquals(ErrorCode.NOT_FOUND.getCode(), ex.getCode());
        }

        @Test
        @DisplayName("assignUsers 用户不存在应抛出异常")
        void assignUsersShouldThrowWhenUserNotFound() {
            // Given
            when(roleMapper.selectById(20L)).thenReturn(operatorRole);
            when(userMapper.selectById(999L)).thenReturn(null);

            // When / Then
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> roleService.assignUsers(20L, List.of(999L)));
            assertEquals(ErrorCode.USER_NOT_FOUND.getCode(), ex.getCode());
        }

        @Test
        @DisplayName("delete 角色不存在应抛出异常")
        void deleteShouldThrowWhenRoleNotFound() {
            // Given
            when(roleMapper.selectById(999L)).thenReturn(null);

            // When / Then
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> roleService.delete(999L));
            assertEquals(ErrorCode.NOT_FOUND.getCode(), ex.getCode());
        }
    }

    // ===== assignUsers 增强测试 =====

    @Nested
    @DisplayName("testAssignUsersMultiUser")
    class AssignUsersMultiUserTests {

        @Test
        @DisplayName("批量分配用户到角色应全部成功")
        void assignUsersShouldAssignAllUsers() {
            // Given
            User user2 = new User();
            user2.setId(2L);
            user2.setTenantId(TENANT_ID);

            when(roleMapper.selectById(20L)).thenReturn(operatorRole);
            when(userMapper.selectById(1L)).thenReturn(testUser);
            when(userMapper.selectById(2L)).thenReturn(user2);

            // When
            roleService.assignUsers(20L, List.of(1L, 2L));

            // Then
            ArgumentCaptor<UserRole> urCaptor = ArgumentCaptor.forClass(UserRole.class);
            verify(userRoleMapper, times(2)).insert(urCaptor.capture());

            List<UserRole> captured = urCaptor.getAllValues();
            assertEquals(2, captured.size());
            assertTrue(captured.stream().anyMatch(ur -> ur.getUserId().equals(1L)));
            assertTrue(captured.stream().anyMatch(ur -> ur.getUserId().equals(2L)));
            assertTrue(captured.stream().allMatch(ur -> ur.getRoleId().equals(20L)));

            verify(permissionService, times(2)).refreshUserCache(anyLong());
        }

        @Test
        @DisplayName("分配到 custom 类型角色应成功")
        void assignUsersToCustomRoleShouldSucceed() {
            // Given
            when(roleMapper.selectById(30L)).thenReturn(customRole);
            when(userMapper.selectById(1L)).thenReturn(testUser);

            // When
            roleService.assignUsers(30L, List.of(1L));

            // Then
            ArgumentCaptor<UserRole> urCaptor = ArgumentCaptor.forClass(UserRole.class);
            verify(userRoleMapper).insert(urCaptor.capture());
            assertEquals(30L, urCaptor.getValue().getRoleId());
            assertEquals(1L, urCaptor.getValue().getUserId());
        }
    }

    // ===== update 增强测试 =====

    @Nested
    @DisplayName("testUpdateEnhanced")
    class UpdateEnhancedTests {

        @Test
        @DisplayName("仅更新角色名称应成功")
        void updateOnlyNameShouldSucceed() {
            // Given
            RoleUpdateReq req = new RoleUpdateReq();
            req.setName("新运营管理员");

            when(roleMapper.selectById(20L)).thenReturn(operatorRole);
            when(roleMapper.selectCount(any())).thenReturn(0L);
            when(roleMapper.selectById(20L)).thenReturn(operatorRole);
            when(rolePermissionMapper.selectPermissionCodesByRoleId(20L))
                    .thenReturn(List.of("enterprise:dashboard:view"));

            // When
            var result = roleService.update(20L, req);

            // Then
            ArgumentCaptor<Role> roleCaptor = ArgumentCaptor.forClass(Role.class);
            verify(roleMapper).updateById(roleCaptor.capture());
            assertEquals("新运营管理员", roleCaptor.getValue().getName());
        }

        @Test
        @DisplayName("更新为重复角色名称应被拒绝")
        void updateToDuplicateNameShouldBeRejected() {
            // Given
            RoleUpdateReq req = new RoleUpdateReq();
            req.setName("超级管理员"); // existing name

            when(roleMapper.selectById(20L)).thenReturn(operatorRole);
            when(roleMapper.selectCount(any())).thenReturn(1L); // name already exists

            // When / Then
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> roleService.update(20L, req));
            assertEquals(ErrorCode.ROLE_NAME_DUPLICATE.getCode(), ex.getCode());
        }

        @Test
        @DisplayName("custom 角色应可以正常删除")
        void customRoleShouldBeDeletable() {
            // Given
            when(roleMapper.selectById(30L)).thenReturn(customRole);

            // When
            roleService.delete(30L);

            // Then
            verify(rolePermissionMapper).deleteByRoleId(30L);
            verify(roleMapper).deleteById(30L);
        }

        @Test
        @DisplayName("operator 角色应可以正常删除")
        void operatorRoleShouldBeDeletable() {
            // Given
            when(roleMapper.selectById(20L)).thenReturn(operatorRole);

            // When
            roleService.delete(20L);

            // Then
            verify(rolePermissionMapper).deleteByRoleId(20L);
            verify(roleMapper).deleteById(20L);
        }
    }
}
