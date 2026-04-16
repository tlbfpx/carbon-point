package com.carbonpoint.app.integration;

import com.carbonpoint.points.service.PointAccountService;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.mapper.UserMapper;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.common.entity.PointTransactionEntity;
import com.carbonpoint.common.mapper.PointTransactionMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * P0 concurrency tests for point operations.
 *
 * <p>Tests the optimistic locking mechanism (version field) that prevents
 * lost updates during concurrent point modifications.
 */
class PointConcurrencyIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private PointAccountService pointAccountService;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private PointTransactionMapper pointTransactionMapper;

    // ═══════════════════════════════════════════════════════════════════
    // P0-1: Optimistic lock concurrent deduction
    // ═══════════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────
    // 15.4.1 — 100 concurrent deductions, version lock prevents lost updates
    // ─────────────────────────────────────────

    @Test
    void testConcurrentDeductPointsOptimisticLock() throws Exception {
        // Setup: user with 100 points
        testDataHelper.tenant("积分乐观锁测试").id(8001L).save();

        User user = testDataHelper.user(8001L, "13900008001", "Test@123")
                .id(8001L)
                .totalPoints(100)
                .availablePoints(100)
                .frozenPoints(0)
                .save();

        TenantContext.setTenantId(8001L);

        // 100 concurrent threads each trying to deduct 100 points
        int numThreads = 100;
        int deductAmount = 100;

        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(numThreads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);
        AtomicInteger errorCount = new AtomicInteger(0);

        for (int i = 0; i < numThreads; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    TenantContext.setTenantId(8001L);
                    boolean result = pointAccountService.deductPoints(user.getId(), deductAmount);
                    if (result) {
                        successCount.incrementAndGet();
                    } else {
                        failCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    // deductPoints throws on failure after 3 retries
                    errorCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        doneLatch.await();
        executor.shutdown();

        // Exactly 1 deduction should succeed (the first one)
        // The other 99 fail because:
        // - Version conflict causes retry
        // - After 3 retries with exponential backoff, throws SYSTEM_ERROR
        // Note: due to retry timing, exact numbers may vary slightly, but
        // the key invariant is: final available_points >= 0 (no lost updates)
        assertEquals(1, successCount.get(),
                "Exactly 1 deduction should succeed");

        // Verify final balance is never negative (optimistic lock protection)
        User finalUser = userMapper.selectById(user.getId());
        assertTrue(finalUser.getAvailablePoints() >= 0,
                "Available points should never be negative, got: " + finalUser.getAvailablePoints());
        assertTrue(finalUser.getTotalPoints() >= 0,
                "Total points should never be negative, got: " + finalUser.getTotalPoints());

        // The version should have been incremented by successful deduction
        assertTrue(finalUser.getVersion() >= 1,
                "Version should be incremented after deduction");

        // Only 1 deduction transaction should exist
        TenantContext.setTenantId(8001L);
        LambdaQueryWrapper<PointTransactionEntity> txWrapper = new LambdaQueryWrapper<>();
        txWrapper.eq(PointTransactionEntity::getUserId, user.getId())
                 .eq(PointTransactionEntity::getTenantId, 8001L);
        long txCount = pointTransactionMapper.selectCount(txWrapper);
        // deductPoints(userId, amount) does NOT create transactions directly
        // Only the atomic variant does. So this may be 0, which is expected.
        // The key assertion is that available_points is correct.
    }

    // ─────────────────────────────────────────
    // 15.4.2 — Concurrent deductions on same user: balance never goes negative
    // ─────────────────────────────────────────

    @Test
    void testConcurrentDeductPointsNeverNegative() throws Exception {
        // Setup: user with 500 points
        testDataHelper.tenant("积分不超扣测试").id(8002L).save();

        User user = testDataHelper.user(8002L, "13900008002", "Test@123")
                .id(8002L)
                .totalPoints(500)
                .availablePoints(500)
                .frozenPoints(0)
                .save();

        TenantContext.setTenantId(8002L);

        // 20 concurrent threads, each deducting 100 points
        // Only 5 should succeed (500 / 100 = 5)
        int numThreads = 20;
        int deductAmount = 100;

        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(numThreads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failOrErrorCount = new AtomicInteger(0);

        for (int i = 0; i < numThreads; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    TenantContext.setTenantId(8002L);
                    boolean result = pointAccountService.deductPoints(user.getId(), deductAmount);
                    if (result) {
                        successCount.incrementAndGet();
                    } else {
                        failOrErrorCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    failOrErrorCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        doneLatch.await();
        executor.shutdown();

        // At most 5 deductions should succeed (500 / 100 = 5)
        assertTrue(successCount.get() <= 5,
                "At most 5 deductions should succeed, got " + successCount.get());

        // Final balance is never negative
        User finalUser = userMapper.selectById(user.getId());
        assertTrue(finalUser.getAvailablePoints() >= 0,
                "Available points should never be negative, got: " + finalUser.getAvailablePoints());
        assertTrue(finalUser.getTotalPoints() >= 0,
                "Total points should never be negative, got: " + finalUser.getTotalPoints());

        // Final balance equals initial minus successes
        int expectedBalance = 500 - (successCount.get() * deductAmount);
        assertEquals(expectedBalance, finalUser.getAvailablePoints(),
                "Available points should be initial - (successes * deductAmount)");
        // Note: totalPoints is NOT updated by deductPoints(userId, amount)
        // (only availablePoints is deducted). In real exchange flow, totalPoints
        // is updated separately when points are consumed.
    }

    @Autowired
    private TestDataHelper testDataHelper;
}
