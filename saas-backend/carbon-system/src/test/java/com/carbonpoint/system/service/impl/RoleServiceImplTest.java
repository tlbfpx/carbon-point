package com.carbonpoint.system.service.impl;

import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.system.dto.req.RoleCreateReq;
import com.carbonpoint.system.dto.req.RoleUpdateReq;
import com.carbonpoint.system.dto.res.RoleDetailRes;
import com.carbonpoint.system.entity.Role;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.entity.UserRole;
import com.carbonpoint.system.mapper.*;
import com.carbonpoint.system.security.CurrentUser;
import com.carbonpoint.system.security.PermissionService;
import com.carbonpoint.system.service.RoleService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("RoleServiceImpl")
class RoleServiceImplTest {

    @Mock private RoleMapper roleMapper;
    @Mock private RolePermissionMapper rolePermissionMapper;
    @Mock private UserRoleMapper userRoleMapper;
    @Mock private UserMapper userMapper;
    @Mock private PermissionService permissionService;
    @Mock private CurrentUser currentUser;
    @Mock private PackagePermissionMapper packagePermissionMapper;

    private RoleService roleService;

    private static final Long TENANT_ID = 1L;

    @BeforeEach
    void setUp() {
        roleService = new RoleServiceImpl(
                roleMapper, rolePermissionMapper, userRoleMapper,
                userMapper, permissionService, currentUser, packagePermissionMapper);
    }

    @Nested
    @DisplayName("create")
    class CreateTests {

        @Test
        @DisplayName("should reject super_admin role creation from enterprise side")
        void shouldRejectSuperAdminCreation() {
            RoleCreateReq req = new RoleCreateReq();
            req.setName("超级管理员");
            req.setRoleType("super_admin");

            when(roleMapper.selectCount(any())).thenReturn(0L);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> roleService.create(req));
            assertEquals(ErrorCode.ROLE_SUPER_ADMIN_IMMUTABLE.getCode(), ex.getCode());
        }

        @Test
        @DisplayName("should reject duplicate role name")
        void shouldRejectDuplicateRoleName() {
            RoleCreateReq req = new RoleCreateReq();
            req.setName("管理员");
            req.setRoleType("custom");

            when(roleMapper.selectCount(any())).thenReturn(1L); // role already exists

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> roleService.create(req));
            assertEquals(ErrorCode.ROLE_NAME_DUPLICATE.getCode(), ex.getCode());
        }

        @Test
        @DisplayName("should create custom role with default type")
        void shouldCreateCustomRoleWithDefaultType() {
            RoleCreateReq req = new RoleCreateReq();
            req.setName("运营角色");
            // roleType is null

            when(roleMapper.selectCount(any())).thenReturn(0L);

            Role insertedRole = new Role();
            insertedRole.setId(1L);
            when(roleMapper.selectById(any())).thenReturn(insertedRole);
            when(rolePermissionMapper.selectPermissionCodesByRoleId(anyLong())).thenReturn(List.of());

            RoleDetailRes result = roleService.create(req);

            ArgumentCaptor<Role> captor = ArgumentCaptor.forClass(Role.class);
            verify(roleMapper).insert(captor.capture());
            assertEquals("custom", captor.getValue().getRoleType());
            assertEquals("运营角色", captor.getValue().getName());
        }
    }

    @Nested
    @DisplayName("update")
    class UpdateTests {

        @Test
        @DisplayName("should reject editing of preset/super_admin role")
        void shouldRejectEditingSuperAdminRole() {
            Role superAdmin = new Role();
            superAdmin.setId(1L);
            superAdmin.setName("超级管理员");
            superAdmin.setRoleType("super_admin");
            superAdmin.setIsPreset(true);
            superAdmin.setIsEditable(false);

            when(roleMapper.selectById(1L)).thenReturn(superAdmin);

            RoleUpdateReq req = new RoleUpdateReq();
            req.setName("新名称");

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> roleService.update(1L, req));
            assertEquals(ErrorCode.ROLE_SUPER_ADMIN_IMMUTABLE.getCode(), ex.getCode());
        }

        @Test
        @DisplayName("should reject duplicate name when updating")
        void shouldRejectDuplicateNameOnUpdate() {
            Role existing = new Role();
            existing.setId(1L);
            existing.setTenantId(TENANT_ID);
            existing.setName("角色A");
            existing.setRoleType("custom");
            existing.setIsEditable(true);
            existing.setIsPreset(false);

            when(roleMapper.selectById(1L)).thenReturn(existing);
            when(roleMapper.selectCount(any())).thenReturn(1L); // another role with same name

            RoleUpdateReq req = new RoleUpdateReq();
            req.setName("角色A");

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> roleService.update(1L, req));
            assertEquals(ErrorCode.ROLE_NAME_DUPLICATE.getCode(), ex.getCode());
        }

        @Test
        @DisplayName("should throw NOT_FOUND when role does not exist")
        void shouldThrowNotFoundWhenRoleDoesNotExist() {
            when(roleMapper.selectById(99L)).thenReturn(null);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> roleService.update(99L, new RoleUpdateReq()));
            assertEquals(ErrorCode.NOT_FOUND.getCode(), ex.getCode());
        }
    }

    @Nested
    @DisplayName("delete")
    class DeleteTests {

        @Test
        @DisplayName("should reject deleting preset role")
        void shouldRejectDeletingPresetRole() {
            Role preset = new Role();
            preset.setId(1L);
            preset.setName("预设角色");
            preset.setIsPreset(true);
            preset.setIsEditable(false);

            when(roleMapper.selectById(1L)).thenReturn(preset);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> roleService.delete(1L));
            assertEquals(ErrorCode.ROLE_SUPER_ADMIN_IMMUTABLE.getCode(), ex.getCode());
        }

        @Test
        @DisplayName("should throw NOT_FOUND when deleting non-existent role")
        void shouldThrowNotFoundWhenDeletingNonExistent() {
            when(roleMapper.selectById(99L)).thenReturn(null);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> roleService.delete(99L));
            assertEquals(ErrorCode.NOT_FOUND.getCode(), ex.getCode());
        }

        @Test
        @DisplayName("should allow deleting custom role")
        void shouldAllowDeletingCustomRole() {
            Role custom = new Role();
            custom.setId(5L);
            custom.setTenantId(TENANT_ID);
            custom.setName("自定义角色");
            custom.setRoleType("custom");
            custom.setIsPreset(false);
            custom.setIsEditable(true);

            when(roleMapper.selectById(5L)).thenReturn(custom);
            // No super admin role check needed for custom role
            when(userRoleMapper.selectUserIdsByRoleId(5L)).thenReturn(List.of());

            roleService.delete(5L);

            verify(roleMapper).deleteById(5L);
            verify(rolePermissionMapper).deleteByRoleId(5L);
        }
    }

    @Nested
    @DisplayName("assignUsers")
    class AssignUsersTests {

        @Test
        @DisplayName("should reject assigning users to super_admin role")
        void shouldRejectAssigningUsersToSuperAdminRole() {
            Role superAdmin = new Role();
            superAdmin.setId(1L);
            superAdmin.setTenantId(TENANT_ID);
            superAdmin.setRoleType("super_admin");

            when(roleMapper.selectById(1L)).thenReturn(superAdmin);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> roleService.assignUsers(1L, List.of(1L, 2L)));
            assertEquals(ErrorCode.ROLE_SUPER_ADMIN_ASSIGN_FORBIDDEN.getCode(), ex.getCode());
        }

        @Test
        @DisplayName("should reject assigning user from different tenant")
        void shouldRejectAssigningUserFromDifferentTenant() {
            Role custom = new Role();
            custom.setId(5L);
            custom.setTenantId(TENANT_ID);
            custom.setRoleType("custom");

            User otherTenantUser = new User();
            otherTenantUser.setId(100L);
            otherTenantUser.setTenantId(999L); // different tenant

            when(roleMapper.selectById(5L)).thenReturn(custom);
            when(userMapper.selectBatchIds(List.of(100L))).thenReturn(List.of(otherTenantUser));

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> roleService.assignUsers(5L, List.of(100L)));
            assertEquals(ErrorCode.USER_NOT_IN_TENANT.getCode(), ex.getCode());
        }

        @Test
        @DisplayName("should refresh permission cache after assigning users")
        void shouldRefreshPermissionCacheAfterAssigningUsers() {
            Role custom = new Role();
            custom.setId(5L);
            custom.setTenantId(TENANT_ID);
            custom.setRoleType("custom");

            User user1 = new User();
            user1.setId(1L);
            user1.setTenantId(TENANT_ID);

            when(roleMapper.selectById(5L)).thenReturn(custom);
            when(userMapper.selectBatchIds(List.of(1L))).thenReturn(List.of(user1));

            roleService.assignUsers(5L, List.of(1L));

            verify(permissionService).refreshUsersCache(List.of(1L));
        }

        @Test
        @DisplayName("should throw NOT_FOUND when assigning to non-existent role")
        void shouldThrowNotFoundWhenAssigningToNonExistentRole() {
            when(roleMapper.selectById(99L)).thenReturn(null);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> roleService.assignUsers(99L, List.of(1L)));
            assertEquals(ErrorCode.NOT_FOUND.getCode(), ex.getCode());
        }
    }
}
