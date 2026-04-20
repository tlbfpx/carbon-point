package com.carbonpoint.stair;

import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.points.entity.PointRule;
import com.carbonpoint.stair.entity.CheckInRecordEntity;
import com.carbonpoint.stair.entity.TimeSlotRule;
import com.carbonpoint.system.entity.Tenant;
import com.carbonpoint.system.entity.User;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Edge case integration tests for check-in service.
 */
class CheckInEdgeCaseTest extends BaseIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    // ─────────────────────────────────────────
    // 1. Check-in outside time slot → rejected
    // ─────────────────────────────────────────

    @Test
    void checkInOutsideTimeSlotRejected() throws Exception {
        Tenant tenant = testDataHelper.tenant("edge_outside").save();
        User user = testDataHelper.user(tenant.getId(), "13800820101", "Test@123").save();
        setTenantContext(tenant.getId());

        // Create a narrow slot that current time is very unlikely to match
        TimeSlotRule rule = testDataHelper.timeSlotRule(
                tenant.getId(), "凌晨1点",
                LocalTime.of(3, 0), LocalTime.of(3, 1)).save();

        String token = generateToken(user.getId(), tenant.getId(), List.of("user"));

        String json = "{\"ruleId\":" + rule.getId() + "}";
        MvcResult result = postJson("/api/checkin", json, token);

        assertErrorCode(result, "CHECKIN001");
    }

    // ─────────────────────────────────────────
    // 2. Disabled time slot rule → rejected
    // ─────────────────────────────────────────

    @Test
    void disabledTimeSlotRejected() throws Exception {
        Tenant tenant = testDataHelper.tenant("edge_disabled").save();
        User user = testDataHelper.user(tenant.getId(), "13800820201", "Test@123").save();
        setTenantContext(tenant.getId());

        TimeSlotRule rule = testDataHelper.timeSlotRule(
                tenant.getId(), "已禁用时段",
                LocalTime.of(0, 0), LocalTime.of(23, 59))
                .disabled().save();

        String token = generateToken(user.getId(), tenant.getId(), List.of("user"));

        String json = "{\"ruleId\":" + rule.getId() + "}";
        MvcResult result = postJson("/api/checkin", json, token);

        assertErrorCode(result, "PARAM_INVALID");
    }

    // ─────────────────────────────────────────
    // 3. Streak continuity (3 consecutive days)
    // ─────────────────────────────────────────

    @Test
    void streakContinuityAfter3Days() throws Exception {
        Tenant tenant = testDataHelper.tenant("edge_streak3").save();
        User user = testDataHelper.user(tenant.getId(), "13800820301", "Test@123")
                .consecutiveDays(2)
                .lastCheckinDate(LocalDate.now().minusDays(1))
                .save();
        setTenantContext(tenant.getId());

        TimeSlotRule rule = testDataHelper.timeSlotRule(
                tenant.getId(), "全天",
                LocalTime.of(0, 0), LocalTime.of(23, 59)).save();

        String token = generateToken(user.getId(), tenant.getId(), List.of("user"));

        String json = "{\"ruleId\":" + rule.getId() + "}";
        MvcResult result = postJson("/api/checkin", json, token);

        assertSuccess(result);

        // Verify consecutiveDays = 3
        String content = result.getResponse().getContentAsString();
        assertTrue(content.contains("\"consecutiveDays\":3"),
                "Should show 3 consecutive days, got: " + content);
    }

    // ─────────────────────────────────────────
    // 4. Streak break (gap day)
    // ─────────────────────────────────────────

    @Test
    void streakBreakAfterGapResets() throws Exception {
        Tenant tenant = testDataHelper.tenant("edge_streak_break").save();
        // Last check-in was 3 days ago with 5 consecutive days
        User user = testDataHelper.user(tenant.getId(), "13800820401", "Test@123")
                .consecutiveDays(5)
                .lastCheckinDate(LocalDate.now().minusDays(3))
                .save();
        setTenantContext(tenant.getId());

        TimeSlotRule rule = testDataHelper.timeSlotRule(
                tenant.getId(), "全天",
                LocalTime.of(0, 0), LocalTime.of(23, 59)).save();

        String token = generateToken(user.getId(), tenant.getId(), List.of("user"));

        String json = "{\"ruleId\":" + rule.getId() + "}";
        MvcResult result = postJson("/api/checkin", json, token);

        assertSuccess(result);

        String content = result.getResponse().getContentAsString();
        assertTrue(content.contains("\"consecutiveDays\":1"),
                "Streak should reset to 1 after gap, got: " + content);
    }

    // ─────────────────────────────────────────
    // 5. First ever check-in
    // ─────────────────────────────────────────

    @Test
    void firstCheckInSetsConsecutiveDaysToOne() throws Exception {
        Tenant tenant = testDataHelper.tenant("edge_first").save();
        // New user with no lastCheckinDate (null), consecutiveDays = 0
        User user = testDataHelper.user(tenant.getId(), "13800820501", "Test@123").save();
        setTenantContext(tenant.getId());

        TimeSlotRule rule = testDataHelper.timeSlotRule(
                tenant.getId(), "全天",
                LocalTime.of(0, 0), LocalTime.of(23, 59)).save();

        String token = generateToken(user.getId(), tenant.getId(), List.of("user"));

        String json = "{\"ruleId\":" + rule.getId() + "}";
        MvcResult result = postJson("/api/checkin", json, token);

        assertSuccess(result);

        String content = result.getResponse().getContentAsString();
        assertTrue(content.contains("\"consecutiveDays\":1"),
                "First check-in should set consecutiveDays to 1, got: " + content);
    }

    // ─────────────────────────────────────────
    // 6. Invalid rule ID → error
    // ─────────────────────────────────────────

    @Test
    void invalidRuleIdReturnsError() throws Exception {
        Tenant tenant = testDataHelper.tenant("edge_invalid_rule").save();
        User user = testDataHelper.user(tenant.getId(), "13800820601", "Test@123").save();
        setTenantContext(tenant.getId());

        String token = generateToken(user.getId(), tenant.getId(), List.of("user"));

        String json = "{\"ruleId\":999999}";
        MvcResult result = postJson("/api/checkin", json, token);

        assertErrorCode(result, "POINT_RULE_NOT_FOUND");
    }

    // ─────────────────────────────────────────
    // 7. Today status - checked in
    // ─────────────────────────────────────────

    @Test
    void todayStatusAfterCheckIn() throws Exception {
        Tenant tenant = testDataHelper.tenant("edge_status").save();
        User user = testDataHelper.user(tenant.getId(), "13800820701", "Test@123").save();
        setTenantContext(tenant.getId());

        TimeSlotRule rule = testDataHelper.timeSlotRule(
                tenant.getId(), "全天",
                LocalTime.of(0, 0), LocalTime.of(23, 59)).save();

        String token = generateToken(user.getId(), tenant.getId(), List.of("user"));

        // Check in first
        String json = "{\"ruleId\":" + rule.getId() + "}";
        postJson("/api/checkin", json, token);

        // Then get today status
        MvcResult statusResult = getWithToken("/api/checkin/today", token);
        assertSuccess(statusResult);

        String content = statusResult.getResponse().getContentAsString();
        assertTrue(content.contains("\"success\":true"),
                "Today status should show already checked in");
    }

    // ─────────────────────────────────────────
    // 8. Records endpoint returns paginated results
    // ─────────────────────────────────────────

    @Test
    void recordsEndpointReturnsPaginatedResults() throws Exception {
        Tenant tenant = testDataHelper.tenant("edge_records").save();
        User user = testDataHelper.user(tenant.getId(), "13800820801", "Test@123").save();
        setTenantContext(tenant.getId());

        // Pre-create a check-in record
        TimeSlotRule rule = testDataHelper.timeSlotRule(
                tenant.getId(), "全天",
                LocalTime.of(0, 0), LocalTime.of(23, 59)).save();

        testDataHelper.checkInRecord(user.getId(), tenant.getId(), rule.getId(), LocalDate.now())
                .finalPoints(15).save();

        String token = generateToken(user.getId(), tenant.getId(), List.of("user"));

        MvcResult result = getWithToken("/api/checkin/records?page=1&size=10", token);
        assertSuccess(result);

        String content = result.getResponse().getContentAsString();
        assertTrue(content.contains("\"records\""), "Should contain records array");
    }
}
