package com.carbonpoint.app.integration;

import com.carbonpoint.checkin.entity.CheckInRecordEntity;
import com.carbonpoint.checkin.entity.TimeSlotRule;
import com.carbonpoint.checkin.mapper.CheckInRecordMapper;
import com.carbonpoint.checkin.mapper.TimeSlotRuleMapper;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.common.tenant.TenantContext;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Concurrency tests for check-in API.
 *
 * <p>Tests the concurrency guard specified in design.md:
 * <ul>
 *   <li>Database unique index on (user_id, date, time_slot_rule_id)</li>
 *   <li>Redis distributed lock</li>
 * </ul>
 *
 * <p>Scenario: Same user, same time slot, multiple concurrent requests.
 * Expected: Exactly 1 success, others rejected as duplicate.
 */
class CheckInConcurrencyTest extends BaseIntegrationTest {

    @Autowired
    private TimeSlotRuleMapper timeSlotRuleMapper;

    @Autowired
    private CheckInRecordMapper checkInRecordMapper;

    private static final int CONCURRENT_THREADS = 20;
    private static final int EXPECTED_SUCCESS_COUNT = 1;

    // ─────────────────────────────────────────
    // 15.3.1 — Concurrent check-in for same user/slot
    // ─────────────────────────────────────────

    @Test
    void testConcurrentCheckIn() throws Exception {
        // Setup: single user, single time slot
        testDataHelper.tenant("并发测试租户").id(501L).save();
        User user = testDataHelper.user(501L, "13800000501", "Test@123")
                .id(501L)
                .save();

        TimeSlotRule rule = testDataHelper.timeSlotRule(
                501L, "并发测试时段",
                LocalTime.of(0, 0),
                LocalTime.of(23, 59)
        ).id(6501L).save();

        String token = generateToken(user.getId(), 501L, List.of("user"));

        ExecutorService executor = Executors.newFixedThreadPool(CONCURRENT_THREADS);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(CONCURRENT_THREADS);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger duplicateCount = new AtomicInteger(0);
        AtomicInteger otherErrorCount = new AtomicInteger(0);

        String checkInJson = """
            {
                "ruleId": %d
            }
            """.formatted(rule.getId());

        for (int i = 0; i < CONCURRENT_THREADS; i++) {
            final int threadId = i;
            executor.submit(() -> {
                try {
                    startLatch.await(); // Wait for all threads to be ready
                    setTenantContext(501L);
                    MvcResult result = postJson("/api/checkin", checkInJson, token);
                    result.getResponse().setCharacterEncoding("UTF-8");
                    String content = result.getResponse().getContentAsString();

                    if (content.contains("\"code\":200")) {
                        successCount.incrementAndGet();
                    } else if (content.contains("\"code\":10002")) {
                        // CHECKIN_ALREADY_DONE — expected for duplicates
                        duplicateCount.incrementAndGet();
                    } else {
                        otherErrorCount.incrementAndGet();
                        System.out.println("Thread " + threadId + " unexpected: " + content);
                    }
                } catch (Exception e) {
                    otherErrorCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        // Release all threads simultaneously
        startLatch.countDown();
        doneLatch.await();
        executor.shutdown();

        // Verify results
        assertEquals(EXPECTED_SUCCESS_COUNT, successCount.get(),
                "Exactly 1 request should succeed, got " + successCount.get());

        // All other requests should be rejected as duplicate
        int expectedDuplicates = CONCURRENT_THREADS - EXPECTED_SUCCESS_COUNT;
        assertEquals(expectedDuplicates, duplicateCount.get(),
                "All other requests should be rejected as duplicate check-in");

        assertEquals(0, otherErrorCount.get(),
                "No other errors should occur");

        // Verify: only 1 record in DB
        setTenantContext(501L);
        LambdaQueryWrapper<CheckInRecordEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(CheckInRecordEntity::getUserId, user.getId())
               .eq(CheckInRecordEntity::getCheckinDate, LocalDate.now())
               .eq(CheckInRecordEntity::getTimeSlotRuleId, rule.getId());
        long dbCount = checkInRecordMapper.selectCount(wrapper);
        assertEquals(1, dbCount,
                "Database should contain exactly 1 check-in record");
    }

    // ─────────────────────────────────────────
    // 15.3.2 — Different users can check in concurrently
    // ─────────────────────────────────────────

    @Test
    void testDifferentUsersCanCheckInConcurrently() throws Exception {
        // Setup: one time slot, multiple users
        testDataHelper.tenant("多用户并发租户").id(601L).save();
        TimeSlotRule rule = testDataHelper.timeSlotRule(
                601L, "多用户时段",
                LocalTime.of(0, 0),
                LocalTime.of(23, 59)
        ).id(6601L).save();

        List<String> tokens = new ArrayList<>();
        int numUsers = 10;

        for (int i = 0; i < numUsers; i++) {
            User user = testDataHelper.user(601L, "13800000" + String.format("%02d", i), "Test@123")
                    .id(600L + i)
                    .save();
            tokens.add(generateToken(user.getId(), 601L, List.of("user")));
        }

        ExecutorService executor = Executors.newFixedThreadPool(numUsers);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(numUsers);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger errorCount = new AtomicInteger(0);

        String checkInJson = """
            {
                "ruleId": %d
            }
            """.formatted(rule.getId());

        for (String token : tokens) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    setTenantContext(601L);
                    MvcResult result = postJson("/api/checkin", checkInJson, token);
                    result.getResponse().setCharacterEncoding("UTF-8");
                    String content = result.getResponse().getContentAsString();
                    if (content.contains("\"code\":200")) {
                        successCount.incrementAndGet();
                    } else {
                        errorCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    errorCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        doneLatch.await();
        executor.shutdown();

        // All different users should succeed
        assertEquals(numUsers, successCount.get(),
                "All " + numUsers + " different users should be able to check in");
        assertEquals(0, errorCount.get(),
                "No errors for different users");
    }

    @Autowired
    private TestDataHelper testDataHelper;
}
