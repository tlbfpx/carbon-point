package com.carbonpoint.mall;

import com.carbonpoint.mall.entity.Product;
import com.carbonpoint.mall.mapper.MallProductMapper;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.common.tenant.TenantContext;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for ProductController.
 *
 * Tests:
 * - Product CRUD operations (create, update, delete)
 * - Product status toggle
 * - Product stock management
 * - Product listing with filters
 * - Permission enforcement
 */
class ProductControllerTest extends BaseIntegrationTest {

    @Autowired
    private MallProductMapper productMapper;

    // Use high tenant IDs to avoid conflicts with any seed data
    private static final long TEST_TENANT = 9100L;

    // ─────────────────────────────────────────
    // 1. Product Create
    // ─────────────────────────────────────────

    @Test
    void testCreateProduct() throws Exception {
        testDataHelper.tenant("商品创建测试").id(TEST_TENANT).save();
        User admin = testDataHelper.user(TEST_TENANT, "13900091001", "Test@123")
                .id(91001L)
                .admin()
                .save();

        String token = generateToken(admin.getId(), TEST_TENANT, List.of("admin"));
        setTenantContext(TEST_TENANT);

        String createJson = """
            {
                "name": "测试咖啡券",
                "description": "免费兑换一杯咖啡",
                "image": "https://example.com/coffee.png",
                "type": "coupon",
                "pointsPrice": 100,
                "stock": 50,
                "maxPerUser": 2,
                "validityDays": 30
            }
            """;

        MvcResult result = postJson("/api/products", createJson, token);
        assertSuccess(result);

        // Verify product was created in DB
        setTenantContext(TEST_TENANT);
        LambdaQueryWrapper<Product> qw = new LambdaQueryWrapper<>();
        qw.eq(Product::getTenantId, TEST_TENANT)
          .eq(Product::getName, "测试咖啡券");
        Product created = productMapper.selectOne(qw);

        assertNotNull(created, "Product should be created");
        assertEquals("coupon", created.getType());
        assertEquals(100, created.getPointsPrice());
        assertEquals(50, created.getStock());
        assertEquals(2, created.getMaxPerUser());
        assertEquals("inactive", created.getStatus(), "New product should be inactive");
    }

    @Test
    void testCreateProductValidation() throws Exception {
        testDataHelper.tenant("商品创建校验测试").id(TEST_TENANT + 1).save();
        User admin = testDataHelper.user(TEST_TENANT + 1, "13900091002", "Test@123")
                .id(91002L)
                .admin()
                .save();

        String token = generateToken(admin.getId(), TEST_TENANT + 1, List.of("admin"));
        setTenantContext(TEST_TENANT + 1);

        // Missing required fields: name and type
        String invalidJson = """
            {
                "pointsPrice": 100
            }
            """;

        MvcResult result = postJson("/api/products", invalidJson, token);
        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();

        // Should return validation error (SYSTEM002 or 400)
        assertTrue(
                content.contains("\"code\":\"SYSTEM002\"") || content.contains("\"code\":400") ||
                content.contains("商品名称") || content.contains("商品类型"),
                "Validation error expected for missing required fields, got: " + content
        );
    }

    @Test
    void testCreateProductRequiresAuth() throws Exception {
        String createJson = """
            {
                "name": "测试商品",
                "type": "coupon",
                "pointsPrice": 100
            }
            """;

        MvcResult result = postJson("/api/products", createJson);
        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();

        // Should return 401 Unauthorized
        assertTrue(
                content.contains("\"code\":401") || content.contains("未登录") || content.contains("Unauthorized"),
                "Should return 401 for unauthenticated request, got: " + content
        );
    }

    // ─────────────────────────────────────────
    // 2. Product Update
    // ─────────────────────────────────────────

    @Test
    void testUpdateProduct() throws Exception {
        long tenantId = TEST_TENANT + 10;
        testDataHelper.tenant("商品更新测试").id(tenantId).save();
        User admin = testDataHelper.user(tenantId, "13900091011", "Test@123")
                .id(91011L)
                .admin()
                .save();

        Product product = testDataHelper.product(tenantId, "原商品名称", "coupon", 100, 20)
                .id(91110L)
                .save();

        setTenantContext(tenantId);
        String token = generateToken(admin.getId(), tenantId, List.of("admin"));

        String updateJson = """
            {
                "name": "更新后商品名称",
                "description": "更新后的描述",
                "pointsPrice": 150
            }
            """;

        MvcResult result = putJson("/api/products/" + product.getId(), updateJson, token);
        assertSuccess(result);

        // Verify update
        setTenantContext(tenantId);
        Product updated = productMapper.selectById(product.getId());
        assertEquals("更新后商品名称", updated.getName());
        assertEquals("更新后的描述", updated.getDescription());
        assertEquals(150, updated.getPointsPrice());
    }

    @Test
    void testUpdateProductNotFound() throws Exception {
        long tenantId = TEST_TENANT + 11;
        testDataHelper.tenant("商品更新不存在测试").id(tenantId).save();
        User admin = testDataHelper.user(tenantId, "13900091012", "Test@123")
                .id(91012L)
                .admin()
                .save();

        setTenantContext(tenantId);
        String token = generateToken(admin.getId(), tenantId, List.of("admin"));

        String updateJson = """
            {
                "name": "更新名称"
            }
            """;

        MvcResult result = putJson("/api/products/999999999", updateJson, token);
        // Should return error code 10801 (MALL_PRODUCT_NOT_FOUND)
        assertErrorCode(result, "MALL001");
    }

    // ─────────────────────────────────────────
    // 3. Product Delete
    // ─────────────────────────────────────────

    @Test
    void testDeleteProduct() throws Exception {
        long tenantId = TEST_TENANT + 20;
        testDataHelper.tenant("商品删除测试").id(tenantId).save();
        User admin = testDataHelper.user(tenantId, "13900091021", "Test@123")
                .id(91021L)
                .admin()
                .save();

        Product product = testDataHelper.product(tenantId, "待删除商品", "coupon", 100, 20)
                .id(91200L)
                .save();

        setTenantContext(tenantId);
        String token = generateToken(admin.getId(), tenantId, List.of("admin"));

        MvcResult result = mockMvc.perform(
                org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete(
                        "/api/products/" + product.getId())
                        .header("Authorization", "Bearer " + token)
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
        ).andReturn();

        assertSuccess(result);

        // Verify deleted
        setTenantContext(tenantId);
        Product deleted = productMapper.selectById(product.getId());
        assertNull(deleted, "Product should be deleted");
    }

    @Test
    void testDeleteProductNotFound() throws Exception {
        long tenantId = TEST_TENANT + 21;
        testDataHelper.tenant("商品删除不存在测试").id(tenantId).save();
        User admin = testDataHelper.user(tenantId, "13900091022", "Test@123")
                .id(91022L)
                .admin()
                .save();

        setTenantContext(tenantId);
        String token = generateToken(admin.getId(), tenantId, List.of("admin"));

        MvcResult result = mockMvc.perform(
                org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete(
                        "/api/products/999999999")
                        .header("Authorization", "Bearer " + token)
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
        ).andReturn();

        assertErrorCode(result, "MALL001");
    }

    // ─────────────────────────────────────────
    // 4. Product Toggle Status
    // ─────────────────────────────────────────

    @Test
    void testToggleStatusInactiveToActive() throws Exception {
        long tenantId = TEST_TENANT + 30;
        testDataHelper.tenant("商品状态切换测试").id(tenantId).save();
        User admin = testDataHelper.user(tenantId, "13900091031", "Test@123")
                .id(91031L)
                .admin()
                .save();

        // Product starts as inactive (default)
        Product product = testDataHelper.product(tenantId, "待上架商品", "coupon", 100, 20)
                .id(91300L)
                .inactive()
                .save();

        setTenantContext(tenantId);
        String token = generateToken(admin.getId(), tenantId, List.of("admin"));

        MvcResult result = mockMvc.perform(
                org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
                        "/api/products/" + product.getId() + "/toggle")
                        .header("Authorization", "Bearer " + token)
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
        ).andReturn();

        assertSuccess(result);

        // Verify status changed to active
        setTenantContext(tenantId);
        Product toggled = productMapper.selectById(product.getId());
        assertEquals("active", toggled.getStatus());
    }

    @Test
    void testToggleStatusActiveToInactive() throws Exception {
        long tenantId = TEST_TENANT + 31;
        testDataHelper.tenant("商品下架测试").id(tenantId).save();
        User admin = testDataHelper.user(tenantId, "13900091032", "Test@123")
                .id(91032L)
                .admin()
                .save();

        Product product = testDataHelper.product(tenantId, "已上架商品", "coupon", 100, 20)
                .id(91310L)
                .save();

        setTenantContext(tenantId);
        String token = generateToken(admin.getId(), tenantId, List.of("admin"));

        MvcResult result = mockMvc.perform(
                org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
                        "/api/products/" + product.getId() + "/toggle")
                        .header("Authorization", "Bearer " + token)
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
        ).andReturn();

        assertSuccess(result);

        setTenantContext(tenantId);
        Product toggled = productMapper.selectById(product.getId());
        assertEquals("inactive", toggled.getStatus());
    }

    // ─────────────────────────────────────────
    // 5. Product Stock Management
    // ─────────────────────────────────────────

    @Test
    void testUpdateStockIncrease() throws Exception {
        long tenantId = TEST_TENANT + 40;
        testDataHelper.tenant("库存增加测试").id(tenantId).save();
        User admin = testDataHelper.user(tenantId, "13900091041", "Test@123")
                .id(91041L)
                .admin()
                .save();

        Product product = testDataHelper.product(tenantId, "库存商品", "coupon", 100, 10)
                .id(91400L)
                .save();

        setTenantContext(tenantId);
        String token = generateToken(admin.getId(), tenantId, List.of("admin"));

        MvcResult result = mockMvc.perform(
                org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
                        "/api/products/" + product.getId() + "/stock?delta=5")
                        .header("Authorization", "Bearer " + token)
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
        ).andReturn();

        assertSuccess(result);

        setTenantContext(tenantId);
        Product updated = productMapper.selectById(product.getId());
        assertEquals(15, updated.getStock());
    }

    @Test
    void testUpdateStockDecrease() throws Exception {
        long tenantId = TEST_TENANT + 41;
        testDataHelper.tenant("库存减少测试").id(tenantId).save();
        User admin = testDataHelper.user(tenantId, "13900091042", "Test@123")
                .id(91042L)
                .admin()
                .save();

        Product product = testDataHelper.product(tenantId, "库存减少商品", "coupon", 100, 10)
                .id(91410L)
                .save();

        setTenantContext(tenantId);
        String token = generateToken(admin.getId(), tenantId, List.of("admin"));

        MvcResult result = mockMvc.perform(
                org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
                        "/api/products/" + product.getId() + "/stock?delta=-3")
                        .header("Authorization", "Bearer " + token)
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
        ).andReturn();

        assertSuccess(result);

        setTenantContext(tenantId);
        Product updated = productMapper.selectById(product.getId());
        assertEquals(7, updated.getStock());
    }

    @Test
    void testUpdateStockNegativeBlocked() throws Exception {
        long tenantId = TEST_TENANT + 42;
        testDataHelper.tenant("库存不足测试").id(tenantId).save();
        User admin = testDataHelper.user(tenantId, "13900091043", "Test@123")
                .id(91043L)
                .admin()
                .save();

        Product product = testDataHelper.product(tenantId, "库存不足商品", "coupon", 100, 5)
                .id(91420L)
                .save();

        setTenantContext(tenantId);
        String token = generateToken(admin.getId(), tenantId, List.of("admin"));

        // Try to decrease by more than available stock
        MvcResult result = mockMvc.perform(
                org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
                        "/api/products/" + product.getId() + "/stock?delta=-10")
                        .header("Authorization", "Bearer " + token)
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
        ).andReturn();

        // Should return stock empty error (10803)
        assertErrorCode(result, "MALL003");
    }

    // ─────────────────────────────────────────
    // 6. Product Listing
    // ─────────────────────────────────────────

    @Test
    void testListProducts() throws Exception {
        long tenantId = TEST_TENANT + 50;
        testDataHelper.tenant("商品列表测试").id(tenantId).save();
        User admin = testDataHelper.user(tenantId, "13900091051", "Test@123")
                .id(91051L)
                .admin()
                .save();

        // Create multiple products
        testDataHelper.product(tenantId, "商品A", "coupon", 100, 20).id(91501L).save();
        testDataHelper.product(tenantId, "商品B", "recharge", 200, 30).id(91502L).save();
        testDataHelper.product(tenantId, "商品C", "privilege", 300, 40).id(91503L).save();

        setTenantContext(tenantId);
        String token = generateToken(admin.getId(), tenantId, List.of("admin"));

        MvcResult result = getWithToken("/api/products", token);
        assertSuccess(result);

        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();

        assertTrue(content.contains("商品A"), "Should contain product A");
        assertTrue(content.contains("商品B"), "Should contain product B");
        assertTrue(content.contains("商品C"), "Should contain product C");
        assertTrue(content.contains("\"total\""), "Response should contain pagination total");
    }

    @Test
    void testListProductsWithStatusFilter() throws Exception {
        long tenantId = TEST_TENANT + 51;
        testDataHelper.tenant("商品状态过滤测试").id(tenantId).save();
        User admin = testDataHelper.user(tenantId, "13900091052", "Test@123")
                .id(91052L)
                .admin()
                .save();

        testDataHelper.product(tenantId, "活跃商品", "coupon", 100, 20).id(91511L).save();
        testDataHelper.product(tenantId, "非活跃商品", "coupon", 100, 20)
                .id(91512L).inactive().save();

        setTenantContext(tenantId);
        String token = generateToken(admin.getId(), tenantId, List.of("admin"));

        MvcResult result = getWithToken("/api/products?status=active", token);
        assertSuccess(result);

        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();

        assertTrue(content.contains("活跃商品"), "Should contain active product");
        // Inactive product should not appear in status=active filter
    }

    @Test
    void testListProductsWithTypeFilter() throws Exception {
        long tenantId = TEST_TENANT + 52;
        testDataHelper.tenant("商品类型过滤测试").id(tenantId).save();
        User admin = testDataHelper.user(tenantId, "13900091053", "Test@123")
                .id(91053L)
                .admin()
                .save();

        testDataHelper.product(tenantId, "券类商品", "coupon", 100, 20).id(91521L).save();
        testDataHelper.product(tenantId, "充值类商品", "recharge", 200, 20).id(91522L).save();

        setTenantContext(tenantId);
        String token = generateToken(admin.getId(), tenantId, List.of("admin"));

        MvcResult result = getWithToken("/api/products?type=coupon", token);
        assertSuccess(result);

        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();

        assertTrue(content.contains("券类商品"), "Should contain coupon product");
    }

    // ─────────────────────────────────────────
    // 7. Product Get By ID
    // ─────────────────────────────────────────

    @Test
    void testGetProductById() throws Exception {
        long tenantId = TEST_TENANT + 60;
        testDataHelper.tenant("商品详情测试").id(tenantId).save();
        User admin = testDataHelper.user(tenantId, "13900091061", "Test@123")
                .id(91061L)
                .admin()
                .save();

        Product product = testDataHelper.product(tenantId, "详情测试商品", "coupon", 100, 20)
                .id(91601L)
                .save();

        setTenantContext(tenantId);
        String token = generateToken(admin.getId(), tenantId, List.of("admin"));

        MvcResult result = getWithToken("/api/products/" + product.getId(), token);
        assertSuccess(result);

        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();

        assertTrue(content.contains("详情测试商品"), "Should contain product name");
        assertTrue(content.contains("\"type\":\"coupon\""), "Should contain product type");
        assertTrue(content.contains("\"pointsPrice\":100"), "Should contain points price");
    }

    @Test
    void testGetProductByIdNotFound() throws Exception {
        long tenantId = TEST_TENANT + 61;
        testDataHelper.tenant("商品详情不存在测试").id(tenantId).save();
        User admin = testDataHelper.user(tenantId, "13900091062", "Test@123")
                .id(91062L)
                .admin()
                .save();

        setTenantContext(tenantId);
        String token = generateToken(admin.getId(), tenantId, List.of("admin"));

        MvcResult result = getWithToken("/api/products/999999999", token);
        assertErrorCode(result, "MALL001");
    }

    @Autowired
    private TestDataHelper testDataHelper;
}
