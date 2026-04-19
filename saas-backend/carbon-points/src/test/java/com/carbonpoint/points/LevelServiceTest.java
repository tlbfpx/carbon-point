package com.carbonpoint.points;

import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.points.dto.UserLevelInfoDTO;
import com.carbonpoint.points.mapper.PointsUserMapper;
import com.carbonpoint.points.service.LevelService;
import com.carbonpoint.system.entity.Tenant;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.mapper.UserMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for LevelService.
 */
class LevelServiceTest extends BaseIntegrationTest {

    @Autowired
    private LevelService levelService;

    @Autowired
    private UserMapper userMapper;

    // ─────────────────────────────────────────
    // promoteIfNeeded tests
    // ─────────────────────────────────────────

    @Test
    void promoteIfNeeded_bronzeToSilver() {
        Tenant tenant = createTestTenant("promoteIfNeeded_bronzeToSilver");
        User user = createTestUser(tenant.getId(), "13800001001", "Test@123");
        user.setTotalPoints(500);
        user.setLevel(1);
        userMapper.updateById(user);

        // Promote to 1000 points (Silver threshold)
        levelService.promoteIfNeeded(user.getId(), 1000);

        User updated = userMapper.selectById(user.getId());
        assertNotNull(updated, "User should be found after promotion");
        assertEquals(2, updated.getLevel(), "Should be promoted to Silver (Lv.2)");
    }

    @Test
    void promoteIfNeeded_bronzeToGold() {
        Tenant tenant = createTestTenant("promoteIfNeeded_bronzeToGold");
        User user = createTestUser(tenant.getId(), "13800001002", "Test@123");
        user.setTotalPoints(100);
        user.setLevel(1);
        userMapper.updateById(user);

        // Promote directly to 5000 points (Gold threshold)
        levelService.promoteIfNeeded(user.getId(), 5000);

        User updated = userMapper.selectById(user.getId());
        assertNotNull(updated, "User should be found after promotion");
        assertEquals(3, updated.getLevel(), "Should be promoted to Gold (Lv.3)");
    }

    @Test
    void promoteIfNeeded_noPromotion_underThreshold() {
        Tenant tenant = createTestTenant("promoteIfNeeded_noPromotion_underThreshold");
        User user = createTestUser(tenant.getId(), "13800001003", "Test@123");
        user.setTotalPoints(500);
        user.setLevel(1);
        userMapper.updateById(user);

        // 500 points - still below Silver (1000) threshold
        levelService.promoteIfNeeded(user.getId(), 500);

        User updated = userMapper.selectById(user.getId());
        assertNotNull(updated, "User should be found");
        assertEquals(1, updated.getLevel(), "Should remain at Bronze");
    }

    @Test
    void promoteIfNeeded_sameLevel_noPromotion() {
        Tenant tenant = createTestTenant("promoteIfNeeded_sameLevel_noPromotion");
        User user = createTestUser(tenant.getId(), "13800001004", "Test@123");
        user.setTotalPoints(2000);
        user.setLevel(2);
        userMapper.updateById(user);

        // Still Silver range
        levelService.promoteIfNeeded(user.getId(), 3000);

        User updated = userMapper.selectById(user.getId());
        assertNotNull(updated, "User should be found");
        assertEquals(2, updated.getLevel(), "Should remain at Silver");
    }

    @Test
    void promoteIfNeeded_userNotFound_noException() {
        // Should not throw, just log and return
        assertDoesNotThrow(() ->
                levelService.promoteIfNeeded(999999L, 5000)
        );
    }

    // ─────────────────────────────────────────
    // getUserLevelInfo tests
    // ─────────────────────────────────────────

    @Test
    void getUserLevelInfo_bronze_returnsProgress() {
        Tenant tenant = createTestTenant("getUserLevelInfo_bronze_returnsProgress");
        User user = createTestUser(tenant.getId(), "13800001101", "Test@123");
        user.setTotalPoints(500);
        user.setLevel(1);
        userMapper.updateById(user);

        UserLevelInfoDTO info = levelService.getUserLevelInfo(user.getId());

        assertEquals(1, info.getLevel());
        assertEquals("青铜", info.getLevelName());
        assertEquals(1.0, info.getCoefficient());
        assertEquals(500, info.getTotalPoints());
        assertEquals(2, info.getNextLevel());
        assertEquals("白银", info.getNextLevelName());
        assertEquals(1000, info.getNextThreshold());
        assertTrue(info.getProgress() > 0, "Should have progress toward next level");
    }

    @Test
    void getUserLevelInfo_diamond_maxLevel() {
        Tenant tenant = createTestTenant("getUserLevelInfo_diamond_maxLevel");
        User user = createTestUser(tenant.getId(), "13800001102", "Test@123");
        user.setTotalPoints(80000);
        user.setLevel(5);
        userMapper.updateById(user);

        UserLevelInfoDTO info = levelService.getUserLevelInfo(user.getId());

        assertEquals(5, info.getLevel());
        assertEquals("钻石", info.getLevelName());
        assertEquals(2.5, info.getCoefficient());
        assertEquals(5, info.getNextLevel());
        assertEquals(0, info.getProgress());
    }

    @Test
    void getUserLevelInfo_userNotFound_throws() {
        assertThrows(BusinessException.class, () ->
                levelService.getUserLevelInfo(999999L)
        );
    }

    // ─────────────────────────────────────────
    // calculateLevelByPoints tests
    // ─────────────────────────────────────────

    @Test
    void calculateLevelByPoints_returnsCorrectLevel() {
        assertEquals(1, levelService.calculateLevelByPoints(0));
        assertEquals(1, levelService.calculateLevelByPoints(500));
        assertEquals(1, levelService.calculateLevelByPoints(999));
        assertEquals(2, levelService.calculateLevelByPoints(1000));
        assertEquals(2, levelService.calculateLevelByPoints(4999));
        assertEquals(3, levelService.calculateLevelByPoints(5000));
        assertEquals(3, levelService.calculateLevelByPoints(19999));
        assertEquals(4, levelService.calculateLevelByPoints(20000));
        assertEquals(4, levelService.calculateLevelByPoints(49999));
        assertEquals(5, levelService.calculateLevelByPoints(50000));
        assertEquals(5, levelService.calculateLevelByPoints(100000));
    }

    // ─────────────────────────────────────────
    // demoteIfNeeded tests (strict mode)
    // ─────────────────────────────────────────

    @Test
    void demoteIfNeeded_strictMode_noDemotion() {
        // In strict mode, should never demote
        int result = levelService.demoteIfNeeded(
                1L, 1L,
                LevelService.MODE_STRICT,
                3, // Gold
                LocalDate.now().minusMonths(2)
        );
        assertEquals(3, result, "Strict mode should not demote");
    }

    @Test
    void demoteIfNeeded_bronzeLevel_noDemotion() {
        // Lv.1 should never demote
        int result = levelService.demoteIfNeeded(
                1L, 1L,
                LevelService.MODE_FLEXIBLE,
                1, // Bronze
                LocalDate.now().minusMonths(2)
        );
        assertEquals(1, result, "Bronze should never demote");
    }

    @Test
    void demoteIfNeeded_flexibleMode_noCheckin_demotes() {
        Tenant tenant = createTestTenant("demoteIfNeeded_flexibleMode_noCheckin_demotes");
        User user = createTestUser(tenant.getId(), "13800001201", "Test@123");
        user.setLevel(3); // Gold
        user.setTotalPoints(5000);
        userMapper.updateById(user);

        // No checkin last month - should demote
        int result = levelService.demoteIfNeeded(
                user.getId(), tenant.getId(),
                LevelService.MODE_FLEXIBLE,
                3,
                LocalDate.now().minusMonths(2) // Last checkin was 2 months ago
        );
        assertEquals(2, result, "Should demote from Gold to Silver");
    }

    @Test
    void demoteIfNeeded_flexibleMode_withCheckinInsufficientPoints_demotes() {
        // User has Gold level but only earned 500 points last month
        // Gold threshold is 5000, so should demote
        // The demote logic checks last month's points via userMapper.sumPointsInRange
        // which depends on having transaction records. Since we don't create them,
        // sumPointsInRange returns 0, which is < threshold for any level > 1,
        // so it will demote.
        Tenant tenant = createTestTenant("demoteIfNeeded_flexibleMode_withCheckinInsufficientPoints_demotes");
        User user = createTestUser(tenant.getId(), "13800001202", "Test@123");
        user.setLevel(3); // Gold
        user.setTotalPoints(5000);
        user.setLastCheckinDate(LocalDate.now().minusDays(15));
        userMapper.updateById(user);

        int result = levelService.demoteIfNeeded(
                user.getId(), tenant.getId(),
                LevelService.MODE_FLEXIBLE,
                3,
                LocalDate.now().minusDays(15)
        );
        assertEquals(2, result, "Should demote when insufficient points");
    }
}
