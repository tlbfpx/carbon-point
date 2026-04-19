package com.carbonpoint.app.integration;

import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.mapper.UserMapper;
import com.carbonpoint.stair.entity.CheckInRecordEntity;
import com.carbonpoint.stair.entity.TimeSlotRule;
import com.carbonpoint.stair.mapper.CheckInRecordMapper;
import com.carbonpoint.stair.mapper.TimeSlotRuleMapper;
import com.carbonpoint.points.entity.PointRule;
import com.carbonpoint.points.mapper.PointRuleMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.carbonpoint.common.tenant.TenantContext;

/**
 * Integration tests for multi-tenant data isolation.
 *
 * <p>Verifies that:
 * <ul>
 *   <li>Tenant A cannot see Tenant B's users</li>
 *   <li>Tenant A cannot see Tenant B's check-in records</li>
 *   <li>Check-in API correctly uses tenant context</li>
 * </ul>
 */
class MultiTenantIsolationTest extends BaseIntegrationTest {

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private CheckInRecordMapper checkInRecordMapper;

    @Autowired
    private TimeSlotRuleMapper timeSlotRuleMapper;

    @Autowired
    private PointRuleMapper pointRuleMapper;

    // ─────────────────────────────────────────
    // 15.2.1 — Tenant A cannot see Tenant B data
    // ─────────────────────────────────────────

    @Test
    void testTenantACannotSeeTenantBUsers() throws Exception {
        // Create Tenant A and its user
        testDataHelper.tenant("租户A").id(101L).save();
        User userA = testDataHelper.user(101L, "13800000101", "Test@123")
                .id(101L)
                .nickname("租户A员工")
                .save();

        // Create Tenant B and its user
        testDataHelper.tenant("租户B").id(102L).save();
        User userB = testDataHelper.user(102L, "13800000102", "Test@123")
                .id(102L)
                .nickname("租户B员工")
                .save();

        // Tenant A authenticates
        setTenantContext(101L);
        String tokenA = generateToken(userA.getId(), 101L, List.of("admin"));

        // Tenant A queries user list
        MvcResult result = getWithToken("/api/users", tokenA);
        assertSuccess(result);

        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();

        // Content should include Tenant A's user but NOT Tenant B's user
        assertTrue(content.contains("租户A员工"), "Should contain Tenant A's user");
        assertFalse(content.contains("13800000102"), "Should NOT contain Tenant B's phone number");
    }

    // ─────────────────────────────────────────
    // 15.2.2 — Tenant A cannot see Tenant B check-in records
    // ─────────────────────────────────────────

    @Test
    void testTenantACannotSeeTenantBCheckInRecords() throws Exception {
        // Setup: Tenant C user and check-in
        testDataHelper.tenant("租户C").id(201L).save();
        User userC = testDataHelper.user(201L, "13800000201", "Test@123")
                .id(201L)
                .save();

        // Setup: Tenant D user and check-in
        testDataHelper.tenant("租户D").id(202L).save();
        User userD = testDataHelper.user(202L, "13800000202", "Test@123")
                .id(202L)
                .save();

        // Create check-in records for both tenants
        setTenantContext(201L);
        testDataHelper.checkInRecord(userC.getId(), 201L, 1L, LocalDate.now()).save();

        setTenantContext(202L);
        testDataHelper.checkInRecord(userD.getId(), 202L, 1L, LocalDate.now()).save();

        // Tenant C queries their own check-in records
        String tokenC = generateToken(userC.getId(), 201L, List.of("user"));
        setTenantContext(201L);
        MvcResult result = getWithToken("/api/checkin/records", tokenC);
        assertSuccess(result);

        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();

        // Should only see Tenant C's check-in, not Tenant D's
        assertFalse(content.contains("13800000202"),
                "Should NOT contain Tenant D's user phone");

        // Verify DB: tenant filter should only return tenant C records
        setTenantContext(201L);
        LambdaQueryWrapper<CheckInRecordEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(CheckInRecordEntity::getUserId, userC.getId());
        long countA = checkInRecordMapper.selectCount(wrapper);

        assertTrue(countA >= 1, "Tenant C should see their own check-in records");
    }

    // ─────────────────────────────────────────
    // 15.2.3 — Tenant context is enforced on write
    // ─────────────────────────────────────────

    @Test
    void testTenantContextEnforcedOnWrite() throws Exception {
        // Create Tenant E and user
        testDataHelper.tenant("租户E").id(301L).save();
        User userE = testDataHelper.user(301L, "13800000301", "Test@123")
                .id(301L)
                .save();

        // Create time slot rule and point rule for Tenant E
        long ruleId = 301L;
        TimeSlotRule tsRule = new TimeSlotRule();
        tsRule.setId(ruleId);
        tsRule.setTenantId(301L);
        tsRule.setName("全天时段");
        tsRule.setStartTime(LocalTime.of(0, 0));
        tsRule.setEndTime(LocalTime.of(23, 59));
        tsRule.setEnabled(true);
        TenantContext.setTenantId(301L);
        timeSlotRuleMapper.insert(tsRule);

        PointRule pr = new PointRule();
        pr.setId(ruleId);
        pr.setTenantId(301L);
        pr.setType("time_slot");
        pr.setName("全天时段");
        pr.setConfig("{\"startTime\":\"00:00\",\"endTime\":\"23:59:59\",\"minPoints\":10,\"maxPoints\":20}");
        pr.setEnabled(true);
        pr.setSortOrder(0);
        pointRuleMapper.insert(pr);

        String tokenE = generateToken(userE.getId(), 301L, List.of("user"));

        // Check-in as Tenant E
        String checkInJson = """
            {
                "ruleId": %d
            }
            """.formatted(ruleId);

        setTenantContext(301L);
        MvcResult result = postJson("/api/checkin", checkInJson, tokenE);
        assertSuccess(result);

        // Verify the check-in record has the correct tenant ID
        setTenantContext(301L);
        LambdaQueryWrapper<CheckInRecordEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(CheckInRecordEntity::getUserId, userE.getId());
        CheckInRecordEntity record = checkInRecordMapper.selectOne(wrapper);

        assertNotNull(record, "Check-in record should exist");
        assertEquals(301L, record.getTenantId(),
                "Check-in record tenant ID should match current tenant context");
    }

    // ─────────────────────────────────────────
    // 15.2.4 — Cross-tenant access returns empty/403
    // ─────────────────────────────────────────

    @Test
    void testCrossTenantAccessRejected() throws Exception {
        // Tenant F user tries to access Tenant G's data
        testDataHelper.tenant("租户F").id(401L).save();
        User userF = testDataHelper.user(401L, "13800000401", "Test@123")
                .id(401L)
                .save();

        testDataHelper.tenant("租户G").id(402L).save();
        User userG = testDataHelper.user(402L, "13800000402", "Test@123")
                .id(402L)
                .save();

        // User F tries to query User G's profile directly
        String tokenF = generateToken(userF.getId(), 401L, List.of("user"));
        setTenantContext(401L);
        MvcResult result = getWithToken("/api/users/" + userG.getId(), tokenF);

        // Should either return 403 Forbidden or 404 Not Found
        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();
        int status = result.getResponse().getStatus();
        assertTrue(
                status == 403 || status == 404 || content.contains("\"code\":403") || content.contains("\"code\":404"),
                "Cross-tenant access should be rejected (got status " + status + ", content: " + content + ")"
        );
    }

    @Autowired
    private TestDataHelper testDataHelper;
}
