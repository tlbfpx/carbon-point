package com.carbonpoint.system;

import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.system.dto.req.PackageCreateReq;
import com.carbonpoint.system.dto.req.PackageUpdateReq;
import com.carbonpoint.system.dto.req.TenantPackageChangeReq;
import com.carbonpoint.system.dto.res.PackageRes;
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

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * PackageService 集成测试。
 *
 * 测试场景：
 * 1. 套餐 CRUD 操作
 * 2. 套餐删除校验（绑定企业的套餐不可删除）
 * 3. 套餐权限管理
 * 4. 企业套餐变更
 *
 * 基于: docs/superpowers/specs/2026-04-12-enterprise-role-permission-design.md
 */
@ExtendWith(MockitoExtension.class)
class PackageServiceTest {

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

    private PermissionPackage freePackage;
    private PermissionPackage proPackage;

    @BeforeEach
    void setUp() {
        freePackage = new PermissionPackage();
        freePackage.setId(1L);
        freePackage.setCode("free");
        freePackage.setName("免费版");
        freePackage.setDescription("基础套餐");
        freePackage.setStatus(true);
        freePackage.setCreatedAt(LocalDateTime.now());
        freePackage.setUpdatedAt(LocalDateTime.now());

        proPackage = new PermissionPackage();
        proPackage.setId(2L);
        proPackage.setCode("pro");
        proPackage.setName("专业版");
        proPackage.setDescription("专业版套餐");
        proPackage.setStatus(true);
        proPackage.setCreatedAt(LocalDateTime.now());
        proPackage.setUpdatedAt(LocalDateTime.now());
    }

    // ===== 套餐 CRUD 测试 =====

    @Nested
    @DisplayName("testCreatePackage")
    class CreatePackageTests {

        @Test
        @DisplayName("应成功创建套餐")
        void shouldCreatePackageSuccessfully() {
            // Given
            PackageCreateReq req = new PackageCreateReq();
            req.setCode("enterprise");
            req.setName("旗舰版");
            req.setDescription("全功能套餐");
            req.setPermissionCodes(List.of(
                    "enterprise:dashboard:view",
                    "enterprise:member:list",
                    "enterprise:member:create"
            ));

            when(packageMapper.selectCount(any())).thenReturn(0L);
            when(packageMapper.insert(any(PermissionPackage.class))).thenAnswer(inv -> {
                PermissionPackage p = inv.getArgument(0);
                p.setId(3L);
                return 1;
            });
            when(packageMapper.selectById(3L)).thenAnswer(inv -> {
                PermissionPackage p = new PermissionPackage();
                p.setId(3L);
                p.setCode(req.getCode());
                p.setName(req.getName());
                p.setDescription(req.getDescription());
                p.setStatus(true);
                return p;
            });
            when(packagePermissionMapper.selectCodesByPackageId(3L)).thenReturn(req.getPermissionCodes());
            when(packageMapper.countTenantsByPackageId(3L)).thenReturn(0L);

            // When
            PackageRes result = packageService.create(req);

            // Then
            assertNotNull(result);
            assertEquals(3L, result.getId());
            assertEquals("enterprise", result.getCode());
            assertEquals("旗舰版", result.getName());
            assertEquals(3, result.getPermissionCount());

            // Verify permission entries were created
            verify(packagePermissionMapper, times(req.getPermissionCodes().size())).insert(any(PackagePermission.class));
        }

        @Test
        @DisplayName("应拒绝创建 code 重复的套餐")
        void shouldRejectDuplicatePackageCode() {
            // Given
            PackageCreateReq req = new PackageCreateReq();
            req.setCode("free");
            req.setName("免费版");
            req.setDescription("desc");

            when(packageMapper.selectCount(any())).thenReturn(1L);

            // When / Then
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> packageService.create(req));
            assertEquals(ErrorCode.PACKAGE_CODE_DUPLICATE.getCode(), ex.getCode());
        }
    }

    @Nested
    @DisplayName("testUpdatePackage")
    class UpdatePackageTests {

        @Test
        @DisplayName("应成功更新套餐基本信息")
        void shouldUpdatePackageBasicInfo() {
            // Given
            PackageUpdateReq req = new PackageUpdateReq();
            req.setName("免费版升级");
            req.setDescription("更新描述");
            req.setStatus(false);

            when(packageMapper.selectById(1L)).thenReturn(freePackage);
            when(packageMapper.updateById(any(PermissionPackage.class))).thenReturn(1);
            when(packagePermissionMapper.selectCodesByPackageId(1L)).thenReturn(List.of("enterprise:dashboard:view"));
            when(packageMapper.countTenantsByPackageId(1L)).thenReturn(0L);

            // When
            PackageRes result = packageService.update(1L, req);

            // Then
            assertNotNull(result);
            ArgumentCaptor<PermissionPackage> captor = ArgumentCaptor.forClass(PermissionPackage.class);
            verify(packageMapper).updateById(captor.capture());
            assertEquals("免费版升级", captor.getValue().getName());
            assertEquals("更新描述", captor.getValue().getDescription());
            assertFalse(captor.getValue().getStatus());
        }

        @Test
        @DisplayName("应拒绝更新不存在的套餐")
        void shouldRejectUpdateNonExistentPackage() {
            // Given
            when(packageMapper.selectById(999L)).thenReturn(null);

            // When / Then
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> packageService.update(999L, new PackageUpdateReq()));
            assertEquals(ErrorCode.PACKAGE_NOT_FOUND.getCode(), ex.getCode());
        }
    }

    @Nested
    @DisplayName("testDeletePackageWithTenantBound")
    class DeletePackageTests {

        @Test
        @DisplayName("应拒绝删除已绑定企业的套餐")
        void shouldRejectDeletePackageWithBoundTenant() {
            // Given
            when(packageMapper.selectById(1L)).thenReturn(freePackage);
            when(packageMapper.countTenantsByPackageId(1L)).thenReturn(2L); // has bound tenants

            // When / Then
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> packageService.delete(1L));
            assertEquals(ErrorCode.PACKAGE_HAS_TENANTS.getCode(), ex.getCode());
            assertTrue(ex.getMessage().contains("企业绑定"));
            verify(packageMapper, never()).deleteById(anyLong());
        }

        @Test
        @DisplayName("应允许删除未绑定企业的套餐")
        void shouldAllowDeletePackageWithNoBoundTenant() {
            // Given
            when(packageMapper.selectById(1L)).thenReturn(freePackage);
            when(packageMapper.countTenantsByPackageId(1L)).thenReturn(0L);
            when(packageMapper.deleteById(1L)).thenReturn(1);

            // When
            packageService.delete(1L);

            // Then
            verify(packageMapper).deleteById(1L);
        }
    }

    @Nested
    @DisplayName("testPackagePermissionCRUD")
    class PackagePermissionCRUDTests {

        @Test
        @DisplayName("应返回套餐包含的所有权限")
        void shouldReturnAllPermissionsForPackage() {
            // Given
            List<String> expected = List.of(
                    "enterprise:dashboard:view",
                    "enterprise:member:list",
                    "enterprise:member:create"
            );
            when(packageMapper.selectById(1L)).thenReturn(freePackage);
            when(packagePermissionMapper.selectCodesByPackageId(1L)).thenReturn(expected);

            // When
            List<String> result = packageService.getPermissionsByPackageId(1L);

            // Then
            assertEquals(expected.size(), result.size());
            assertTrue(result.containsAll(expected));
        }

        @Test
        @DisplayName("应成功更新套餐权限")
        void shouldUpdatePackagePermissions() {
            // Given
            List<String> newPerms = List.of(
                    "enterprise:dashboard:view",
                    "enterprise:member:list"
            );
            when(packageMapper.selectById(1L)).thenReturn(freePackage);
            // No tenants bound, so rebuildAllTenantsRolesByPackage won't be called
            when(packageMapper.countTenantsByPackageId(1L)).thenReturn(0L);

            // When
            packageService.updatePermissions(1L, newPerms);

            // Then
            // Old permissions should be deleted
            verify(packagePermissionMapper).delete(any());
            // New permissions should be inserted
            verify(packagePermissionMapper, times(newPerms.size())).insert(any(PackagePermission.class));
        }

        @Test
        @DisplayName("应列出所有套餐（含统计信息）")
        void shouldListAllPackagesWithStats() {
            // Given
            when(packageMapper.selectList(any())).thenReturn(List.of(freePackage, proPackage));
            when(packagePermissionMapper.selectCodesByPackageId(1L)).thenReturn(List.of("enterprise:dashboard:view"));
            when(packagePermissionMapper.selectCodesByPackageId(2L)).thenReturn(
                    List.of("enterprise:dashboard:view", "enterprise:member:list"));
            when(packageMapper.countTenantsByPackageId(1L)).thenReturn(10L);
            when(packageMapper.countTenantsByPackageId(2L)).thenReturn(5L);

            // When
            List<PackageRes> result = packageService.list();

            // Then
            assertEquals(2, result.size());
            assertEquals("free", result.get(0).getCode());
            assertEquals(1, result.get(0).getPermissionCount());
            assertEquals(10L, result.get(0).getTenantCount());
            assertEquals("pro", result.get(1).getCode());
            assertEquals(2, result.get(1).getPermissionCount());
            assertEquals(5L, result.get(1).getTenantCount());
        }
    }
}
