package com.carbonpoint.checkin;

import com.carbonpoint.checkin.entity.CheckInRecordEntity;
import com.carbonpoint.checkin.entity.TimeSlotRule;
import com.carbonpoint.checkin.mapper.CheckInRecordMapper;
import com.carbonpoint.checkin.mapper.TimeSlotRuleMapper;
import com.carbonpoint.common.entity.PointTransactionEntity;
import com.carbonpoint.common.mapper.PointTransactionMapper;
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

    // ─────────────────────────────────────────
    // 15.1.1 — Normal check-in flow
    // ─────────────────────────────────────────

    @Test
    void testNormalCheckIn() throws Exception {
        // Step 1: Create tenant and user
        User user = testDataHelper.user(1L, "13800000001", "Test@123")
                .availablePoints(0)
                .totalPoints(0)
                .save();

        setTenantContext(1L);

        // Step 2: Create a time slot rule (always within current time range)
        TimeSlotRule rule = testDataHelper.timeSlotRule(
                1L,
                "全天时段",
                LocalTime.of(0, 0),
                LocalTime.of(23, 59)
        ).save();

        // Step 3: Generate token for the user
        String token = generateToken(user.getId(), user.getTenantId(), java.util.List.of("user"));

        // Step 4: Call check-in API
        String checkInJson = """
            {
                "ruleId": %d
            }
            """.formatted(rule.getId());

        MvcResult result = postJson("/api/checkin", checkInJson, token);

        // Step 5: Verify response is successful
        assertSuccess(result);

        // Step 6: Verify point_transactions record exists
        setTenantContext(1L);
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
        User user = testDataHelper.user(1L, "13800000002", "Test@123").save();
        setTenantContext(1L);

        TimeSlotRule rule = testDataHelper.timeSlotRule(
                1L, "上午时段",
                LocalTime.of(0, 0),
                LocalTime.of(23, 59)
        ).save();

        // Pre-create a check-in record for today (simulating existing check-in)
        testDataHelper.checkInRecord(
                user.getId(),
                1L,
                rule.getId(),
                LocalDate.now()
        ).finalPoints(15).save();

        String token = generateToken(user.getId(), user.getTenantId(), java.util.List.of("user"));

        // Attempt duplicate check-in
        String checkInJson = """
            {
                "ruleId": %d
            }
            """.formatted(rule.getId());

        MvcResult result = postJson("/api/checkin", checkInJson, token);

        // Should receive CHECKIN_ALREADY_DONE error (code CHECKIN002)
        assertErrorCode(result, "CHECKIN002");

        // Verify no new check-in record was inserted (count stays at 1)
        setTenantContext(1L);
        LambdaQueryWrapper<CheckInRecordEntity> recordWrapper = new LambdaQueryWrapper<>();
        recordWrapper.eq(CheckInRecordEntity::getUserId, user.getId())
               .eq(CheckInRecordEntity::getTimeSlotRuleId, rule.getId())
               .eq(CheckInRecordEntity::getCheckinDate, LocalDate.now());
        long recordCount = checkInRecordMapper.selectCount(recordWrapper);
        assertEquals(1, recordCount, "Should have exactly 1 check-in record (no duplicate inserted)");
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
        User user = testDataHelper.user(1L, "13800000004", "Test@123").save();
        setTenantContext(1L);

        TimeSlotRule rule = testDataHelper.timeSlotRule(
                1L, "下午时段",
                LocalTime.of(0, 0),
                LocalTime.of(23, 59)
        ).save();

        String token = generateToken(user.getId(), user.getTenantId(), java.util.List.of("user"));

        String checkInJson = """
            {
                "ruleId": %d
            }
            """.formatted(rule.getId());

        MvcResult result = postJson("/api/checkin", checkInJson, token);
        assertSuccess(result);

        // Verify check-in record was created
        setTenantContext(1L);
        LambdaQueryWrapper<CheckInRecordEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(CheckInRecordEntity::getUserId, user.getId())
               .eq(CheckInRecordEntity::getTimeSlotRuleId, rule.getId())
               .eq(CheckInRecordEntity::getCheckinDate, LocalDate.now());
        CheckInRecordEntity record = checkInRecordMapper.selectOne(wrapper);

        assertNotNull(record, "Check-in record should be created");
        assertEquals(rule.getId(), record.getTimeSlotRuleId(), "Time slot rule ID should match");
        assertEquals(LocalDate.now(), record.getCheckinDate(), "Check-in date should be today");
        assertTrue(record.getBasePoints() > 0, "Base points should be positive");
        assertTrue(record.getFinalPoints() > 0, "Final points should be positive");
        assertEquals(user.getTenantId(), record.getTenantId(), "Tenant ID should match");
    }

    @Autowired
    private TestDataHelper testDataHelper;
}
