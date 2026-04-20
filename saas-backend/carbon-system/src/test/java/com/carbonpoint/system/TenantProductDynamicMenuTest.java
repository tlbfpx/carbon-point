package com.carbonpoint.system;

import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.system.dto.res.TenantProductRes;
import com.carbonpoint.system.entity.*;
import com.carbonpoint.system.mapper.*;
import com.carbonpoint.system.service.impl.TenantProductServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

/**
 * Section 14.5 — Dynamic menu generation test.
 *
 * Validates that TenantProductServiceImpl returns different product lists
 * based on different package configurations, which the frontend uses to
 * dynamically render menus (only show menus for enabled products).
 *
 * Based on: specs/package-product-model/spec.md "动态菜单生成"
 */
@ExtendWith(MockitoExtension.class)
class TenantProductDynamicMenuTest {

    @Mock
    private TenantMapper tenantMapper;

    @Mock
    private PackageProductMapper packageProductMapper;

    @Mock
    private PackageProductFeatureMapper packageProductFeatureMapper;

    @Mock
    private ProductMapper productMapper;

    @Mock
    private ProductFeatureMapper productFeatureMapper;

    @InjectMocks
    private TenantProductServiceImpl tenantProductService;

    private Tenant tenant;
    private ProductEntity stairProduct;
    private ProductEntity walkingProduct;

    @BeforeEach
    void setUp() {
        tenant = new Tenant();
        tenant.setId(100L);
        tenant.setName("测试企业");
        tenant.setStatus("active");

        stairProduct = new ProductEntity();
        stairProduct.setId("prod-stair-001");
        stairProduct.setCode("stairs_basic");
        stairProduct.setName("爬楼积分");
        stairProduct.setCategory("stairs_climbing");
        stairProduct.setStatus(1);

        walkingProduct = new ProductEntity();
        walkingProduct.setId("prod-walking-001");
        walkingProduct.setCode("walking_pro");
        walkingProduct.setName("走路积分");
        walkingProduct.setCategory("walking");
        walkingProduct.setStatus(1);
    }

    // ===== Scenario: Only show menus for enabled products =====

    @Nested
    @DisplayName("仅显示已启用产品的菜单")
    class OnlyEnabledProductsTests {

        @Test
        @DisplayName("套餐包含爬楼和走路 → 返回两个产品")
        void shouldReturnBothProductsWhenPackageHasBoth() {
            // Given: package includes both stairs and walking
            tenant.setPackageId(1L);

            PackageProductEntity stairPkg = new PackageProductEntity();
            stairPkg.setPackageId(1L);
            stairPkg.setProductId("prod-stair-001");

            PackageProductEntity walkingPkg = new PackageProductEntity();
            walkingPkg.setPackageId(1L);
            walkingPkg.setProductId("prod-walking-001");

            when(tenantMapper.selectByIdForPlatform(100L)).thenReturn(tenant);
            when(packageProductMapper.selectByPackageId(1L))
                    .thenReturn(List.of(stairPkg, walkingPkg));
            when(productMapper.selectById("prod-stair-001")).thenReturn(stairProduct);
            when(productMapper.selectById("prod-walking-001")).thenReturn(walkingProduct);
            when(packageProductFeatureMapper.selectByPackageIdAndProductId(eq(1L), anyString()))
                    .thenReturn(Collections.emptyList());

            // When
            List<TenantProductRes> result = tenantProductService.getTenantProducts(100L);

            // Then: both products returned (frontend shows both menus)
            assertEquals(2, result.size());
            assertTrue(result.stream().anyMatch(p -> p.getProductCode().equals("stairs_basic")));
            assertTrue(result.stream().anyMatch(p -> p.getProductCode().equals("walking_pro")));
        }

        @Test
        @DisplayName("套餐仅包含爬楼 → 只返回爬楼产品（走路菜单隐藏）")
        void shouldReturnOnlyStairsWhenWalkingNotInPackage() {
            // Given: package only has stairs
            tenant.setPackageId(2L);

            PackageProductEntity stairPkg = new PackageProductEntity();
            stairPkg.setPackageId(2L);
            stairPkg.setProductId("prod-stair-001");

            when(tenantMapper.selectByIdForPlatform(100L)).thenReturn(tenant);
            when(packageProductMapper.selectByPackageId(2L))
                    .thenReturn(List.of(stairPkg));
            when(productMapper.selectById("prod-stair-001")).thenReturn(stairProduct);
            when(packageProductFeatureMapper.selectByPackageIdAndProductId(eq(2L), eq("prod-stair-001")))
                    .thenReturn(Collections.emptyList());

            // When
            List<TenantProductRes> result = tenantProductService.getTenantProducts(100L);

            // Then: only stairs product returned (walking menu hidden)
            assertEquals(1, result.size());
            assertEquals("stairs_basic", result.get(0).getProductCode());
        }
    }

    // ===== Scenario: Only show sub-menus for enabled features =====

    @Nested
    @DisplayName("仅显示已启用功能点的子菜单")
    class OnlyEnabledFeaturesTests {

        @Test
        @DisplayName("已启用功能点应出现在 featureConfig 中")
        void shouldIncludeEnabledFeaturesInConfig() {
            // Given: package has stairs with "consecutive_bonus" enabled, "holiday_double" disabled
            tenant.setPackageId(3L);

            PackageProductEntity stairPkg = new PackageProductEntity();
            stairPkg.setPackageId(3L);
            stairPkg.setProductId("prod-stair-001");

            PackageProductFeatureEntity consecutiveFeature = new PackageProductFeatureEntity();
            consecutiveFeature.setPackageId(3L);
            consecutiveFeature.setProductId("prod-stair-001");
            consecutiveFeature.setFeatureId("consecutive_bonus");
            consecutiveFeature.setIsEnabled(true);
            consecutiveFeature.setConfigValue("3");

            PackageProductFeatureEntity holidayFeature = new PackageProductFeatureEntity();
            holidayFeature.setPackageId(3L);
            holidayFeature.setProductId("prod-stair-001");
            holidayFeature.setFeatureId("holiday_double");
            holidayFeature.setIsEnabled(false);
            holidayFeature.setConfigValue("");

            when(tenantMapper.selectByIdForPlatform(100L)).thenReturn(tenant);
            when(packageProductMapper.selectByPackageId(3L)).thenReturn(List.of(stairPkg));
            when(productMapper.selectById("prod-stair-001")).thenReturn(stairProduct);
            when(packageProductFeatureMapper.selectByPackageIdAndProductId(3L, "prod-stair-001"))
                    .thenReturn(List.of(consecutiveFeature, holidayFeature));

            // When
            List<TenantProductRes> result = tenantProductService.getTenantProducts(100L);

            // Then: only enabled feature appears in config
            assertEquals(1, result.size());
            Map<String, String> featureConfig = result.get(0).getFeatureConfig();
            assertTrue(featureConfig.containsKey("consecutive_bonus"));
            assertEquals("3", featureConfig.get("consecutive_bonus"));
            assertFalse(featureConfig.containsKey("holiday_double"),
                    "Disabled feature should not appear in config (sub-menu hidden)");
        }

        @Test
        @DisplayName("无功能点启用时 featureConfig 为空")
        void shouldReturnEmptyFeatureConfigWhenNoFeaturesEnabled() {
            // Given: package has stairs but no features enabled
            tenant.setPackageId(4L);

            PackageProductEntity stairPkg = new PackageProductEntity();
            stairPkg.setPackageId(4L);
            stairPkg.setProductId("prod-stair-001");

            PackageProductFeatureEntity disabledFeature = new PackageProductFeatureEntity();
            disabledFeature.setPackageId(4L);
            disabledFeature.setProductId("prod-stair-001");
            disabledFeature.setFeatureId("consecutive_bonus");
            disabledFeature.setIsEnabled(false);
            disabledFeature.setConfigValue("");

            when(tenantMapper.selectByIdForPlatform(100L)).thenReturn(tenant);
            when(packageProductMapper.selectByPackageId(4L)).thenReturn(List.of(stairPkg));
            when(productMapper.selectById("prod-stair-001")).thenReturn(stairProduct);
            when(packageProductFeatureMapper.selectByPackageIdAndProductId(4L, "prod-stair-001"))
                    .thenReturn(List.of(disabledFeature));

            // When
            List<TenantProductRes> result = tenantProductService.getTenantProducts(100L);

            // Then
            assertEquals(1, result.size());
            assertTrue(result.get(0).getFeatureConfig().isEmpty());
        }
    }

    // ===== Scenario: Different packages → different menu trees =====

    @Nested
    @DisplayName("不同套餐配置 → 不同菜单树")
    class DifferentPackageDifferentMenuTests {

        @Test
        @DisplayName("升级套餐后新增走路产品 → 走路菜单出现")
        void shouldAddWalkingMenuAfterUpgrade() {
            // Given: tenant upgraded from package with only stairs to package with both
            tenant.setPackageId(1L); // new package with both products

            PackageProductEntity stairPkg = new PackageProductEntity();
            stairPkg.setPackageId(1L);
            stairPkg.setProductId("prod-stair-001");

            PackageProductEntity walkingPkg = new PackageProductEntity();
            walkingPkg.setPackageId(1L);
            walkingPkg.setProductId("prod-walking-001");

            when(tenantMapper.selectByIdForPlatform(100L)).thenReturn(tenant);
            when(packageProductMapper.selectByPackageId(1L))
                    .thenReturn(List.of(stairPkg, walkingPkg));
            when(productMapper.selectById("prod-stair-001")).thenReturn(stairProduct);
            when(productMapper.selectById("prod-walking-001")).thenReturn(walkingProduct);
            when(packageProductFeatureMapper.selectByPackageIdAndProductId(eq(1L), anyString()))
                    .thenReturn(Collections.emptyList());

            // When
            List<TenantProductRes> result = tenantProductService.getTenantProducts(100L);

            // Then: walking menu appears after upgrade
            assertEquals(2, result.size());
            assertTrue(result.stream().anyMatch(p -> p.getProductCode().equals("walking_pro")),
                    "Walking product should appear in menu after package upgrade");
        }

        @Test
        @DisplayName("降级套餐后走路产品消失 → 走路菜单隐藏")
        void shouldHideWalkingMenuAfterDowngrade() {
            // Given: tenant downgraded to package without walking
            tenant.setPackageId(5L); // package with only stairs

            PackageProductEntity stairPkg = new PackageProductEntity();
            stairPkg.setPackageId(5L);
            stairPkg.setProductId("prod-stair-001");

            when(tenantMapper.selectByIdForPlatform(100L)).thenReturn(tenant);
            when(packageProductMapper.selectByPackageId(5L)).thenReturn(List.of(stairPkg));
            when(productMapper.selectById("prod-stair-001")).thenReturn(stairProduct);
            when(packageProductFeatureMapper.selectByPackageIdAndProductId(5L, "prod-stair-001"))
                    .thenReturn(Collections.emptyList());

            // When
            List<TenantProductRes> result = tenantProductService.getTenantProducts(100L);

            // Then: walking menu is gone after downgrade
            assertEquals(1, result.size());
            assertEquals("stairs_basic", result.get(0).getProductCode());
            assertFalse(result.stream().anyMatch(p -> p.getProductCode().equals("walking_pro")),
                    "Walking product should NOT appear after downgrade");
        }
    }

    // ===== Edge cases =====

    @Nested
    @DisplayName("边界情况")
    class EdgeCaseTests {

        @Test
        @DisplayName("企业没有套餐 → 返回空列表（无菜单）")
        void shouldReturnEmptyWhenNoPackage() {
            tenant.setPackageId(null);
            when(tenantMapper.selectByIdForPlatform(100L)).thenReturn(tenant);

            List<TenantProductRes> result = tenantProductService.getTenantProducts(100L);

            assertTrue(result.isEmpty());
        }

        @Test
        @DisplayName("套餐没有任何产品 → 返回空列表")
        void shouldReturnEmptyWhenNoProductsInPackage() {
            tenant.setPackageId(10L);
            when(tenantMapper.selectByIdForPlatform(100L)).thenReturn(tenant);
            when(packageProductMapper.selectByPackageId(10L)).thenReturn(Collections.emptyList());

            List<TenantProductRes> result = tenantProductService.getTenantProducts(100L);

            assertTrue(result.isEmpty());
        }

        @Test
        @DisplayName("企业不存在 → 抛出异常")
        void shouldThrowWhenTenantNotFound() {
            when(tenantMapper.selectByIdForPlatform(999L)).thenReturn(null);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> tenantProductService.getTenantProducts(999L));
            assertEquals(ErrorCode.TENANT_NOT_FOUND.getCode(), ex.getCode());
        }

        @Test
        @DisplayName("产品状态为禁用 → 不返回该产品")
        void shouldSkipDisabledProducts() {
            tenant.setPackageId(6L);

            ProductEntity disabledProduct = new ProductEntity();
            disabledProduct.setId("prod-disabled-001");
            disabledProduct.setCode("disabled_prod");
            disabledProduct.setName("已禁用产品");
            disabledProduct.setStatus(0); // disabled

            PackageProductEntity pkg = new PackageProductEntity();
            pkg.setPackageId(6L);
            pkg.setProductId("prod-disabled-001");

            when(tenantMapper.selectByIdForPlatform(100L)).thenReturn(tenant);
            when(packageProductMapper.selectByPackageId(6L)).thenReturn(List.of(pkg));
            when(productMapper.selectById("prod-disabled-001")).thenReturn(disabledProduct);

            List<TenantProductRes> result = tenantProductService.getTenantProducts(100L);

            assertTrue(result.isEmpty(), "Disabled product should not appear in menu");
        }
    }
}
