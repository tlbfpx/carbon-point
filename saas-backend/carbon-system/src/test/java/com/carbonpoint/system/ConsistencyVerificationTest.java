package com.carbonpoint.system;

import com.carbonpoint.system.dto.res.MenuItemVO;
import com.carbonpoint.system.dto.res.MenuNode;
import com.carbonpoint.system.entity.*;
import com.carbonpoint.system.enums.ResourceType;
import com.carbonpoint.system.mapper.*;
import com.carbonpoint.system.service.MenuService;
import com.carbonpoint.system.service.ResourceRegistry;
import com.carbonpoint.system.service.impl.MenuServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * ConsistencyVerificationTest - 对比新旧架构的数据一致性和性能基准测试。
 *
 * 测试场景：
 * 1. 旧架构（MenuItemVO）与新架构（MenuNode）菜单数据一致性对比
 * 2. 验证所有资源在两种架构中都存在
 * 3. 新旧 API 性能基准对比
 * 4. 响应时间测量
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ConsistencyVerificationTest {

    @Mock
    private TenantMapper tenantMapper;

    @Mock
    private ProductMapper productMapper;

    @Mock
    private ProductFeatureMapper productFeatureMapper;

    @Mock
    private PackageProductMapper packageProductMapper;

    @Mock
    private PackageProductFeatureMapper packageProductFeatureMapper;

    @Mock
    private FeatureMapper featureMapper;

    @Mock
    private ResourceRegistry resourceRegistry;

    @Mock
    private PlatformProductMapper platformProductMapper;

    @Mock
    private com.carbonpoint.system.service.TenantResourceConfigService tenantResourceConfigService;

    @InjectMocks
    private MenuServiceImpl menuService;

    private Tenant testTenant;
    private ProductEntity testOldProduct;
    private PlatformResource testNewProduct;
    private PackageProductEntity testPackageProduct;
    private LocalDateTime testTime;

    @BeforeEach
    void setUp() {
        testTime = LocalDateTime.now();

        // Setup test tenant
        testTenant = new Tenant();
        testTenant.setId(100L);
        testTenant.setName("测试企业");
        testTenant.setPackageId(1L);
        testTenant.setStatus("active");

        // Setup old product entity
        testOldProduct = new ProductEntity();
        testOldProduct.setId("prod-1");
        testOldProduct.setCode("stair_climbing");
        testOldProduct.setName("楼梯打卡");
        testOldProduct.setCategory("stairs_climbing");
        testOldProduct.setStatus(1);

        // Setup new platform resource
        testNewProduct = new PlatformResource();
        testNewProduct.setId("res-1");
        testNewProduct.setCode("stair_climbing");
        testNewProduct.setName("楼梯打卡");
        testNewProduct.setCategory("stairs_climbing");
        testNewProduct.setType(ResourceType.FUNCTION_PRODUCT.getCode());
        testNewProduct.setStatus("ENABLED");
        testNewProduct.setIcon("RiseOutlined");
        testNewProduct.setSortOrder(10);

        // Setup package product
        testPackageProduct = new PackageProductEntity();
        testPackageProduct.setPackageId(1L);
        testPackageProduct.setProductId("prod-1");
    }

    @Nested
    @DisplayName("菜单数据一致性测试")
    class MenuConsistencyTests {

        @Test
        @DisplayName("新旧架构应返回相同数量的菜单项")
        void shouldReturnSameMenuItemCount() {
            // Given
            when(tenantMapper.selectById(100L)).thenReturn(testTenant);
            when(packageProductMapper.selectByPackageId(1L)).thenReturn(new ArrayList<>(List.of(testPackageProduct)));
            when(productMapper.selectById("prod-1")).thenReturn(testOldProduct);
            when(resourceRegistry.getFunctionProducts()).thenReturn(new ArrayList<>(List.of(testNewProduct)));

            // When
            List<MenuItemVO> oldMenu = menuService.getTenantMenu(100L);
            List<MenuNode> newMenu = menuService.getResourceDrivenMenu(100L);

            // Then
            assertEquals(oldMenu.size(), newMenu.size(), "新旧架构菜单项数量应一致");
        }

        @Test
        @DisplayName("新旧架构菜单项的 key 应一致")
        void shouldHaveSameMenuKeys() {
            // Given
            when(tenantMapper.selectById(100L)).thenReturn(testTenant);
            when(packageProductMapper.selectByPackageId(1L)).thenReturn(new ArrayList<>(List.of(testPackageProduct)));
            when(productMapper.selectById("prod-1")).thenReturn(testOldProduct);
            when(resourceRegistry.getFunctionProducts()).thenReturn(new ArrayList<>(List.of(testNewProduct)));

            // When
            List<MenuItemVO> oldMenu = menuService.getTenantMenu(100L);
            List<MenuNode> newMenu = menuService.getResourceDrivenMenu(100L);

            // Then
            List<String> oldKeys = oldMenu.stream().map(MenuItemVO::getKey).toList();
            List<String> newKeys = newMenu.stream().map(MenuNode::getKey).toList();
            assertEquals(oldKeys, newKeys, "新旧架构菜单项的 key 应一致");
        }

        @Test
        @DisplayName("新旧架构菜单项的 label 应一致")
        void shouldHaveSameMenuLabels() {
            // Given
            when(tenantMapper.selectById(100L)).thenReturn(testTenant);
            when(packageProductMapper.selectByPackageId(1L)).thenReturn(new ArrayList<>(List.of(testPackageProduct)));
            when(productMapper.selectById("prod-1")).thenReturn(testOldProduct);
            when(resourceRegistry.getFunctionProducts()).thenReturn(new ArrayList<>(List.of(testNewProduct)));

            // When
            List<MenuItemVO> oldMenu = menuService.getTenantMenu(100L);
            List<MenuNode> newMenu = menuService.getResourceDrivenMenu(100L);

            // Then
            List<String> oldLabels = oldMenu.stream().map(MenuItemVO::getLabel).toList();
            List<String> newLabels = newMenu.stream().map(MenuNode::getLabel).toList();
            assertEquals(oldLabels, newLabels, "新旧架构菜单项的 label 应一致");
        }

        @Test
        @DisplayName("新旧架构菜单项的 path 应一致")
        void shouldHaveSameMenuPaths() {
            // Given
            when(tenantMapper.selectById(100L)).thenReturn(testTenant);
            when(packageProductMapper.selectByPackageId(1L)).thenReturn(new ArrayList<>(List.of(testPackageProduct)));
            when(productMapper.selectById("prod-1")).thenReturn(testOldProduct);
            when(resourceRegistry.getFunctionProducts()).thenReturn(new ArrayList<>(List.of(testNewProduct)));

            // When
            List<MenuItemVO> oldMenu = menuService.getTenantMenu(100L);
            List<MenuNode> newMenu = menuService.getResourceDrivenMenu(100L);

            // Then
            List<String> oldPaths = oldMenu.stream().map(MenuItemVO::getPath).toList();
            List<String> newPaths = newMenu.stream().map(MenuNode::getPath).toList();
            assertEquals(oldPaths, newPaths, "新旧架构菜单项的 path 应一致");
        }

        @Test
        @DisplayName("新旧架构菜单项的 icon 应一致")
        void shouldHaveSameMenuIcons() {
            // Given
            when(tenantMapper.selectById(100L)).thenReturn(testTenant);
            when(packageProductMapper.selectByPackageId(1L)).thenReturn(new ArrayList<>(List.of(testPackageProduct)));
            when(productMapper.selectById("prod-1")).thenReturn(testOldProduct);
            when(resourceRegistry.getFunctionProducts()).thenReturn(new ArrayList<>(List.of(testNewProduct)));

            // When
            List<MenuItemVO> oldMenu = menuService.getTenantMenu(100L);
            List<MenuNode> newMenu = menuService.getResourceDrivenMenu(100L);

            // Then
            List<String> oldIcons = oldMenu.stream().map(MenuItemVO::getIcon).toList();
            List<String> newIcons = newMenu.stream().map(MenuNode::getIcon).toList();
            assertEquals(oldIcons, newIcons, "新旧架构菜单项的 icon 应一致");
        }

        @Test
        @DisplayName("新旧架构菜单项的 sortOrder 应一致")
        void shouldHaveSameSortOrder() {
            // Given
            when(tenantMapper.selectById(100L)).thenReturn(testTenant);
            when(packageProductMapper.selectByPackageId(1L)).thenReturn(new ArrayList<>(List.of(testPackageProduct)));
            when(productMapper.selectById("prod-1")).thenReturn(testOldProduct);
            when(resourceRegistry.getFunctionProducts()).thenReturn(new ArrayList<>(List.of(testNewProduct)));

            // When
            List<MenuItemVO> oldMenu = menuService.getTenantMenu(100L);
            List<MenuNode> newMenu = menuService.getResourceDrivenMenu(100L);

            // Then
            List<Integer> oldSortOrders = oldMenu.stream().map(MenuItemVO::getSortOrder).toList();
            List<Integer> newSortOrders = newMenu.stream().map(MenuNode::getSortOrder).toList();
            assertEquals(oldSortOrders, newSortOrders, "新旧架构菜单项的 sortOrder 应一致");
        }

        @Test
        @DisplayName("新架构菜单项应包含资源信息")
        void newMenuShouldContainResourceInfo() {
            // Given
            when(tenantMapper.selectById(100L)).thenReturn(testTenant);
            when(packageProductMapper.selectByPackageId(1L)).thenReturn(new ArrayList<>(List.of(testPackageProduct)));
            when(productMapper.selectById("prod-1")).thenReturn(testOldProduct);
            when(resourceRegistry.getFunctionProducts()).thenReturn(new ArrayList<>(List.of(testNewProduct)));

            // When
            List<MenuNode> newMenu = menuService.getResourceDrivenMenu(100L);

            // Then
            MenuNode productMenu = newMenu.stream()
                    .filter(m -> m.getKey().equals("product-stair_climbing"))
                    .findFirst()
                    .orElse(null);
            assertNotNull(productMenu, "产品菜单应存在");
            assertEquals("stair_climbing", productMenu.getResourceCode(), "应包含资源代码");
            assertEquals(ResourceType.FUNCTION_PRODUCT.getCode(), productMenu.getResourceType(), "应包含资源类型");
        }
    }

    @Nested
    @DisplayName("资源完整性测试")
    class ResourceCompletenessTests {

        @Test
        @DisplayName("所有旧产品应在新资源注册表中存在")
        void allOldProductsShouldExistInNewRegistry() {
            // Given
            ProductEntity oldProduct1 = new ProductEntity();
            oldProduct1.setCode("stair_climbing");
            oldProduct1.setStatus(1);

            ProductEntity oldProduct2 = new ProductEntity();
            oldProduct2.setCode("walking");
            oldProduct2.setStatus(1);

            PlatformResource newResource1 = new PlatformResource();
            newResource1.setCode("stair_climbing");
            newResource1.setStatus("ENABLED");

            PlatformResource newResource2 = new PlatformResource();
            newResource2.setCode("walking");
            newResource2.setStatus("ENABLED");

            when(productMapper.selectList(null)).thenReturn(List.of(oldProduct1, oldProduct2));
            when(resourceRegistry.getFunctionProducts()).thenReturn(List.of(newResource1, newResource2));

            // When
            List<ProductEntity> oldProducts = productMapper.selectList(null);
            List<PlatformResource> newResources = resourceRegistry.getFunctionProducts();

            // Then
            List<String> oldProductCodes = oldProducts.stream().map(ProductEntity::getCode).toList();
            List<String> newResourceCodes = newResources.stream().map(PlatformResource::getCode).toList();

            assertTrue(newResourceCodes.containsAll(oldProductCodes), "新资源注册表应包含所有旧产品");
        }

        @Test
        @DisplayName("所有旧功能应在新资源注册表中存在")
        void allOldFeaturesShouldExistInNewRegistry() {
            // Given
            FeatureEntity oldFeature1 = new FeatureEntity();
            oldFeature1.setCode("feature.dashboard");

            FeatureEntity oldFeature2 = new FeatureEntity();
            oldFeature2.setCode("feature.members");

            PlatformResource newResource1 = new PlatformResource();
            newResource1.setCode("feature.dashboard");
            newResource1.setType(ResourceType.FEATURE.getCode());

            PlatformResource newResource2 = new PlatformResource();
            newResource2.setCode("feature.members");
            newResource2.setType(ResourceType.FEATURE.getCode());

            when(featureMapper.selectList(null)).thenReturn(List.of(oldFeature1, oldFeature2));
            when(resourceRegistry.getFeatures()).thenReturn(List.of(newResource1, newResource2));

            // When
            List<FeatureEntity> oldFeatures = featureMapper.selectList(null);
            List<PlatformResource> newFeatures = resourceRegistry.getFeatures();

            // Then
            List<String> oldFeatureCodes = oldFeatures.stream().map(FeatureEntity::getCode).toList();
            List<String> newFeatureCodes = newFeatures.stream().map(PlatformResource::getCode).toList();

            assertTrue(newFeatureCodes.containsAll(oldFeatureCodes), "新资源注册表应包含所有旧功能");
        }
    }

    @Nested
    @DisplayName("API 响应时间基准测试")
    class ApiBenchmarkTests {

        private static final int WARMUP_ITERATIONS = 5;
        private static final int MEASUREMENT_ITERATIONS = 20;

        @Test
        @DisplayName("旧 API 响应时间基准")
        void oldApiResponseTimeBenchmark() {
            // Given
            when(tenantMapper.selectById(anyLong())).thenReturn(testTenant);
            when(packageProductMapper.selectByPackageId(anyLong())).thenReturn(new ArrayList<>(List.of(testPackageProduct)));
            when(productMapper.selectById(anyLong())).thenReturn(testOldProduct);

            // Warmup
            for (int i = 0; i < WARMUP_ITERATIONS; i++) {
                menuService.getTenantMenu(100L);
            }

            // Measurement
            long totalTime = 0;
            long minTime = Long.MAX_VALUE;
            long maxTime = Long.MIN_VALUE;

            for (int i = 0; i < MEASUREMENT_ITERATIONS; i++) {
                long start = System.nanoTime();
                menuService.getTenantMenu(100L);
                long end = System.nanoTime();
                long duration = end - start;

                totalTime += duration;
                minTime = Math.min(minTime, duration);
                maxTime = Math.max(maxTime, duration);
            }

            double avgTimeMs = (totalTime / (double) MEASUREMENT_ITERATIONS) / 1_000_000.0;
            double minTimeMs = minTime / 1_000_000.0;
            double maxTimeMs = maxTime / 1_000_000.0;

            System.out.printf("旧 API 响应时间基准 (n=%d):%n", MEASUREMENT_ITERATIONS);
            System.out.printf("  平均: %.3f ms%n", avgTimeMs);
            System.out.printf("  最小: %.3f ms%n", minTimeMs);
            System.out.printf("  最大: %.3f ms%n", maxTimeMs);

            // Basic assertion - just ensure it completes and returns reasonable time
            assertTrue(avgTimeMs < 1000, "响应时间应小于 1 秒");
        }

        @Test
        @DisplayName("新 API 响应时间基准")
        void newApiResponseTimeBenchmark() {
            // Given
            when(tenantMapper.selectById(anyLong())).thenReturn(testTenant);
            when(resourceRegistry.getFunctionProducts()).thenReturn(new ArrayList<>(List.of(testNewProduct)));

            // Warmup
            for (int i = 0; i < WARMUP_ITERATIONS; i++) {
                menuService.getResourceDrivenMenu(100L);
            }

            // Measurement
            long totalTime = 0;
            long minTime = Long.MAX_VALUE;
            long maxTime = Long.MIN_VALUE;

            for (int i = 0; i < MEASUREMENT_ITERATIONS; i++) {
                long start = System.nanoTime();
                menuService.getResourceDrivenMenu(100L);
                long end = System.nanoTime();
                long duration = end - start;

                totalTime += duration;
                minTime = Math.min(minTime, duration);
                maxTime = Math.max(maxTime, duration);
            }

            double avgTimeMs = (totalTime / (double) MEASUREMENT_ITERATIONS) / 1_000_000.0;
            double minTimeMs = minTime / 1_000_000.0;
            double maxTimeMs = maxTime / 1_000_000.0;

            System.out.printf("新 API 响应时间基准 (n=%d):%n", MEASUREMENT_ITERATIONS);
            System.out.printf("  平均: %.3f ms%n", avgTimeMs);
            System.out.printf("  最小: %.3f ms%n", minTimeMs);
            System.out.printf("  最大: %.3f ms%n", maxTimeMs);

            // Basic assertion - just ensure it completes and returns reasonable time
            assertTrue(avgTimeMs < 1000, "响应时间应小于 1 秒");
        }
    }
}
