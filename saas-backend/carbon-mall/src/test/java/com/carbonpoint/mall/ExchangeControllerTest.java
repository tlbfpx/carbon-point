package com.carbonpoint.mall;

import com.carbonpoint.mall.entity.ExchangeOrder;
import com.carbonpoint.mall.entity.Product;
import com.carbonpoint.mall.mapper.ExchangeOrderMapper;
import com.carbonpoint.mall.mapper.MallProductMapper;
import com.carbonpoint.mall.service.ExchangeService;
import com.carbonpoint.points.service.PointAccountService;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.common.entity.PointTransactionEntity;
import com.carbonpoint.common.mapper.PointTransactionMapper;
import com.carbonpoint.common.tenant.TenantContext;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for ExchangeController.
 *
 * Tests:
 * - Successful coupon exchange
 * - Insufficient points rejection
 * - Sold out product rejection
 * - Inactive product rejection
 * - Order listing (user and admin)
 * - Order cancellation
 * - Coupon redemption by code
 * - Order state machine transitions
 */
@Transactional
class ExchangeControllerTest extends BaseIntegrationTest {

    @Autowired
    private MallProductMapper productMapper;

    @Autowired
    private ExchangeOrderMapper exchangeOrderMapper;

    @Autowired
    private ExchangeService exchangeService;

    @Autowired
    private PointAccountService pointAccountService;

    @Autowired
    private PointTransactionMapper pointTransactionMapper;

    // Use high tenant/user/product IDs to avoid conflicts
    private static final long BASE_TENANT = 9200L;

    // ─────────────────────────────────────────
    // 1. Successful Exchange Flow
    // ─────────────────────────────────────────

    @Test
    void testExchangeCouponSuccess() throws Exception {
        long tenantId = BASE_TENANT;
        testDataHelper.tenant("兑换成功测试").id(tenantId).save();

        User user = testDataHelper.user(tenantId, "13900092001", "Test@123")
                .id(92001L)
                .totalPoints(500)
                .availablePoints(500)
                .frozenPoints(0)
                .save();

        Product product = testDataHelper.product(tenantId, "测试咖啡券", "coupon", 100, 10)
                .id(92001L)
                .save();

        String token = generateToken(user.getId(), tenantId, List.of("user"));
        setTenantContext(tenantId);

        String exchangeJson = """
            {
                "productId": %d
            }
            """.formatted(product.getId());

        MvcResult result = postJson("/api/exchanges", exchangeJson, token);
        assertSuccess(result);

        // Verify points deducted
        setTenantContext(tenantId);
        User updatedUser = userMapper.selectById(user.getId());
        assertEquals(400, updatedUser.getAvailablePoints(),
                "Available points should decrease by product price");
        assertEquals(400, updatedUser.getTotalPoints(),
                "Total points should decrease after exchange");

        // Verify order created
        LambdaQueryWrapper<ExchangeOrder> qw = new LambdaQueryWrapper<>();
        qw.eq(ExchangeOrder::getUserId, user.getId())
          .eq(ExchangeOrder::getProductId, product.getId())
          .orderByDesc(ExchangeOrder::getCreatedAt)
          .last("LIMIT 1");
        ExchangeOrder order = exchangeOrderMapper.selectOne(qw);

        assertNotNull(order, "Exchange order should be created");
        assertEquals(product.getPointsPrice(), order.getPointsSpent());
        assertEquals("fulfilled", order.getOrderStatus());
        assertNotNull(order.getCouponCode(), "Coupon code should be generated");
        assertFalse(order.getCouponCode().isBlank());

        // Verify stock reduced
        Product updatedProduct = productMapper.selectById(product.getId());
        assertEquals(9, updatedProduct.getStock());
    }

    @Test
    void testExchangeRequiresAuth() throws Exception {
        String exchangeJson = """
            {
                "productId": 1
            }
            """;

        MvcResult result = postJson("/api/exchanges", exchangeJson);
        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();

        assertTrue(
                content.contains("\"code\":401") || content.contains("未登录") || content.contains("Unauthorized"),
                "Should return 401 for unauthenticated request, got: " + content
        );
    }

    // ─────────────────────────────────────────
    // 2. Exchange Rejections
    // ─────────────────────────────────────────

    @Test
    void testExchangeInsufficientPoints() throws Exception {
        long tenantId = BASE_TENANT + 1;
        testDataHelper.tenant("积分不足测试").id(tenantId).save();

        User user = testDataHelper.user(tenantId, "13900092011", "Test@123")
                .id(92101L)
                .totalPoints(50)
                .availablePoints(50)
                .frozenPoints(0)
                .save();

        Product product = testDataHelper.product(tenantId, "高价商品", "coupon", 100, 5)
                .id(92110L)
                .save();

        String token = generateToken(user.getId(), tenantId, List.of("user"));
        setTenantContext(tenantId);

        String exchangeJson = """
            {
                "productId": %d
            }
            """.formatted(product.getId());

        MvcResult result = postJson("/api/exchanges", exchangeJson, token);
        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();

        // Should be rejected with POINT_INSUFFICIENT (10201) or EXCHANGE_POINT_NOT_ENOUGH (10407) or ORDER007
        assertTrue(
                content.contains("\"code\":10201") || content.contains("\"code\":10407") || content.contains("积分不足") || content.contains("ORDER007"),
                "Insufficient points should be rejected, got: " + content
        );

        // Verify no order created
        setTenantContext(tenantId);
        LambdaQueryWrapper<ExchangeOrder> qw = new LambdaQueryWrapper<>();
        qw.eq(ExchangeOrder::getUserId, user.getId())
          .eq(ExchangeOrder::getProductId, product.getId());
        long orderCount = exchangeOrderMapper.selectCount(qw);
        assertEquals(0, orderCount, "No order should be created");
    }

    @Test
    void testExchangeSoldOutProduct() throws Exception {
        long tenantId = BASE_TENANT + 2;
        testDataHelper.tenant("售罄测试").id(tenantId).save();

        User user = testDataHelper.user(tenantId, "13900092021", "Test@123")
                .id(92201L)
                .totalPoints(5000)
                .availablePoints(5000)
                .save();

        Product product = testDataHelper.product(tenantId, "限量商品", "coupon", 100, 0)
                .id(92210L)
                .save();

        String token = generateToken(user.getId(), tenantId, List.of("user"));
        setTenantContext(tenantId);

        String exchangeJson = """
            {
                "productId": %d
            }
            """.formatted(product.getId());

        MvcResult result = postJson("/api/exchanges", exchangeJson, token);
        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();

        // Should be rejected with MALL_PRODUCT_STOCK_EMPTY (10803)
        assertTrue(
                content.contains("\"code\":10803") || content.contains("库存不足"),
                "Sold out product should be rejected, got: " + content
        );

        // Points should not be deducted
        setTenantContext(tenantId);
        User updatedUser = userMapper.selectById(user.getId());
        assertEquals(5000, updatedUser.getAvailablePoints());
    }

    @Test
    void testExchangeInactiveProduct() throws Exception {
        long tenantId = BASE_TENANT + 3;
        testDataHelper.tenant("下架商品测试").id(tenantId).save();

        User user = testDataHelper.user(tenantId, "13900092031", "Test@123")
                .id(92301L)
                .totalPoints(5000)
                .availablePoints(5000)
                .save();

        Product product = testDataHelper.product(tenantId, "已下架商品", "coupon", 100, 100)
                .id(92310L)
                .inactive()
                .save();

        String token = generateToken(user.getId(), tenantId, List.of("user"));
        setTenantContext(tenantId);

        String exchangeJson = """
            {
                "productId": %d
            }
            """.formatted(product.getId());

        MvcResult result = postJson("/api/exchanges", exchangeJson, token);
        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();

        // Should be rejected with MALL_PRODUCT_OFF_SALE (10802)
        assertTrue(
                content.contains("\"code\":10802") || content.contains("下架") || content.contains("未上架"),
                "Inactive product should be rejected, got: " + content
        );
    }

    // ─────────────────────────────────────────
    // 3. User Order Listing
    // ─────────────────────────────────────────

    @Test
    void testGetMyOrders() throws Exception {
        long tenantId = BASE_TENANT + 10;
        testDataHelper.tenant("我的订单测试").id(tenantId).save();

        User user = testDataHelper.user(tenantId, "13900092101", "Test@123")
                .id(92101L)
                .totalPoints(1000)
                .availablePoints(1000)
                .save();

        // Create a fulfilled order directly
        testDataHelper.exchangeOrder(tenantId, user.getId(), 92110L, "测试商品", 100, "fulfilled")
                .couponCode("TEST_CODE_01")
                .id(92110L)
                .save();

        String token = generateToken(user.getId(), tenantId, List.of("user"));
        setTenantContext(tenantId);

        MvcResult result = getWithToken("/api/exchanges/orders", token);
        assertSuccess(result);

        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();

        assertTrue(content.contains("测试商品"), "Should contain order product name");
        assertTrue(content.contains("\"total\""), "Should contain pagination");
    }

    @Test
    void testGetMyOrdersWithStatusFilter() throws Exception {
        long tenantId = BASE_TENANT + 11;
        testDataHelper.tenant("订单状态过滤测试").id(tenantId).save();

        User user = testDataHelper.user(tenantId, "13900092111", "Test@123")
                .id(92111L)
                .save();

        testDataHelper.exchangeOrder(tenantId, user.getId(), 92120L, "已兑换商品", 100, "fulfilled")
                .id(92120L)
                .save();
        testDataHelper.exchangeOrder(tenantId, user.getId(), 92121L, "已使用商品", 100, "used")
                .id(92121L)
                .save();

        String token = generateToken(user.getId(), tenantId, List.of("user"));
        setTenantContext(tenantId);

        MvcResult result = getWithToken("/api/exchanges/orders?status=fulfilled", token);
        assertSuccess(result);

        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();

        assertTrue(content.contains("已兑换商品"));
    }

    // ─────────────────────────────────────────
    // 4. Get Order By ID
    // ─────────────────────────────────────────

    @Test
    void testGetOrderById() throws Exception {
        long tenantId = BASE_TENANT + 20;
        testDataHelper.tenant("订单详情测试").id(tenantId).save();

        User user = testDataHelper.user(tenantId, "13900092201", "Test@123")
                .id(92201L)
                .save();

        ExchangeOrder order = testDataHelper.exchangeOrder(tenantId, user.getId(), 92210L, "详情测试商品", 100, "fulfilled")
                .couponCode("ORDER_CODE_01")
                .id(92210L)
                .save();

        String token = generateToken(user.getId(), tenantId, List.of("user"));
        setTenantContext(tenantId);

        MvcResult result = getWithToken("/api/exchanges/orders/" + order.getId(), token);
        assertSuccess(result);

        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();

        assertTrue(content.contains("详情测试商品"), "Should contain product name");
        assertTrue(content.contains("ORDER_CODE_01"), "Should contain coupon code");
    }

    @Test
    void testGetOrderForbiddenForOtherUser() throws Exception {
        long tenantId = BASE_TENANT + 21;
        testDataHelper.tenant("订单访问隔离测试").id(tenantId).save();

        User user1 = testDataHelper.user(tenantId, "13900092211", "Test@123")
                .id(92211L)
                .save();

        User user2 = testDataHelper.user(tenantId, "13900092212", "Test@123")
                .id(92212L)
                .save();

        ExchangeOrder order = testDataHelper.exchangeOrder(tenantId, user1.getId(), 92220L, "用户1订单", 100, "fulfilled")
                .id(92220L)
                .save();

        // User 2 tries to access User 1's order
        String token2 = generateToken(user2.getId(), tenantId, List.of("user"));
        setTenantContext(tenantId);

        MvcResult result = getWithToken("/api/exchanges/orders/" + order.getId(), token2);

        // Should be HTTP 403 Forbidden with SYSTEM004 error code
        assertEquals(403, result.getResponse().getStatus(),
                "Cross-user order access should return 403, got: " + result.getResponse().getStatus());
        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();
        assertTrue(content.contains("SYSTEM004"),
                "Should contain SYSTEM004 error code, got: " + content);
    }

    @Test
    void testGetOrderForbiddenForOtherTenant() throws Exception {
        long tenantA = BASE_TENANT + 80;
        long tenantB = BASE_TENANT + 81;
        testDataHelper.tenant("租户A").id(tenantA).save();
        testDataHelper.tenant("租户B").id(tenantB).save();

        User userA = testDataHelper.user(tenantA, "13900092801", "Test@123")
                .id(92801L)
                .save();
        User userB = testDataHelper.user(tenantB, "13900092811", "Test@123")
                .id(92811L)
                .save();

        // Create order in tenant A
        ExchangeOrder order = testDataHelper.exchangeOrder(tenantA, userA.getId(), 92810L, "租户A订单", 100, "fulfilled")
                .id(92810L)
                .save();

        // User B (tenant B) tries to access user A's order (tenant A)
        String tokenB = generateToken(userB.getId(), tenantB, List.of("user"));
        setTenantContext(tenantB);

        MvcResult result = getWithToken("/api/exchanges/orders/" + order.getId(), tokenB);

        // Must return HTTP 403, not 200
        assertEquals(403, result.getResponse().getStatus(),
                "Cross-tenant order access should return 403, got: " + result.getResponse().getStatus() +
                        ", body: " + result.getResponse().getContentAsString());
        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();
        assertTrue(content.contains("SYSTEM004"),
                "Should contain SYSTEM004 error code, got: " + content);
    }

    // ─────────────────────────────────────────
    // 5. Order Cancellation
    // ─────────────────────────────────────────

    @Test
    void testCancelFulfilledOrderFails() throws Exception {
        long tenantId = BASE_TENANT + 30;
        testDataHelper.tenant("订单取消测试").id(tenantId).save();

        User user = testDataHelper.user(tenantId, "13900092301", "Test@123")
                .id(92301L)
                .save();

        ExchangeOrder order = testDataHelper.exchangeOrder(tenantId, user.getId(), 92310L, "已兑换商品", 100, "fulfilled")
                .id(92310L)
                .save();

        String token = generateToken(user.getId(), tenantId, List.of("user"));
        setTenantContext(tenantId);

        MvcResult result = mockMvc.perform(
                org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
                        "/api/exchanges/orders/" + order.getId() + "/cancel")
                        .header("Authorization", "Bearer " + token)
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
        ).andReturn();

        // Fulfilled orders cannot be cancelled (ORDER_STATUS_ERROR = 10404)
        assertErrorCode(result, "ORDER004");
    }

    // ─────────────────────────────────────────
    // 6. Admin Coupon Redemption
    // ─────────────────────────────────────────

    @Test
    void testRedeemCouponByCode() throws Exception {
        long tenantId = BASE_TENANT + 40;
        testDataHelper.tenant("券码核销测试").id(tenantId).save();

        User user = testDataHelper.user(tenantId, "13900092401", "Test@123")
                .id(92401L)
                .totalPoints(500)
                .availablePoints(500)
                .save();

        User admin = testDataHelper.user(tenantId, "13900092402", "Test@123")
                .id(92402L)
                .save();

        // Create exchange to get coupon code
        testDataHelper.user(tenantId, "13900092403", "Test@123")
                .id(92403L)
                .totalPoints(1000)
                .availablePoints(1000)
                .save();

        Product product = testDataHelper.product(tenantId, "券码核销商品", "coupon", 100, 10)
                .id(92410L)
                .save();

        String userToken = generateToken(92403L, tenantId, List.of("user"));
        setTenantContext(tenantId);

        // Exchange to create coupon
        String exchangeJson = """
            {
                "productId": %d
            }
            """.formatted(product.getId());
        postJson("/api/exchanges", exchangeJson, userToken);

        // Get order and coupon code
        setTenantContext(tenantId);
        LambdaQueryWrapper<ExchangeOrder> qw = new LambdaQueryWrapper<>();
        qw.eq(ExchangeOrder::getUserId, 92403L)
          .eq(ExchangeOrder::getTenantId, tenantId)
          .orderByDesc(ExchangeOrder::getCreatedAt)
          .last("LIMIT 1");
        ExchangeOrder order = exchangeOrderMapper.selectOne(qw);

        assertEquals("fulfilled", order.getOrderStatus());
        String couponCode = order.getCouponCode();

        // Admin redeems
        String adminToken = generateToken(admin.getId(), tenantId, List.of("admin"));
        setTenantContext(tenantId);

        MvcResult redeemResult = mockMvc.perform(
                org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(
                        "/api/exchanges/admin/redeem")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("couponCode", couponCode)
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
        ).andReturn();

        assertSuccess(redeemResult);

        // Verify order status changed to 'used'
        setTenantContext(tenantId);
        ExchangeOrder usedOrder = exchangeOrderMapper.selectById(order.getId());
        assertEquals("used", usedOrder.getOrderStatus());
        assertNotNull(usedOrder.getUsedAt());
    }

    @Test
    void testRedeemInvalidCouponCode() throws Exception {
        long tenantId = BASE_TENANT + 41;
        testDataHelper.tenant("无效券码测试").id(tenantId).save();

        User admin = testDataHelper.user(tenantId, "13900092411", "Test@123")
                .id(92411L)
                .save();

        String adminToken = generateToken(admin.getId(), tenantId, List.of("admin"));
        setTenantContext(tenantId);

        MvcResult result = mockMvc.perform(
                org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(
                        "/api/exchanges/admin/redeem")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("couponCode", "INVALID_NONEXISTENT_CODE_12345")
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
        ).andReturn();

        // Should return MALL_COUPON_NOT_FOUND (10804)
        assertErrorCode(result, "MALL004");
    }

    // ─────────────────────────────────────────
    // 7. Admin Order Listing
    // ─────────────────────────────────────────

    @Test
    void testGetTenantOrders() throws Exception {
        long tenantId = BASE_TENANT + 50;
        testDataHelper.tenant("租户订单列表测试").id(tenantId).save();

        User admin = testDataHelper.user(tenantId, "13900092501", "Test@123")
                .id(92501L)
                .save();

        User user = testDataHelper.user(tenantId, "13900092502", "Test@123")
                .id(92502L)
                .save();

        testDataHelper.exchangeOrder(tenantId, user.getId(), 92510L, "租户商品1", 100, "fulfilled")
                .id(92510L)
                .save();
        testDataHelper.exchangeOrder(tenantId, user.getId(), 92511L, "租户商品2", 200, "used")
                .id(92511L)
                .save();

        String adminToken = generateToken(admin.getId(), tenantId, List.of("admin"));
        setTenantContext(tenantId);

        MvcResult result = getWithToken("/api/exchanges/admin/orders", adminToken);
        assertSuccess(result);

        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();

        assertTrue(content.contains("租户商品1"));
        assertTrue(content.contains("租户商品2"));
    }

    // ─────────────────────────────────────────
    // 8. User Confirm Use
    // ─────────────────────────────────────────

    @Test
    void testUserConfirmUse() throws Exception {
        long tenantId = BASE_TENANT + 60;
        testDataHelper.tenant("用户确认使用测试").id(tenantId).save();

        User user = testDataHelper.user(tenantId, "13900092601", "Test@123")
                .id(92601L)
                .totalPoints(500)
                .availablePoints(500)
                .save();

        ExchangeOrder order = testDataHelper.exchangeOrder(tenantId, user.getId(), 92610L, "用户确认商品", 100, "fulfilled")
                .couponCode("USE_CODE_01")
                .id(92610L)
                .save();

        String token = generateToken(user.getId(), tenantId, List.of("user"));
        setTenantContext(tenantId);

        MvcResult result = mockMvc.perform(
                org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
                        "/api/exchanges/orders/" + order.getId() + "/use")
                        .header("Authorization", "Bearer " + token)
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
        ).andReturn();

        assertSuccess(result);

        setTenantContext(tenantId);
        ExchangeOrder usedOrder = exchangeOrderMapper.selectById(order.getId());
        assertEquals("used", usedOrder.getOrderStatus());
        assertEquals("self", usedOrder.getUsedBy());
    }

    // ─────────────────────────────────────────
    // 9. User Coupons Listing
    // ─────────────────────────────────────────

    @Test
    void testGetMyCoupons() throws Exception {
        long tenantId = BASE_TENANT + 70;
        testDataHelper.tenant("我的卡券测试").id(tenantId).save();

        User user = testDataHelper.user(tenantId, "13900092701", "Test@123")
                .id(92701L)
                .save();

        // Create coupon orders
        testDataHelper.exchangeOrder(tenantId, user.getId(), 92710L, "卡券商品", 100, "fulfilled")
                .couponCode("COUPON_CODE_01")
                .id(92710L)
                .save();

        String token = generateToken(user.getId(), tenantId, List.of("user"));
        setTenantContext(tenantId);

        MvcResult result = getWithToken("/api/exchanges/coupons", token);
        assertSuccess(result);

        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();

        assertTrue(content.contains("卡券商品"), "Should contain product name");
        assertTrue(content.contains("COUPON_CODE_01"), "Should contain coupon code");
    }

    @Autowired
    private TestDataHelper testDataHelper;
}
