package com.carbonpoint.points.service;

import com.carbonpoint.points.BaseIntegrationTest;
import com.carbonpoint.points.LevelConstants;
import com.carbonpoint.points.dto.PointCalcResult;
import com.carbonpoint.points.entity.PointRule;
import com.carbonpoint.points.mapper.PointRuleMapper;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.system.entity.Tenant;
import com.carbonpoint.system.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

import static org.junit.jupiter.api.Assertions.*;

class PointEngineServiceTest extends BaseIntegrationTest {

    @Autowired
    private PointEngineService pointEngineService;

    @Autowired
    private PointRuleMapper pointRuleMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private LevelService levelService;

    // ─────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────

    private PointRule createTimeSlotRule(Long tenantId, int minPoints, int maxPoints) {
        PointRule rule = new PointRule();
        rule.setTenantId(tenantId);
        rule.setType("time_slot");
        rule.setName("全天时段");
        rule.setEnabled(true);
        rule.setSortOrder(1);
        rule.setConfig(String.format(
                "{\"startTime\":\"00:00\",\"endTime\":\"23:59\",\"minPoints\":%d,\"maxPoints\":%d}",
                minPoints, maxPoints));
        pointRuleMapper.insert(rule);
        return rule;
    }

    private PointRule createDailyCapRule(Long tenantId, int dailyLimit) {
        PointRule rule = new PointRule();
        rule.setTenantId(tenantId);
        rule.setType("daily_cap");
        rule.setName("每日上限");
        rule.setEnabled(true);
        rule.setSortOrder(10);
        rule.setConfig(String.format("{\"dailyLimit\":%d}", dailyLimit));
        pointRuleMapper.insert(rule);
        return rule;
    }

    private PointRule createSpecialDateRule(Long tenantId, String datesJson, double multiplier) {
        PointRule rule = new PointRule();
        rule.setTenantId(tenantId);
        rule.setType("special_date");
        rule.setName("特殊日期");
        rule.setEnabled(true);
        rule.setSortOrder(5);
        rule.setConfig(String.format("{\"dates\":%s,\"multiplier\":%.1f}", datesJson, multiplier));
        pointRuleMapper.insert(rule);
        return rule;
    }

    private PointRule createWeeklySpecialDateRule(Long tenantId, int dayOfWeek, double multiplier) {
        PointRule rule = new PointRule();
        rule.setTenantId(tenantId);
        rule.setType("special_date");
        rule.setName("每周特殊日");
        rule.setEnabled(true);
        rule.setSortOrder(5);
        rule.setConfig(String.format(
                "{\"recurring\":\"WEEKLY\",\"dayOfWeek\":%d,\"multiplier\":%.1f}", dayOfWeek, multiplier));
        pointRuleMapper.insert(rule);
        return rule;
    }

    private PointRule createStreakRule(Long tenantId, int days, int bonusPoints) {
        PointRule rule = new PointRule();
        rule.setTenantId(tenantId);
        rule.setType("streak");
        rule.setName(String.format("连续%d天", days));
        rule.setEnabled(true);
        rule.setSortOrder(20);
        rule.setConfig(String.format("{\"days\":%d,\"bonusPoints\":%d}", days, bonusPoints));
        pointRuleMapper.insert(rule);
        return rule;
    }

    // ─────────────────────────────────────────
    // 1. Base points within min-max range
    // ─────────────────────────────────────────

    @Test
    void basePointsWithinTimeSlotRange() {
        Tenant tenant = createTestTenant("engine_base");
        User user = createTestUser(tenant.getId(), "13800910101", "Test@123");

        setTenantContext(tenant.getId());
        PointRule rule = createTimeSlotRule(tenant.getId(), 10, 20);

        PointCalcResult result = pointEngineService.calculate(user.getId(), rule.getId(), 1);

        assertTrue(result.getBasePoints() >= 10, "Base points should be >= min (10)");
        assertTrue(result.getBasePoints() <= 20, "Base points should be <= max (20)");
        assertTrue(result.getFinalPoints() > 0, "Final points should be positive");
    }

    // ─────────────────────────────────────────
    // 2. Special date multiplier (today)
    // ─────────────────────────────────────────

    @Test
    void specialDateMultiplierAppliesForToday() {
        Tenant tenant = createTestTenant("engine_special");
        User user = createTestUser(tenant.getId(), "13800910201", "Test@123");

        setTenantContext(tenant.getId());
        PointRule timeSlot = createTimeSlotRule(tenant.getId(), 15, 15);

        String today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE);
        createSpecialDateRule(tenant.getId(), "[\"" + today + "\"]", 3.0);

        PointCalcResult result = pointEngineService.calculate(user.getId(), timeSlot.getId(), 1);

        assertEquals(15, result.getBasePoints());
        assertEquals(3.0, result.getMultiplierRate(), 0.01, "Should apply 3x special date multiplier");
        assertEquals(45, result.getFinalPoints(), "15 * 3.0 * 1.0 = 45");
    }

    // ─────────────────────────────────────────
    // 3. Weekly recurring multiplier
    // ─────────────────────────────────────────

    @Test
    void weeklyRecurringMultiplierAppliesForToday() {
        Tenant tenant = createTestTenant("engine_weekly");
        User user = createTestUser(tenant.getId(), "13800910301", "Test@123");

        setTenantContext(tenant.getId());
        PointRule timeSlot = createTimeSlotRule(tenant.getId(), 10, 10);

        int todayDayOfWeek = LocalDate.now().getDayOfWeek().getValue();
        createWeeklySpecialDateRule(tenant.getId(), todayDayOfWeek, 2.0);

        PointCalcResult result = pointEngineService.calculate(user.getId(), timeSlot.getId(), 1);

        assertEquals(10, result.getBasePoints());
        assertEquals(2.0, result.getMultiplierRate(), 0.01, "Should apply 2x weekly multiplier");
    }

    @Test
    void weeklyRecurringMultiplierDoesNotApplyForWrongDay() {
        Tenant tenant = createTestTenant("engine_weekly_off");
        User user = createTestUser(tenant.getId(), "13800910302", "Test@123");

        setTenantContext(tenant.getId());
        PointRule timeSlot = createTimeSlotRule(tenant.getId(), 10, 10);

        int todayDayOfWeek = LocalDate.now().getDayOfWeek().getValue();
        int wrongDay = (todayDayOfWeek % 7) + 1;
        createWeeklySpecialDateRule(tenant.getId(), wrongDay, 2.0);

        PointCalcResult result = pointEngineService.calculate(user.getId(), timeSlot.getId(), 1);

        assertEquals(10, result.getBasePoints());
        assertEquals(1.0, result.getMultiplierRate(), 0.01, "Should NOT apply multiplier for wrong day");
    }

    // ─────────────────────────────────────────
    // 4. Level coefficient
    // ─────────────────────────────────────────

    @Test
    void levelCoefficientAppliedCorrectly() {
        Tenant tenant = createTestTenant("engine_level");
        double[] expectedCoefficients = {1.0, 1.2, 1.5, 2.0, 2.5};

        for (int level = 1; level <= 5; level++) {
            User user = createTestUser(tenant.getId(), "1380091040" + level, "Test@123");
            setTenantContext(tenant.getId());
            PointRule rule = createTimeSlotRule(tenant.getId(), 10, 10);

            PointCalcResult result = pointEngineService.calculate(user.getId(), rule.getId(), level);

            assertEquals(expectedCoefficients[level - 1], result.getLevelMultiplier(), 0.001,
                    "Lv." + level + " coefficient mismatch");
        }
    }

    // ─────────────────────────────────────────
    // 5. Rounding
    // ─────────────────────────────────────────

    @Test
    void resultIsRoundedToInteger() {
        Tenant tenant = createTestTenant("engine_round");
        User user = createTestUser(tenant.getId(), "13800910501", "Test@123");

        setTenantContext(tenant.getId());
        PointRule rule = createTimeSlotRule(tenant.getId(), 17, 17);

        PointCalcResult result = pointEngineService.calculate(user.getId(), rule.getId(), 2);

        assertEquals(17, result.getBasePoints());
        // 17 * 1.0 * 1.2 = 20.4 → rounds to 20
        assertEquals(20, result.getFinalPoints(), "17 * 1.2 = 20.4 → rounds to 20");
    }

    // ─────────────────────────────────────────
    // 6. Daily cap truncation
    // ─────────────────────────────────────────

    @Test
    void dailyCapTruncatesPoints() {
        Tenant tenant = createTestTenant("engine_cap");
        User user = createTestUser(tenant.getId(), "13800910601", "Test@123");
        setTenantContext(tenant.getId());

        PointRule timeSlot = createTimeSlotRule(tenant.getId(), 12, 12);
        createDailyCapRule(tenant.getId(), 100);

        // Pre-insert a check_in_record with 95 final_points today
        String today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE);
        jdbcTemplate.execute(String.format(
                "INSERT INTO check_in_records (user_id, tenant_id, time_slot_rule_id, checkin_date, " +
                "checkin_time, base_points, final_points, multiplier, level_coefficient, consecutive_days, streak_bonus, deleted) " +
                "VALUES (%d, %d, %d, '%s', NOW(), 10, 95, 1.0, 1.0, 1, 0, 0)",
                user.getId(), tenant.getId(), timeSlot.getId(), today));

        PointCalcResult result = pointEngineService.calculate(user.getId(), timeSlot.getId(), 1);

        // 12 base, Lv.1 → 12 * 1.0 = 12. Daily awarded = 95, cap = 100.
        // max(0, 100 - 95) = 5
        assertTrue(result.isDailyCapHit(), "Should hit daily cap");
        assertEquals(5, result.getFinalPoints(), "Should truncate to 5 (100 - 95)");
    }

    // ─────────────────────────────────────────
    // 7. Level promotion
    // ─────────────────────────────────────────

    @Test
    void levelPromotionOnThresholdCrossing() {
        Tenant tenant = createTestTenant("engine_promote");
        User user = createTestUser(tenant.getId(), "13800910701", "Test@123");

        setTenantContext(tenant.getId());
        user.setTotalPoints(950);
        user.setAvailablePoints(950);
        user.setLevel(1);
        userMapper.updateById(user);

        levelService.promoteIfNeeded(user.getId(), 1050);

        User updated = userMapper.selectById(user.getId());
        assertEquals(2, updated.getLevel(), "Should be promoted to Lv.2 Silver at 1050 total points");
    }

    // ─────────────────────────────────────────
    // 8. Streak reward
    // ─────────────────────────────────────────

    @Test
    void streakBonusAwardedAtMilestone() {
        Tenant tenant = createTestTenant("engine_streak");
        User user = createTestUser(tenant.getId(), "13800910801", "Test@123");
        setTenantContext(tenant.getId());

        createStreakRule(tenant.getId(), 7, 200);

        pointEngineService.checkAndAwardStreakReward(user.getId(), 7);

        User updated = userMapper.selectById(user.getId());
        assertNotNull(updated);
        assertEquals(200, updated.getAvailablePoints(), "Should award 200 streak bonus");
        assertEquals(200, updated.getTotalPoints());
    }

    @Test
    void streakBonusNotAwardedBelowMilestone() {
        Tenant tenant = createTestTenant("engine_streak_off");
        User user = createTestUser(tenant.getId(), "13800910802", "Test@123");
        setTenantContext(tenant.getId());

        createStreakRule(tenant.getId(), 7, 200);

        pointEngineService.checkAndAwardStreakReward(user.getId(), 6);

        User updated = userMapper.selectById(user.getId());
        assertNotNull(updated);
        assertEquals(0, updated.getAvailablePoints(), "Should NOT award at 6 days (milestone is 7)");
    }

    // ─────────────────────────────────────────
    // 9. LevelConstants
    // ─────────────────────────────────────────

    @Test
    void levelConstantsCorrectness() {
        assertEquals("青铜", LevelConstants.getName(1));
        assertEquals("白银", LevelConstants.getName(2));
        assertEquals("黄金", LevelConstants.getName(3));
        assertEquals("铂金", LevelConstants.getName(4));
        assertEquals("钻石", LevelConstants.getName(5));

        assertEquals(1, LevelConstants.getLevelByPoints(0));
        assertEquals(1, LevelConstants.getLevelByPoints(999));
        assertEquals(2, LevelConstants.getLevelByPoints(1000));
        assertEquals(3, LevelConstants.getLevelByPoints(5000));
        assertEquals(4, LevelConstants.getLevelByPoints(20000));
        assertEquals(5, LevelConstants.getLevelByPoints(50000));
    }
}
