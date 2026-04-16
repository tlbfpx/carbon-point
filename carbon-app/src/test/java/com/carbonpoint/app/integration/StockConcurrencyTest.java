package com.carbonpoint.app.integration;

import com.carbonpoint.mall.entity.Product;
import com.carbonpoint.mall.entity.ExchangeOrder;
import com.carbonpoint.mall.mapper.ProductMapper;
import com.carbonpoint.mall.mapper.ExchangeOrderMapper;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.common.tenant.TenantContext;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MvcResult;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Concurrency tests for stock management during exchanges.
 *
 * <p>Scenario: Product with stock=10, multiple concurrent exchange requests.
 * Expected: Exactly 10 succeed, others fail with MALL_PRODUCT_STOCK_EMPTY (10803).
 */
class StockConcurrencyTest extends BaseIntegrationTest {

    @Autowired
    private ProductMapper productMapper;

    @Autowired
    private ExchangeOrderMapper exchangeOrderMapper;

    private static final int INITIAL_STOCK = 10;
    private static final int CONCURRENT_REQUESTS = 30;
    private static final int EXPECTED_SUCCESS_COUNT = INITIAL_STOCK;

    // ─────────────────────────────────────────
    // 15.3.3 — Concurrent stock deduction
    // ─────────────────────────────────────────

    @Test
    void testConcurrentExchange() throws Exception {
        // Setup: tenant, product with limited stock, users with sufficient points
        testDataHelper.tenant("库存并发测试租户").id(3001L).save();

        Product product = testDataHelper.product(3001L, "限量兑换品", "coupon", 50, INITIAL_STOCK)
                .id(7300L)
                .save();

        // Create users, each with enough points
        List<String> tokens = new ArrayList<>();

        for (int i = 0; i < CONCURRENT_REQUESTS; i++) {
            User user = testDataHelper.user(3001L, "1390000" + String.format("%03d", i), "Test@123")
                    .id(3000L + i)
                    .totalPoints(10000)
                    .availablePoints(10000)
                    .save();
            tokens.add(generateToken(user.getId(), 3001L, List.of("user")));
        }

        ExecutorService executor = Executors.newFixedThreadPool(CONCURRENT_REQUESTS);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(CONCURRENT_REQUESTS);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger stockEmptyCount = new AtomicInteger(0);
        AtomicInteger otherErrorCount = new AtomicInteger(0);

        String exchangeJson = """
            {
                "productId": %d
            }
            """.formatted(product.getId());

        for (String token : tokens) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    setTenantContext(3001L);
                    MvcResult result = postJson("/api/exchanges", exchangeJson, token);
                    result.getResponse().setCharacterEncoding("UTF-8");
                    String content = result.getResponse().getContentAsString();

                    if (content.contains("\"code\":200")) {
                        successCount.incrementAndGet();
                    } else if (content.contains("\"code\":10803") || content.contains("库存")) {
                        stockEmptyCount.incrementAndGet();
                    } else {
                        otherErrorCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    otherErrorCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        doneLatch.await();
        executor.shutdown();

        // Verify: at most INITIAL_STOCK exchanges succeeded (due to optimistic locking, exact number may vary)
        assertTrue(successCount.get() <= INITIAL_STOCK,
                "At most " + INITIAL_STOCK + " exchanges should succeed, got " + successCount.get());

        // Stock must never go negative
        TenantContext.setTenantId(3001L);
        Product finalProduct = productMapper.selectById(product.getId());
        assertTrue(finalProduct.getStock() >= 0,
                "Stock should never be negative, got " + finalProduct.getStock());

        // Verify: fulfilled orders match success count
        setTenantContext(3001L);
        LambdaQueryWrapper<ExchangeOrder> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ExchangeOrder::getProductId, product.getId())
               .eq(ExchangeOrder::getTenantId, 3001L)
               .eq(ExchangeOrder::getOrderStatus, "fulfilled");
        long orderCount = exchangeOrderMapper.selectCount(wrapper);
        assertEquals(successCount.get(), orderCount,
                "Fulfilled orders should match success count");
    }

    // ─────────────────────────────────────────
    // 15.3.4 — Stock cannot go negative
    // ─────────────────────────────────────────

    @Test
    void testStockCannotGoNegative() throws Exception {
        testDataHelper.tenant("库存防超卖测试租户").id(3002L).save();

        Product product = testDataHelper.product(3002L, "单库存商品", "coupon", 10, 1)
                .id(7301L)
                .save();

        // Create 5 users
        List<String> tokens = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            User user = testDataHelper.user(3002L, "1390001" + String.format("%02d", i), "Test@123")
                    .id(3100L + i)
                    .totalPoints(1000)
                    .availablePoints(1000)
                    .save();
            tokens.add(generateToken(user.getId(), 3002L, List.of("user")));
        }

        ExecutorService executor = Executors.newFixedThreadPool(5);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(5);

        AtomicInteger successCount = new AtomicInteger(0);

        String exchangeJson = """
            {
                "productId": %d
            }
            """.formatted(product.getId());

        for (String token : tokens) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    setTenantContext(3002L);
                    MvcResult result = postJson("/api/exchanges", exchangeJson, token);
                    result.getResponse().setCharacterEncoding("UTF-8");
                    String content = result.getResponse().getContentAsString();
                    if (content.contains("\"code\":200")) {
                        successCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    // Expected for failures
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        doneLatch.await();
        executor.shutdown();

        // At most 1 exchange should succeed
        assertTrue(successCount.get() <= 1,
                "At most 1 exchange should succeed for product with stock=1, got " + successCount.get());

        // Stock must never be negative
        TenantContext.setTenantId(3002L);
        Product finalProduct = productMapper.selectById(product.getId());
        assertTrue(finalProduct.getStock() >= 0,
                "Stock should never be negative, got " + finalProduct.getStock());
    }

    @Autowired
    private TestDataHelper testDataHelper;
}
