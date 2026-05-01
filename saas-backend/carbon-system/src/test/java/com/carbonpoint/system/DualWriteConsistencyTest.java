package com.carbonpoint.system;

import com.carbonpoint.system.entity.*;
import com.carbonpoint.system.enums.ResourceType;
import com.carbonpoint.system.mapper.*;
import com.carbonpoint.system.service.ResourceRegistry;
import com.carbonpoint.system.service.TenantResourceConfigService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 双写一致性测试
 * 验证在过渡期间新旧架构同时写入时的数据一致性
 *
 * 测试场景:
 * 1. 平台资源/产品同时写入一致性
 * 2. 租户配置同时写入一致性
 * 3. 套餐变更同时影响新旧架构
 * 4. 并发写入场景下的一致性
 */
@SpringBootTest
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@Transactional
public class DualWriteConsistencyTest {

    @Autowired
    private PlatformResourceMapper platformResourceMapper;

    @Autowired
    private PlatformProductMapper platformProductMapper;

    @Autowired
    private TenantResourceConfigMapper tenantResourceConfigMapper;

    @Autowired
    private ProductConfigMapper productConfigMapper;

    @Autowired
    private TenantMapper tenantMapper;

    @Autowired
    private PermissionPackageMapper permissionPackageMapper;

    @Autowired
    private TenantPackageMapper tenantPackageMapper;

    @Autowired
    private ResourceRegistry resourceRegistry;

    @Autowired
    private TenantResourceConfigService tenantResourceConfigService;

    private Tenant testTenant;
    private PermissionPackage testPackage;

    @BeforeEach
    void setUp() {
        // 创建测试租户
        testTenant = new Tenant();
        testTenant.setName("双写一致性测试租户");
        testTenant.setPackageType("pro");
        testTenant.setMaxUsers(100);
        testTenant.setStatus("active");
        tenantMapper.insert(testTenant);

        // 获取测试套餐
        testPackage = permissionPackageMapper.selectByCode("PRO");
        if (testPackage == null) {
            testPackage = new PermissionPackage();
            testPackage.setCode("PRO");
            testPackage.setName("专业版");
            testPackage.setDescription("专业版套餐");
            testPackage.setStatus("ACTIVE");
            permissionPackageMapper.insert(testPackage);
        }
    }

    // ============================================
    // 平台资源/产品双写一致性测试
    // ============================================

    @Test
    @Order(1)
    @DisplayName("平台产品创建 - 应同时创建对应资源")
    void testCreatePlatformProduct_ShouldCreateCorrespondingResource() {
        // Given: 创建旧架构平台产品
        PlatformProduct oldProduct = new PlatformProduct();
        oldProduct.setCode("test-product-001");
        oldProduct.setName("测试产品 001");
        oldProduct.setDescription("这是一个测试产品");
        oldProduct.setCategory("exercise");
        oldProduct.setStatus(1);
        oldProduct.setSortOrder(10);
        platformProductMapper.insert(oldProduct);

        // When: 模拟双写 - 创建新架构资源
        String resourceCode = "PRODUCT_TEST_PRODUCT_001";
        PlatformResource newResource = new PlatformResource();
        newResource.setCode(resourceCode);
        newResource.setType(ResourceType.FUNCTION_PRODUCT.getCode());
        newResource.setName(oldProduct.getName());
        newResource.setCategory(oldProduct.getCategory());
        newResource.setDescription(oldProduct.getDescription());
        newResource.setStatus(oldProduct.getStatus() == 1 ? "ENABLED" : "DISABLED");
        newResource.setSortOrder(oldProduct.getSortOrder());
        platformResourceMapper.insert(newResource);

        // Then: 验证两者都存在且数据一致
        PlatformProduct foundOldProduct = platformProductMapper.selectById(oldProduct.getId());
        PlatformResource foundNewResource = platformResourceMapper.selectByCode(resourceCode);

        assertNotNull(foundOldProduct);
        assertNotNull(foundNewResource);
        assertEquals(foundOldProduct.getName(), foundNewResource.getName());
        assertEquals(foundOldProduct.getCategory(), foundNewResource.getCategory());
        assertEquals(foundOldProduct.getStatus() == 1 ? "ENABLED" : "DISABLED", foundNewResource.getStatus());
    }

    @Test
    @Order(2)
    @DisplayName("平台产品更新 - 应同步更新对应资源")
    void testUpdatePlatformProduct_ShouldSyncUpdateResource() {
        // Given: 创建初始数据
        PlatformProduct oldProduct = new PlatformProduct();
        oldProduct.setCode("test-product-002");
        oldProduct.setName("测试产品 002");
        oldProduct.setDescription("初始描述");
        oldProduct.setCategory("exercise");
        oldProduct.setStatus(1);
        oldProduct.setSortOrder(10);
        platformProductMapper.insert(oldProduct);

        String resourceCode = "PRODUCT_TEST_PRODUCT_002";
        PlatformResource newResource = new PlatformResource();
        newResource.setCode(resourceCode);
        newResource.setType(ResourceType.FUNCTION_PRODUCT.getCode());
        newResource.setName(oldProduct.getName());
        newResource.setCategory(oldProduct.getCategory());
        newResource.setDescription(oldProduct.getDescription());
        newResource.setStatus("ENABLED");
        newResource.setSortOrder(oldProduct.getSortOrder());
        platformResourceMapper.insert(newResource);

        // When: 更新旧产品并同步更新资源
        oldProduct.setName("更新后的测试产品 002");
        oldProduct.setDescription("更新后的描述");
        oldProduct.setStatus(0);
        platformProductMapper.updateById(oldProduct);

        PlatformResource resourceToUpdate = platformResourceMapper.selectByCode(resourceCode);
        resourceToUpdate.setName(oldProduct.getName());
        resourceToUpdate.setDescription(oldProduct.getDescription());
        resourceToUpdate.setStatus(oldProduct.getStatus() == 1 ? "ENABLED" : "DISABLED");
        platformResourceMapper.updateById(resourceToUpdate);

        // Then: 验证两者一致
        PlatformProduct updatedOldProduct = platformProductMapper.selectById(oldProduct.getId());
        PlatformResource updatedResource = platformResourceMapper.selectByCode(resourceCode);

        assertEquals(updatedOldProduct.getName(), updatedResource.getName());
        assertEquals(updatedOldProduct.getDescription(), updatedResource.getDescription());
        assertEquals(updatedOldProduct.getStatus() == 1 ? "ENABLED" : "DISABLED", updatedResource.getStatus());
    }

    @Test
    @Order(3)
    @DisplayName("平台产品删除 - 应同步禁用对应资源")
    void testDeletePlatformProduct_ShouldDisableResource() {
        // Given: 创建初始数据
        PlatformProduct oldProduct = new PlatformProduct();
        oldProduct.setCode("test-product-003");
        oldProduct.setName("测试产品 003");
        oldProduct.setStatus(1);
        platformProductMapper.insert(oldProduct);

        String resourceCode = "PRODUCT_TEST_PRODUCT_003";
        PlatformResource newResource = new PlatformResource();
        newResource.setCode(resourceCode);
        newResource.setType(ResourceType.FUNCTION_PRODUCT.getCode());
        newResource.setName(oldProduct.getName());
        newResource.setStatus("ENABLED");
        platformResourceMapper.insert(newResource);

        // When: 删除旧产品并禁用资源
        platformProductMapper.deleteById(oldProduct.getId());

        PlatformResource resourceToDisable = platformResourceMapper.selectByCode(resourceCode);
        resourceToDisable.setStatus("DISABLED");
        resourceToDisable.setDeleted(true);
        platformResourceMapper.updateById(resourceToDisable);

        // Then: 验证
        PlatformProduct deletedOldProduct = platformProductMapper.selectById(oldProduct.getId());
        PlatformResource disabledResource = platformResourceMapper.selectByCode(resourceCode);

        assertNull(deletedOldProduct);
        assertNotNull(disabledResource);
        assertEquals("DISABLED", disabledResource.getStatus());
        assertTrue(disabledResource.getDeleted());
    }

    // ============================================
    // 租户配置双写一致性测试
    // ============================================

    @Test
    @Order(4)
    @DisplayName("租户产品配置创建 - 应同时创建租户资源配置")
    void testCreateProductConfig_ShouldCreateTenantResourceConfig() {
        // Given: 创建产品资源
        String productCode = "test-product-004";
        String resourceCode = "PRODUCT_TEST_PRODUCT_004";
        PlatformResource resource = new PlatformResource();
        resource.setCode(resourceCode);
        resource.setType(ResourceType.FUNCTION_PRODUCT.getCode());
        resource.setName("测试产品 004");
        resource.setStatus("ENABLED");
        platformResourceMapper.insert(resource);

        // When: 创建旧配置和新配置
        ProductConfig oldConfig = new ProductConfig();
        oldConfig.setTenantId(testTenant.getId());
        oldConfig.setProductCode(productCode);
        oldConfig.setEnabled(true);
        oldConfig.setConfigJson("{\"setting\":\"value\"}");
        productConfigMapper.insert(oldConfig);

        TenantResourceConfig newConfig = new TenantResourceConfig();
        newConfig.setTenantId(testTenant.getId());
        newConfig.setResourceCode(resourceCode);
        newConfig.setEnabled(oldConfig.getEnabled());
        newConfig.setConfig(oldConfig.getConfigJson());
        tenantResourceConfigMapper.insert(newConfig);

        // Then: 验证一致性
        ProductConfig foundOldConfig = productConfigMapper.selectByTenantAndProduct(testTenant.getId(), productCode);
        TenantResourceConfig foundNewConfig = tenantResourceConfigMapper.selectByTenantAndResource(testTenant.getId(), resourceCode);

        assertNotNull(foundOldConfig);
        assertNotNull(foundNewConfig);
        assertEquals(foundOldConfig.getEnabled(), foundNewConfig.getEnabled());
        assertEquals(foundOldConfig.getConfigJson(), foundNewConfig.getConfig());
    }

    @Test
    @Order(5)
    @DisplayName("租户产品配置更新 - 应同步更新租户资源配置")
    void testUpdateProductConfig_ShouldSyncTenantResourceConfig() {
        // Given: 创建初始配置
        String productCode = "test-product-005";
        String resourceCode = "PRODUCT_TEST_PRODUCT_005";
        PlatformResource resource = new PlatformResource();
        resource.setCode(resourceCode);
        resource.setType(ResourceType.FUNCTION_PRODUCT.getCode());
        resource.setName("测试产品 005");
        resource.setStatus("ENABLED");
        platformResourceMapper.insert(resource);

        ProductConfig oldConfig = new ProductConfig();
        oldConfig.setTenantId(testTenant.getId());
        oldConfig.setProductCode(productCode);
        oldConfig.setEnabled(true);
        oldConfig.setConfigJson("{\"setting\":\"old\"}");
        productConfigMapper.insert(oldConfig);

        TenantResourceConfig newConfig = new TenantResourceConfig();
        newConfig.setTenantId(testTenant.getId());
        newConfig.setResourceCode(resourceCode);
        newConfig.setEnabled(true);
        newConfig.setConfig("{\"setting\":\"old\"}");
        tenantResourceConfigMapper.insert(newConfig);

        // When: 更新配置
        oldConfig.setEnabled(false);
        oldConfig.setConfigJson("{\"setting\":\"new\"}");
        productConfigMapper.updateById(oldConfig);

        TenantResourceConfig configToUpdate = tenantResourceConfigMapper.selectById(newConfig.getId());
        configToUpdate.setEnabled(oldConfig.getEnabled());
        configToUpdate.setConfig(oldConfig.getConfigJson());
        tenantResourceConfigMapper.updateById(configToUpdate);

        // Then: 验证一致性
        ProductConfig updatedOldConfig = productConfigMapper.selectById(oldConfig.getId());
        TenantResourceConfig updatedNewConfig = tenantResourceConfigMapper.selectById(newConfig.getId());

        assertEquals(updatedOldConfig.getEnabled(), updatedNewConfig.getEnabled());
        assertEquals(updatedOldConfig.getConfigJson(), updatedNewConfig.getConfig());
    }

    // ============================================
    // 套餐变更一致性测试
    // ============================================

    @Test
    @Order(6)
    @DisplayName("租户套餐升级 - 应同时更新新旧架构")
    void testTenantPackageUpgrade_ShouldUpdateBothArchitectures() {
        // Given: 初始套餐为 FREE
        PermissionPackage freePackage = permissionPackageMapper.selectByCode("FREE");
        if (freePackage == null) {
            freePackage = new PermissionPackage();
            freePackage.setCode("FREE");
            freePackage.setName("免费版");
            freePackage.setStatus("ACTIVE");
            permissionPackageMapper.insert(freePackage);
        }

        Tenant tenant = new Tenant();
        tenant.setName("套餐升级测试租户");
        tenant.setPackageType("free");
        tenant.setPackageId(freePackage.getId());
        tenant.setStatus("active");
        tenantMapper.insert(tenant);

        TenantPackage tenantPackage = new TenantPackage();
        tenantPackage.setTenantId(tenant.getId());
        tenantPackage.setPackageId(freePackage.getId());
        tenantPackage.setStatus("ACTIVE");
        tenantPackage.setStartsAt(java.time.LocalDateTime.now());
        tenantPackageMapper.insert(tenantPackage);

        // When: 升级到 PRO
        tenant.setPackageType("pro");
        tenant.setPackageId(testPackage.getId());
        tenantMapper.updateById(tenant);

        tenantPackage.setPackageId(testPackage.getId());
        tenantPackageMapper.updateById(tenantPackage);

        // Then: 验证一致性
        Tenant updatedTenant = tenantMapper.selectById(tenant.getId());
        TenantPackage updatedTenantPackage = tenantPackageMapper.selectById(tenantPackage.getId());

        assertEquals("pro", updatedTenant.getPackageType());
        assertEquals(testPackage.getId(), updatedTenant.getPackageId());
        assertEquals(testPackage.getId(), updatedTenantPackage.getPackageId());
    }

    // ============================================
    // 并发写入一致性测试
    // ============================================

    @Test
    @Order(7)
    @DisplayName("并发配置更新 - 应保持最终一致性")
    void testConcurrentConfigUpdates_ShouldMaintainConsistency() throws InterruptedException {
        // Given: 创建测试资源和配置
        String productCode = "concurrent-test-product";
        String resourceCode = "PRODUCT_CONCURRENT_TEST_PRODUCT";
        PlatformResource resource = new PlatformResource();
        resource.setCode(resourceCode);
        resource.setType(ResourceType.FUNCTION_PRODUCT.getCode());
        resource.setName("并发测试产品");
        resource.setStatus("ENABLED");
        platformResourceMapper.insert(resource);

        ProductConfig oldConfig = new ProductConfig();
        oldConfig.setTenantId(testTenant.getId());
        oldConfig.setProductCode(productCode);
        oldConfig.setEnabled(true);
        oldConfig.setConfigJson("{\"version\":0}");
        productConfigMapper.insert(oldConfig);

        TenantResourceConfig newConfig = new TenantResourceConfig();
        newConfig.setTenantId(testTenant.getId());
        newConfig.setResourceCode(resourceCode);
        newConfig.setEnabled(true);
        newConfig.setConfig("{\"version\":0}");
        tenantResourceConfigMapper.insert(newConfig);

        // When: 并发更新
        int threadCount = 5;
        List<Thread> threads = new ArrayList<>();

        for (int i = 0; i < threadCount; i++) {
            final int version = i + 1;
            Thread thread = new Thread(() -> {
                try {
                    // 更新旧配置
                    ProductConfig oc = productConfigMapper.selectById(oldConfig.getId());
                    oc.setConfigJson("{\"version\":" + version + "}");
                    productConfigMapper.updateById(oc);

                    // 更新新配置
                    TenantResourceConfig nc = tenantResourceConfigMapper.selectById(newConfig.getId());
                    nc.setConfig("{\"version\":" + version + "}");
                    tenantResourceConfigMapper.updateById(nc);
                } catch (Exception e) {
                    // 忽略异常，测试最终一致性
                }
            });
            threads.add(thread);
            thread.start();
        }

        // 等待所有线程完成
        for (Thread thread : threads) {
            thread.join();
        }

        // Then: 验证最终一致性
        ProductConfig finalOldConfig = productConfigMapper.selectById(oldConfig.getId());
        TenantResourceConfig finalNewConfig = tenantResourceConfigMapper.selectById(newConfig.getId());

        // 两者应该有相同的版本号
        assertEquals(finalOldConfig.getConfigJson(), finalNewConfig.getConfig());
    }

    // ============================================
    // 一致性验证辅助方法
    // ============================================

    /**
     * 验证所有平台产品都有对应的资源
     */
    private void verifyAllProductsHaveResources() {
        List<PlatformProduct> products = platformProductMapper.selectList(null);
        for (PlatformProduct product : products) {
            String expectedResourceCode = "PRODUCT_" + product.getCode().toUpperCase().replace("-", "_");
            PlatformResource resource = platformResourceMapper.selectByCode(expectedResourceCode);
            assertNotNull(resource, "Product " + product.getCode() + " should have corresponding resource");
            assertEquals(product.getName(), resource.getName());
        }
    }
}
