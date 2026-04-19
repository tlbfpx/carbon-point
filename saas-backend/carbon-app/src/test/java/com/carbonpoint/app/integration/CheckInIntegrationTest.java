package com.carbonpoint.app.integration;

import com.carbonpoint.stair.entity.CheckInRecordEntity;
import com.carbonpoint.stair.entity.TimeSlotRule;
import com.carbonpoint.stair.mapper.CheckInRecordMapper;
import com.carbonpoint.stair.mapper.TimeSlotRuleMapper;
import com.carbonpoint.common.entity.PointTransactionEntity;
import com.carbonpoint.common.mapper.PointTransactionMapper;
import com.carbonpoint.points.entity.PointRule;
import com.carbonpoint.points.mapper.PointRuleMapper;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.mapper.UserMapper;
import com.carbonpoint.common.tenant.TenantContext;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for the check-in API flow.
 *
 * <p>Tests the complete business flow:
 * <ol>
 *   <li>User checks in via API</li>
 *   <li>Points are awarded</li>
 *   <li>Records are created in DB</li>
 *   <li>Duplicate check-in is rejected</li>
 * </ol>
 */
class CheckInIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TimeSlotRuleMapper timeSlotRuleMapper;

    @Autowired
    private CheckInRecordMapper checkInRecordMapper;

    @Autowired
    private PointTransactionMapper pointTransactionMapper;

    @Autowired
    private PointRuleMapper pointRuleMapper;

    // Use tenant 99 to avoid conflicts with seed data in tenant 1
    private static final long TEST_TENANT = 99L;

    // ─────────────────────────────────────────
    // 15.1.1 — Normal check-in flow
    // ─────────────────────────────────────────

    @Test
    void testNormalCheckIn() throws Exception {
        // Step 1: Create tenant and user (no seed data for tenant 99)
        testDataHelper.tenant("TestTenant").id(TEST_TENANT).save();
        User user = testDataHelper.user(TEST_TENANT, "13900000001", "Test@123")
                .availablePoints(0)
                .totalPoints(0)
                .save();

        setTenantContext(TEST_TENANT);

        // Step 2: Create a time slot rule and matching PointRule
        long ruleId = 901L;
        TimeSlotRule tsRule = new TimeSlotRule();
        tsRule.setId(ruleId);
        tsRule.setTenantId(TEST_TENANT);
        tsRule.setName("全天时段");
        tsRule.setStartTime(LocalTime.of(0, 0));
        tsRule.setEndTime(LocalTime.of(23, 59));
        tsRule.setEnabled(true);
        timeSlotRuleMapper.insert(tsRule);

        PointRule pr = new PointRule();
        pr.setId(ruleId);
        pr.setTenantId(TEST_TENANT);
        pr.setType("time_slot");
        pr.setName("全天时段");
        pr.setConfig("{\"startTime\":\"00:00\",\"endTime\":\"23:59:59\",\"minPoints\":10,\"maxPoints\":20}");
        pr.setEnabled(true);
        pr.setSortOrder(0);
        pointRuleMapper.insert(pr);

        // Step 3: Generate token for the user
        String token = generateToken(user.getId(), user.getTenantId(), java.util.List.of("user"));

        // Step 4: Call check-in API
        String checkInJson = """
            {
                "ruleId": %d
            }
            """.formatted(ruleId);

        MvcResult result = postJson("/api/checkin", checkInJson, token);

        // Step 5: Verify response is successful
        assertSuccess(result);

        // Step 6: Verify point_transactions record exists
        setTenantContext(TEST_TENANT);
        LambdaQueryWrapper<PointTransactionEntity> txWrapper = new LambdaQueryWrapper<>();
        txWrapper.eq(PointTransactionEntity::getUserId, user.getId())
                 .eq(PointTransactionEntity::getType, "check_in");
        PointTransactionEntity tx = pointTransactionMapper.selectOne(txWrapper);
        assertNotNull(tx, "Point transaction should be created");
        assertTrue(tx.getAmount() > 0, "Awarded points should be positive");

        // Step 7: Verify user_points increased
        User updatedUser = userMapper.selectById(user.getId());
        assertTrue(updatedUser.getAvailablePoints() > 0, "User available points should increase");
        assertTrue(updatedUser.getTotalPoints() > 0, "User total points should increase");
        assertEquals(1, updatedUser.getConsecutiveDays(), "Consecutive days should be 1");
        assertEquals(LocalDate.now(), updatedUser.getLastCheckinDate(), "Last checkin date should be today");
    }

    // ─────────────────────────────────────────
    // 15.1.2 — Duplicate check-in rejection
    // ─────────────────────────────────────────

    @Test
    void testDuplicateCheckInRejected() throws Exception {
        // Setup: tenant, user, time slot
        testDataHelper.tenant("DupTestTenant").id(98L).save();
        User user = testDataHelper.user(98L, "13900000002", "Test@123").save();
        setTenantContext(98L);

        long ruleId = 902L;
        TimeSlotRule tsRule = new TimeSlotRule();
        tsRule.setId(ruleId);
        tsRule.setTenantId(98L);
        tsRule.setName("上午时段");
        tsRule.setStartTime(LocalTime.of(0, 0));
        tsRule.setEndTime(LocalTime.of(23, 59));
        tsRule.setEnabled(true);
        timeSlotRuleMapper.insert(tsRule);

        PointRule pr = new PointRule();
        pr.setId(ruleId);
        pr.setTenantId(98L);
        pr.setType("time_slot");
        pr.setName("上午时段");
        pr.setConfig("{\"startTime\":\"00:00\",\"endTime\":\"23:59:59\",\"minPoints\":10,\"maxPoints\":20}");
        pr.setEnabled(true);
        pr.setSortOrder(0);
        pointRuleMapper.insert(pr);

        // Pre-create a check-in record for today (simulating existing check-in)
        testDataHelper.checkInRecord(
                user.getId(),
                98L,
                ruleId,
                LocalDate.now()
        ).finalPoints(15).save();

        String token = generateToken(user.getId(), user.getTenantId(), java.util.List.of("user"));

        // Attempt duplicate check-in
        String checkInJson = """
            {
                "ruleId": %d
            }
            """.formatted(ruleId);

        MvcResult result = postJson("/api/checkin", checkInJson, token);

        // Should receive CHECKIN_ALREADY_DONE error (code 10002)
        assertErrorCode(result, "CHECKIN002");

        // Verify no transaction was created (pre-existing record and rejected duplicate both have no transaction)
        LambdaQueryWrapper<PointTransactionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PointTransactionEntity::getUserId, user.getId())
               .eq(PointTransactionEntity::getType, "check_in");
        long txCount = pointTransactionMapper.selectCount(wrapper);
        assertEquals(0, txCount, "Should have exactly 0 check-in transactions");
    }

    // ─────────────────────────────────────────
    // 15.1.3 — Check-in requires authentication
    // ─────────────────────────────────────────

    @Test
    void testCheckInRequiresAuth() throws Exception {
        MvcResult result = postJson("/api/checkin", """
            {
                "ruleId": 1
            }
            """);

        // Should return 401 Unauthorized
        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();
        assertTrue(
                content.contains("\"code\":401") || content.contains("未登录"),
                "Should return 401 for unauthenticated request, got: " + content
        );
    }

    // ─────────────────────────────────────────
    // 15.1.4 — Verify check-in record fields
    // ─────────────────────────────────────────

    @Test
    void testCheckInRecordFields() throws Exception {
        testDataHelper.tenant("FieldsTestTenant").id(97L).save();
        User user = testDataHelper.user(97L, "13900000003", "Test@123").save();
        setTenantContext(97L);

        long ruleId = 903L;
        TimeSlotRule tsRule = new TimeSlotRule();
        tsRule.setId(ruleId);
        tsRule.setTenantId(97L);
        tsRule.setName("下午时段");
        tsRule.setStartTime(LocalTime.of(0, 0));
        tsRule.setEndTime(LocalTime.of(23, 59));
        tsRule.setEnabled(true);
        timeSlotRuleMapper.insert(tsRule);

        PointRule pr = new PointRule();
        pr.setId(ruleId);
        pr.setTenantId(97L);
        pr.setType("time_slot");
        pr.setName("下午时段");
        pr.setConfig("{\"startTime\":\"00:00\",\"endTime\":\"23:59:59\",\"minPoints\":10,\"maxPoints\":20}");
        pr.setEnabled(true);
        pr.setSortOrder(0);
        pointRuleMapper.insert(pr);

        String token = generateToken(user.getId(), user.getTenantId(), java.util.List.of("user"));

        String checkInJson = """
            {
                "ruleId": %d
            }
            """.formatted(ruleId);

        MvcResult result = postJson("/api/checkin", checkInJson, token);
        assertSuccess(result);

        // Verify check-in record was created
        setTenantContext(97L);
        LambdaQueryWrapper<CheckInRecordEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(CheckInRecordEntity::getUserId, user.getId())
               .eq(CheckInRecordEntity::getTimeSlotRuleId, ruleId)
               .eq(CheckInRecordEntity::getCheckinDate, LocalDate.now());
        CheckInRecordEntity record = checkInRecordMapper.selectOne(wrapper);

        assertNotNull(record, "Check-in record should be created");
        assertEquals(ruleId, record.getTimeSlotRuleId(), "Time slot rule ID should match");
        assertEquals(LocalDate.now(), record.getCheckinDate(), "Check-in date should be today");
        assertTrue(record.getBasePoints() > 0, "Base points should be positive");
        assertTrue(record.getFinalPoints() > 0, "Final points should be positive");
        assertEquals(user.getTenantId(), record.getTenantId(), "Tenant ID should match");
    }

    @Autowired
    private TestDataHelper testDataHelper;
}
