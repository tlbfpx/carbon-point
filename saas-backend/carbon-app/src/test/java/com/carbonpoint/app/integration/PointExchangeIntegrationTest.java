package com.carbonpoint.app.integration;

import com.carbonpoint.mall.entity.Product;
import com.carbonpoint.mall.entity.ExchangeOrder;
import com.carbonpoint.mall.mapper.MallProductMapper;
import com.carbonpoint.mall.mapper.ExchangeOrderMapper;
import com.carbonpoint.points.service.PointAccountService;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.mapper.UserMapper;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.common.entity.PointTransactionEntity;
import com.carbonpoint.common.mapper.PointTransactionMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for point exchange / mall flow.
 *
 * <p>Tests:
 * <ul>
 *   <li>Successful coupon exchange with stock deduction</li>
 *   <li>Insufficient points rejection</li>
 *   <li>Sold out rejection</li>
 *   <li>Points are deducted and orders are created</li>
 * </ul>
 */
class PointExchangeIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private MallProductMapper productMapper;

    @Autowired
    private ExchangeOrderMapper exchangeOrderMapper;

    @Autowired
    private PointAccountService pointAccountService;

    @Autowired
    private PointTransactionMapper pointTransactionMapper;

    @Autowired
    private UserMapper userMapper;

    // ─────────────────────────────────────────
    // 15.1.2a — Successful coupon exchange
    // ─────────────────────────────────────────

    @Test
    void testExchangeCoupon() throws Exception {
        // Step 1: Create tenant, user with sufficient points, and product
        testDataHelper.tenant("兑换测试租户").id(2001L).save();

        User user = testDataHelper.user(2001L, "13900002001", "Test@123")
                .id(2001L)
                .totalPoints(500)
                .availablePoints(500)
                .frozenPoints(0)
                .save();

        Product product = testDataHelper.product(2001L, "测试咖啡券", "coupon", 100, 10)
                .save();

        // Step 2: User has sufficient points
        assertTrue(user.getAvailablePoints() >= product.getPointsPrice(),
                "User should have sufficient points for exchange");

        // Step 3: Call exchange API
        String token = generateToken(user.getId(), 2001L, List.of("user"));
        setTenantContext(2001L);

        String exchangeJson = """
            {
                "productId": %d
            }
            """.formatted(product.getId());

        MvcResult result = postJson("/api/exchanges", exchangeJson, token);
        assertSuccess(result);

        // Step 4: Verify points were deducted
        setTenantContext(2001L);
        User updatedUser = userMapper.selectById(user.getId());
        assertEquals(400, updatedUser.getAvailablePoints(),
                "Available points should decrease by product price");
        assertEquals(400, updatedUser.getTotalPoints(),
                "Total points should decrease after exchange (frozen points consumed)");

        // Step 5: Verify order was created
        LambdaQueryWrapper<ExchangeOrder> orderWrapper = new LambdaQueryWrapper<>();
        orderWrapper.eq(ExchangeOrder::getUserId, user.getId())
                    .eq(ExchangeOrder::getProductId, product.getId())
                    .orderByDesc(ExchangeOrder::getCreatedAt)
                    .last("LIMIT 1");
        ExchangeOrder order = exchangeOrderMapper.selectOne(orderWrapper);

        assertNotNull(order, "Exchange order should be created");
        assertEquals(product.getPointsPrice(), order.getPointsSpent(),
                "Points spent should match product price");
        assertEquals("fulfilled", order.getOrderStatus(),
                "Order status should be fulfilled for coupon type");

        // Step 6: Verify coupon code was generated
        assertNotNull(order.getCouponCode(),
                "Coupon code should be generated for coupon type");
        assertFalse(order.getCouponCode().isBlank(),
                "Coupon code should not be blank");

        // Step 7: Verify product stock was reduced
        Product updatedProduct = productMapper.selectById(product.getId());
        assertEquals(9, updatedProduct.getStock(),
                "Product stock should decrease by 1");
    }

    // ─────────────────────────────────────────
    // 15.1.2b — Insufficient points rejection
    // ─────────────────────────────────────────

    @Test
    void testInsufficientPointsRejected() throws Exception {
        testDataHelper.tenant("积分不足测试租户").id(2002L).save();

        // User with only 50 points
        User user = testDataHelper.user(2002L, "13900002002", "Test@123")
                .id(2002L)
                .totalPoints(50)
                .availablePoints(50)
                .frozenPoints(0)
                .save();

        // Product costs 100 points
        Product product = testDataHelper.product(2002L, "高价商品", "coupon", 100, 5)
                .save();

        String token = generateToken(user.getId(), 2002L, List.of("user"));
        setTenantContext(2002L);

        String exchangeJson = """
            {
                "productId": %d
            }
            """.formatted(product.getId());

        MvcResult result = postJson("/api/exchanges", exchangeJson, token);
        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();

        // Should be rejected with insufficient points error
        assertTrue(
                content.contains("\"code\":10201") || content.contains("\"code\":10407")
                || content.contains("ORDER007") || content.contains("积分不够") || content.contains("积分不足"),
                "Insufficient points should be rejected, got: " + content
        );

        // Verify no order was created
        LambdaQueryWrapper<ExchangeOrder> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ExchangeOrder::getUserId, user.getId())
               .eq(ExchangeOrder::getProductId, product.getId());
        long orderCount = exchangeOrderMapper.selectCount(wrapper);
        assertEquals(0, orderCount,
                "No order should be created when points are insufficient");
    }

    // ─────────────────────────────────────────
    // 15.1.2c — Sold out product rejection
    // ─────────────────────────────────────────

    @Test
    void testSoldOutProductRejected() throws Exception {
        testDataHelper.tenant("售罄测试租户").id(2003L).save();

        User user = testDataHelper.user(2003L, "13900002003", "Test@123")
                .id(2003L)
                .totalPoints(5000)
                .availablePoints(5000)
                .save();

        // Product with 0 stock
        Product product = testDataHelper.product(2003L, "限量商品", "coupon", 100, 0)
                .save();

        String token = generateToken(user.getId(), 2003L, List.of("user"));
        setTenantContext(2003L);

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

        // Verify points were NOT deducted
        setTenantContext(2003L);
        User updatedUser = userMapper.selectById(user.getId());
        assertEquals(5000, updatedUser.getAvailablePoints(),
                "Points should NOT be deducted for sold out product");
    }

    // ─────────────────────────────────────────
    // 15.1.2d — Inactive product rejection
    // ─────────────────────────────────────────

    @Test
    void testInactiveProductRejected() throws Exception {
        testDataHelper.tenant("下架商品测试租户").id(2004L).save();

        User user = testDataHelper.user(2004L, "13900002004", "Test@123")
                .id(2004L)
                .totalPoints(5000)
                .availablePoints(5000)
                .save();

        // Inactive product
        Product product = testDataHelper.product(2004L, "已下架商品", "coupon", 100, 100)
                .inactive()
                .save();

        String token = generateToken(user.getId(), 2004L, List.of("user"));
        setTenantContext(2004L);

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
    // 15.1.2e — Exchange creates point transaction
    // ─────────────────────────────────────────

    @Test
    void testExchangeCreatesPointTransaction() throws Exception {
        testDataHelper.tenant("积分流水测试租户").id(2005L).save();

        User user = testDataHelper.user(2005L, "13900002005", "Test@123")
                .id(2005L)
                .totalPoints(1000)
                .availablePoints(1000)
                .save();

        Product product = testDataHelper.product(2005L, "积分商品", "coupon", 200, 20)
                .save();

        String token = generateToken(user.getId(), 2005L, List.of("user"));
        setTenantContext(2005L);

        String exchangeJson = """
            {
                "productId": %d
            }
            """.formatted(product.getId());

        postJson("/api/exchanges", exchangeJson, token);

        // Verify point transaction was created
        setTenantContext(2005L);
        LambdaQueryWrapper<PointTransactionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PointTransactionEntity::getUserId, user.getId())
               .eq(PointTransactionEntity::getType, "frozen")
               .orderByDesc(PointTransactionEntity::getCreatedAt)
               .last("LIMIT 1");
        PointTransactionEntity tx = pointTransactionMapper.selectOne(wrapper);

        assertNotNull(tx, "Point transaction should be created for exchange (frozen)");
        assertEquals(-200, tx.getAmount(),
                "Transaction amount should be negative (deduction)");
        assertEquals(800, tx.getBalanceAfter(),
                "Balance after should reflect deduction");
    }

    @Autowired
    private TestDataHelper testDataHelper;
}
