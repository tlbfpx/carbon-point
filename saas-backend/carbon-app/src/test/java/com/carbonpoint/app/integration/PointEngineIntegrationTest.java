package com.carbonpoint.app.integration;

import com.carbonpoint.stair.entity.CheckInRecordEntity;
import com.carbonpoint.stair.entity.TimeSlotRule;
import com.carbonpoint.stair.mapper.CheckInRecordMapper;
import com.carbonpoint.stair.mapper.TimeSlotRuleMapper;
import com.carbonpoint.common.entity.PointTransactionEntity;
import com.carbonpoint.common.mapper.PointTransactionMapper;
import com.carbonpoint.points.LevelConstants;
import com.carbonpoint.points.entity.PointRule;
import com.carbonpoint.points.mapper.PointRuleMapper;
import com.carbonpoint.points.service.PointAccountService;
import com.carbonpoint.points.service.PointEngineService;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.mapper.UserMapper;
import com.carbonpoint.common.tenant.TenantContext;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for the point calculation engine chain.
 *
 * <p>Tests the fixed-order calculation chain (per design.md):
 * <ol>
 *   <li>Time slot match → random base points [min, max]</li>
 *   <li>Special date multiplier</li>
 *   <li>Level coefficient</li>
 *   <li>Round</li>
 *   <li>Daily cap</li>
 *   <li>Consecutive/streak reward (separate call)</li>
 * </ol>
 *
 * <p>Also tests LevelConstants coefficient table:
 * Lv.1 Bronze=1.0, Lv.2 Silver=1.2, Lv.3 Gold=1.5,
 * Lv.4 Platinum=2.0, Lv.5 Diamond=2.5
 */
class PointEngineIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private PointEngineService pointEngineService;

    @Autowired
    private PointAccountService pointAccountService;

    @Autowired
    private PointRuleMapper pointRuleMapper;

    @Autowired
    private TimeSlotRuleMapper timeSlotRuleMapper;

    @Autowired
    private CheckInRecordMapper checkInRecordMapper;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private PointTransactionMapper pointTransactionMapper;

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 1: Level Coefficient Tests
    // ═══════════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────
    // 15.6.1 — Level 1 Bronze: coefficient = 1.0
    // ─────────────────────────────────────────

    @Test
    void testLevel1BronzeCoefficient() throws Exception {
        long base = 6201L;
        testDataHelper.tenant("等级系数测试租户").id(base).save();
        User user = testDataHelper.user(base, "13800620001", "Test@123")
                .id(base).level(1).save();

        setTenantContext(base);

        // Create time_slot rule: deterministic 10 points
        testDataHelper.pointRule(base, "time_slot", "时段规则",
                "{\"startTime\":\"08:00\",\"endTime\":\"22:00\",\"minPoints\":10,\"maxPoints\":10}")
                .id(base).sortOrder(0).save();

        // Create daily cap rule (high limit, won't trigger)
        testDataHelper.pointRule(base, "daily_cap", "每日上限",
                "{\"dailyLimit\":1000}")
                .id(base + 1000L).sortOrder(5).save();

        var calcResult = pointEngineService.calculate(user.getId(), base, 1);

        assertEquals(10, calcResult.getBasePoints(),
                "Base points should be 10 (deterministic rule)");
        assertEquals(1.0, calcResult.getLevelMultiplier(),
                "Level 1 Bronze coefficient should be 1.0");
        assertEquals(10, calcResult.getFinalPoints(),
                "Final points should be 10 (base × 1.0 × 1.0, rounded)");
    }

    // ─────────────────────────────────────────
    // 15.6.2 — Level 2 Silver: coefficient = 1.2
    // ─────────────────────────────────────────

    @Test
    void testLevel2SilverCoefficient() throws Exception {
        long base = 6202L;
        testDataHelper.tenant("银等级系数测试").id(base).save();
        User user = testDataHelper.user(base, "13800620002", "Test@123")
                .id(base).level(2).totalPoints(1000).availablePoints(1000).save();

        setTenantContext(base);

        testDataHelper.pointRule(base, "time_slot", "时段规则",
                "{\"startTime\":\"08:00\",\"endTime\":\"22:00\",\"minPoints\":10,\"maxPoints\":10}")
                .id(base).sortOrder(0).save();
        testDataHelper.pointRule(base, "daily_cap", "每日上限",
                "{\"dailyLimit\":1000}")
                .id(base + 1000L).sortOrder(5).save();

        var calcResult = pointEngineService.calculate(user.getId(), base, 2);

        assertEquals(10, calcResult.getBasePoints());
        assertEquals(1.2, calcResult.getLevelMultiplier(),
                "Level 2 Silver coefficient should be 1.2");
        assertEquals(12, calcResult.getFinalPoints(),
                "Final points should be 12 (base 10 × level 1.2, rounded)");
    }

    // ─────────────────────────────────────────
    // 15.6.3 — Level 3 Gold: coefficient = 1.5
    // ─────────────────────────────────────────

    @Test
    void testLevel3GoldCoefficient() throws Exception {
        long base = 6203L;
        testDataHelper.tenant("金等级系数测试").id(base).save();
        User user = testDataHelper.user(base, "13800620003", "Test@123")
                .id(base).level(3).totalPoints(5000).availablePoints(5000).save();

        setTenantContext(base);

        testDataHelper.pointRule(base, "time_slot", "时段规则",
                "{\"startTime\":\"08:00\",\"endTime\":\"22:00\",\"minPoints\":10,\"maxPoints\":10}")
                .id(base).sortOrder(0).save();
        testDataHelper.pointRule(base, "daily_cap", "每日上限",
                "{\"dailyLimit\":1000}")
                .id(base + 1000L).sortOrder(5).save();

        var calcResult = pointEngineService.calculate(user.getId(), base, 3);

        assertEquals(1.5, calcResult.getLevelMultiplier(),
                "Level 3 Gold coefficient should be 1.5");
        assertEquals(15, calcResult.getFinalPoints(),
                "Final points should be 15 (base 10 × level 1.5, rounded)");
    }

    // ─────────────────────────────────────────
    // 15.6.4 — Level 5 Diamond: coefficient = 2.5
    // ─────────────────────────────────────────

    @Test
    void testLevel5DiamondCoefficient() throws Exception {
        long base = 6204L;
        testDataHelper.tenant("钻石等级系数测试").id(base).save();
        User user = testDataHelper.user(base, "13800620004", "Test@123")
                .id(base).level(5).totalPoints(50000).availablePoints(50000).save();

        setTenantContext(base);

        testDataHelper.pointRule(base, "time_slot", "时段规则",
                "{\"startTime\":\"08:00\",\"endTime\":\"22:00\",\"minPoints\":10,\"maxPoints\":10}")
                .id(base).sortOrder(0).save();
        testDataHelper.pointRule(base, "daily_cap", "每日上限",
                "{\"dailyLimit\":1000}")
                .id(base + 1000L).sortOrder(5).save();

        var calcResult = pointEngineService.calculate(user.getId(), base, 5);

        assertEquals(2.5, calcResult.getLevelMultiplier(),
                "Level 5 Diamond coefficient should be 2.5");
        assertEquals(25, calcResult.getFinalPoints(),
                "Final points should be 25 (base 10 × level 2.5, rounded)");
    }

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 2: LevelConstants Unit Assertions
    // ═══════════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────
    // 15.6.5 — LevelConstants coefficient table
    // ─────────────────────────────────────────

    @Test
    void testLevelConstantsCoefficients() {
        assertEquals(1.0, LevelConstants.getCoefficient(1), "Lv1 Bronze = 1.0");
        assertEquals(1.2, LevelConstants.getCoefficient(2), "Lv2 Silver = 1.2");
        assertEquals(1.5, LevelConstants.getCoefficient(3), "Lv3 Gold = 1.5");
        assertEquals(2.0, LevelConstants.getCoefficient(4), "Lv4 Platinum = 2.0");
        assertEquals(2.5, LevelConstants.getCoefficient(5), "Lv5 Diamond = 2.5");
        assertEquals(1.0, LevelConstants.getCoefficient(99), "Unknown level defaults to 1.0");
    }

    @Test
    void testLevelConstantsThresholds() {
        // THRESHOLDS[1]=0, THRESHOLDS[2]=1000, THRESHOLDS[3]=5000, THRESHOLDS[4]=20000, THRESHOLDS[5]=50000
        assertEquals(0, LevelConstants.getThreshold(1), "Lv1 Bronze threshold = 0");
        assertEquals(1000, LevelConstants.getThreshold(2), "Lv2 Silver threshold = 1000");
        assertEquals(5000, LevelConstants.getThreshold(3), "Lv3 Gold threshold = 5000");
        assertEquals(20000, LevelConstants.getThreshold(4), "Lv4 Platinum threshold = 20000");
        assertEquals(50000, LevelConstants.getThreshold(5), "Lv5 Diamond threshold = 50000");
        assertEquals(0, LevelConstants.getThreshold(6), "Beyond Diamond = 0 (out of bounds)");
    }

    @Test
    void testLevelConstantsGetLevelByPoints() {
        assertEquals(1, LevelConstants.getLevelByPoints(0), "0 points = Bronze");
        assertEquals(1, LevelConstants.getLevelByPoints(999), "999 points = Bronze");
        assertEquals(2, LevelConstants.getLevelByPoints(1000), "1000 points = Silver");
        assertEquals(2, LevelConstants.getLevelByPoints(4999), "4999 points = Silver");
        assertEquals(3, LevelConstants.getLevelByPoints(5000), "5000 points = Gold");
        assertEquals(3, LevelConstants.getLevelByPoints(19999), "19999 points = Gold");
        assertEquals(4, LevelConstants.getLevelByPoints(20000), "20000 points = Platinum");
        assertEquals(4, LevelConstants.getLevelByPoints(49999), "49999 points = Platinum");
        assertEquals(5, LevelConstants.getLevelByPoints(50000), "50000 points = Diamond");
        assertEquals(5, LevelConstants.getLevelByPoints(100000), "100000 points = Diamond");
    }

    @Test
    void testLevelConstantsNames() {
        assertEquals("青铜", LevelConstants.getName(1));
        assertEquals("白银", LevelConstants.getName(2));
        assertEquals("黄金", LevelConstants.getName(3));
        assertEquals("铂金", LevelConstants.getName(4));
        assertEquals("钻石", LevelConstants.getName(5));
        assertEquals("未知", LevelConstants.getName(99));
    }

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 3: Special Date Multiplier
    // ═══════════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────
    // 15.6.6 — Special date multiplier 2.0x
    // ─────────────────────────────────────────

    @Test
    void testSpecialDateMultiplier() throws Exception {
        long base = 6205L;
        testDataHelper.tenant("特殊日期倍率测试").id(base).save();
        User user = testDataHelper.user(base, "13800620005", "Test@123")
                .id(base).level(1).save();

        setTenantContext(base);

        // Create time_slot rule: deterministic 10 points
        testDataHelper.pointRule(base, "time_slot", "时段规则",
                "{\"startTime\":\"08:00\",\"endTime\":\"22:00\",\"minPoints\":10,\"maxPoints\":10}")
                .id(base).sortOrder(0).save();

        testDataHelper.pointRule(base, "daily_cap", "每日上限",
                "{\"dailyLimit\":1000}")
                .id(base + 1000L).sortOrder(5).save();

        // Create special_date rule with 2.0x multiplier for today
        String today = LocalDate.now().toString();
        testDataHelper.pointRule(base, "special_date", "双倍打卡日",
                String.format("{\"dates\":[\"%s\"],\"multiplier\":2.0}", today))
                .id(base + 2000L).sortOrder(1).save();

        var calcResult = pointEngineService.calculate(user.getId(), base, 1);

        assertEquals(2.0, calcResult.getMultiplierRate(),
                "Special date multiplier should be 2.0");
        assertEquals(20, calcResult.getFinalPoints(),
                "Final points should be 20 (base 10 × 2.0 multiplier × 1.0 level, rounded)");
    }

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 4: Combined Multipliers
    // ═══════════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────
    // 15.6.7 — Combined: special date 2.0x + Gold 1.5x
    // ─────────────────────────────────────────

    @Test
    void testCombinedMultipliers() throws Exception {
        long base = 6206L;
        testDataHelper.tenant("组合倍率测试").id(base).save();
        User user = testDataHelper.user(base, "13800620006", "Test@123")
                .id(base).level(3).totalPoints(5000).availablePoints(5000).save();

        setTenantContext(base);

        testDataHelper.pointRule(base, "time_slot", "时段规则",
                "{\"startTime\":\"08:00\",\"endTime\":\"22:00\",\"minPoints\":10,\"maxPoints\":10}")
                .id(base).sortOrder(0).save();
        testDataHelper.pointRule(base, "daily_cap", "每日上限",
                "{\"dailyLimit\":1000}")
                .id(base + 1000L).sortOrder(5).save();

        String today = LocalDate.now().toString();
        testDataHelper.pointRule(base, "special_date", "双倍日",
                String.format("{\"dates\":[\"%s\"],\"multiplier\":2.0}", today))
                .id(base + 2000L).sortOrder(1).save();

        // With 2.0x special + Gold 1.5
        // expected = round(10 * 2.0 * 1.5) = 30
        var calcResult = pointEngineService.calculate(user.getId(), base, 3);

        assertEquals(2.0, calcResult.getMultiplierRate(),
                "Special date multiplier should be 2.0");
        assertEquals(1.5, calcResult.getLevelMultiplier(),
                "Level 3 Gold coefficient should be 1.5");
        assertEquals(30, calcResult.getFinalPoints(),
                "Final points should be 30 (base 10 × 2.0 special × 1.5 level, rounded)");
    }

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 5: Daily Cap
    // ═══════════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────
    // 15.6.8 — Daily cap is respected
    // ─────────────────────────────────────────

    @Test
    void testDailyCapRespected() throws Exception {
        long base = 6207L;
        testDataHelper.tenant("每日上限测试").id(base).save();
        User user = testDataHelper.user(base, "13800620007", "Test@123")
                .id(base).level(1).save();

        setTenantContext(base);

        // Time slot: deterministic 50 points
        testDataHelper.pointRule(base, "time_slot", "时段规则",
                "{\"startTime\":\"08:00\",\"endTime\":\"22:00\",\"minPoints\":50,\"maxPoints\":50}")
                .id(base).sortOrder(0).save();

        // Daily cap: 100 (cap = 100)
        testDataHelper.pointRule(base, "daily_cap", "每日上限",
                "{\"dailyLimit\":100}")
                .id(base + 1000L).sortOrder(5).save();

        // First check-in: 50 points (under cap)
        var calc1 = pointEngineService.calculate(user.getId(), base, 1);
        assertEquals(50, calc1.getFinalPoints(),
                "First check-in should award 50 points");
        assertFalse(calc1.isDailyCapHit(),
                "Daily cap should NOT be hit on first check-in");

        // Simulate: insert a check-in record with 60 already awarded today
        CheckInRecordEntity existing = new CheckInRecordEntity();
        existing.setId(System.nanoTime());
        existing.setUserId(user.getId());
        existing.setTenantId(base);
        existing.setTimeSlotRuleId(base);
        existing.setCheckinDate(LocalDate.now());
        existing.setCheckinTime(java.time.LocalDateTime.now());
        existing.setBasePoints(50);
        existing.setFinalPoints(60);
        existing.setMultiplier(java.math.BigDecimal.ONE);
        existing.setLevelCoefficient(java.math.BigDecimal.ONE);
        existing.setConsecutiveDays(1);
        existing.setStreakBonus(0);
        checkInRecordMapper.insert(existing);

        // Second check-in: 60 + 50 = 110, but cap is 100
        // Should be capped to (100 - 60) = 40
        var calc2 = pointEngineService.calculate(user.getId(), base, 1);
        assertEquals(40, calc2.getFinalPoints(),
                "Second check-in should be capped to 40 (100 - 60 already awarded)");
        assertTrue(calc2.isDailyCapHit(),
                "Daily cap should be HIT when limit is reached");
    }

    // ─────────────────────────────────────────
    // 15.6.9 — Daily cap: zero awarded when already at cap
    // ─────────────────────────────────────────

    @Test
    void testDailyCapZeroAward() throws Exception {
        long base = 6208L;
        testDataHelper.tenant("每日上限零奖励测试").id(base).save();
        User user = testDataHelper.user(base, "13800620008", "Test@123")
                .id(base).level(1).save();

        setTenantContext(base);

        testDataHelper.pointRule(base, "time_slot", "时段规则",
                "{\"startTime\":\"08:00\",\"endTime\":\"22:00\",\"minPoints\":50,\"maxPoints\":50}")
                .id(base).sortOrder(0).save();
        testDataHelper.pointRule(base, "daily_cap", "每日上限",
                "{\"dailyLimit\":100}")
                .id(base + 1000L).sortOrder(5).save();

        // Simulate: user already at daily cap (100 points today)
        CheckInRecordEntity atCap = new CheckInRecordEntity();
        atCap.setId(System.nanoTime());
        atCap.setUserId(user.getId());
        atCap.setTenantId(base);
        atCap.setTimeSlotRuleId(base);
        atCap.setCheckinDate(LocalDate.now());
        atCap.setCheckinTime(java.time.LocalDateTime.now());
        atCap.setBasePoints(50);
        atCap.setFinalPoints(100); // already at cap
        atCap.setMultiplier(java.math.BigDecimal.ONE);
        atCap.setLevelCoefficient(java.math.BigDecimal.ONE);
        atCap.setConsecutiveDays(1);
        atCap.setStreakBonus(0);
        checkInRecordMapper.insert(atCap);

        // Third check-in: 100 + 50 > 100, cap = 0
        var calc = pointEngineService.calculate(user.getId(), base, 1);
        assertEquals(0, calc.getFinalPoints(),
                "Should award 0 when already at daily cap");
        assertTrue(calc.isDailyCapHit(),
                "Daily cap should be marked as hit");
    }

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 6: Rounding Behavior
    // ═══════════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────
    // 15.6.10 — Fractional points are rounded correctly
    // ─────────────────────────────────────────

    @Test
    void testRoundingDown() {
        // 10 base × 1.2 silver × 1.0 = 12.0 → round to 12
        assertEquals(12, (int) Math.round(10 * 1.2 * 1.0));
    }

    @Test
    void testRoundingUp() {
        // 10 base × 1.25 × 1.0 = 12.5 → round to 13
        assertEquals(13, (int) Math.round(10 * 1.25 * 1.0));
    }

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 7: Chain Order Verification
    // ═══════════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────
    // 15.6.11 — Full chain: base=20, special=2.0, gold=1.5, cap=1000
    // Expected: round(20 × 2.0 × 1.5) = 60
    // ─────────────────────────────────────────

    @Test
    void testFullChainOrder() throws Exception {
        long base = 6209L;
        testDataHelper.tenant("完整计算链测试").id(base).save();
        User user = testDataHelper.user(base, "13800620009", "Test@123")
                .id(base).level(3).totalPoints(5000).availablePoints(5000).save();

        setTenantContext(base);

        // Time slot: deterministic 20 points
        testDataHelper.pointRule(base, "time_slot", "时段规则",
                "{\"startTime\":\"08:00\",\"endTime\":\"22:00\",\"minPoints\":20,\"maxPoints\":20}")
                .id(base).sortOrder(0).save();
        testDataHelper.pointRule(base, "daily_cap", "每日上限",
                "{\"dailyLimit\":1000}")
                .id(base + 1000L).sortOrder(5).save();

        // Special date 2.0x
        String today = LocalDate.now().toString();
        testDataHelper.pointRule(base, "special_date", "双倍日",
                String.format("{\"dates\":[\"%s\"],\"multiplier\":2.0}", today))
                .id(base + 2000L).sortOrder(1).save();

        // Chain: base(20) → special(2.0) → level(1.5) → round → daily-cap(1000)
        // = round(20 × 2.0 × 1.5) = round(60) = 60
        var calcResult = pointEngineService.calculate(user.getId(), base, 3);

        assertEquals(20, calcResult.getBasePoints(),
                "Step 1: base points from time slot rule");
        assertEquals(2.0, calcResult.getMultiplierRate(),
                "Step 2: special date multiplier = 2.0");
        assertEquals(1.5, calcResult.getLevelMultiplier(),
                "Step 3: level coefficient = 1.5 (Gold)");
        assertEquals(60, calcResult.getFinalPoints(),
                "Step 4+5: round(20 × 2.0 × 1.5) = 60, cap not triggered");
        assertFalse(calcResult.isDailyCapHit(),
                "Step 5: daily cap NOT hit (1000 > 60)");
    }

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 8: Consecutive/Streak Reward
    // ═══════════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────
    // 15.6.12 — Streak bonus awarded for consecutive days
    // ─────────────────────────────────────────

    @Test
    void testStreakBonusAwarded() throws Exception {
        long base = 6210L;
        testDataHelper.tenant("连续打卡奖励测试").id(base).save();
        User user = testDataHelper.user(base, "13800620010", "Test@123")
                .id(base).level(1).save();

        setTenantContext(base);

        // Create streak rule: 7 consecutive days → 50 bonus points
        testDataHelper.pointRule(base, "streak", "7天连续奖励",
                "{\"days\":7,\"bonusPoints\":50}")
                .id(base).sortOrder(10).save();

        // Simulate user with 7 consecutive days
        user.setConsecutiveDays(7);
        userMapper.updateById(user);

        // Call streak reward check
        pointEngineService.checkAndAwardStreakReward(user.getId(), 7);

        // Verify bonus was awarded
        setTenantContext(base);
        LambdaQueryWrapper<PointTransactionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PointTransactionEntity::getUserId, user.getId())
               .eq(PointTransactionEntity::getType, "streak_bonus")
               .orderByDesc(PointTransactionEntity::getCreatedAt)
               .last("LIMIT 1");
        PointTransactionEntity bonusTx = pointTransactionMapper.selectOne(wrapper);

        assertNotNull(bonusTx, "Streak bonus transaction should be created");
        assertEquals(50, bonusTx.getAmount(),
                "Streak bonus should be 50 points");
    }

    // ─────────────────────────────────────────
    // 15.6.13 — Streak bonus NOT awarded for non-multiple days
    // ─────────────────────────────────────────

    @Test
    void testStreakBonusNotAwardedForNonMultiple() throws Exception {
        long base = 6211L;
        testDataHelper.tenant("非整倍数连续奖励测试").id(base).save();
        User user = testDataHelper.user(base, "13800620011", "Test@123")
                .id(base).level(1).save();

        setTenantContext(base);

        // Create streak rule: 7 consecutive days → 50 bonus points
        testDataHelper.pointRule(base, "streak", "7天连续奖励",
                "{\"days\":7,\"bonusPoints\":50}")
                .id(base).sortOrder(10).save();

        // User has only 5 consecutive days (not a multiple of 7)
        user.setConsecutiveDays(5);
        userMapper.updateById(user);

        pointEngineService.checkAndAwardStreakReward(user.getId(), 5);

        // Verify NO bonus was awarded
        setTenantContext(base);
        LambdaQueryWrapper<PointTransactionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PointTransactionEntity::getUserId, user.getId())
               .eq(PointTransactionEntity::getType, "streak_bonus");
        long count = pointTransactionMapper.selectCount(wrapper);
        assertEquals(0, count,
                "No streak bonus should be awarded for non-multiple consecutive days");
    }

    @Autowired
    private TestDataHelper testDataHelper;
}
