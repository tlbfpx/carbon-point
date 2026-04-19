package com.carbonpoint.walking.service;

import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.security.AppPasswordEncoder;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.mapper.UserMapper;
import com.carbonpoint.walking.TestApplication;
import com.carbonpoint.walking.client.StubHealthApiClient;
import com.carbonpoint.walking.dto.WalkingClaimResponseDTO;
import com.carbonpoint.walking.dto.WalkingTodayDTO;
import com.carbonpoint.walking.entity.StepDailyRecordEntity;
import com.carbonpoint.walking.mapper.StepDailyRecordMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(classes = TestApplication.class)
@ActiveProfiles("test")
class WalkingServiceTest {

    @Autowired
    private WalkingService walkingService;

    @Autowired
    private StepDailyRecordMapper stepDailyRecordMapper;

    @Autowired
    private StubHealthApiClient stubHealthApiClient;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private AppPasswordEncoder passwordEncoder;

    private int userCounter = 0;

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void testClaimSuccess() {
        // Setup
        Long tenantId = 100L;
        Long userId = createTestUser(tenantId);
        TenantContext.setTenantId(tenantId);

        stubHealthApiClient.setFixedStepCount(8000);

        // Execute
        WalkingClaimResponseDTO result = walkingService.claim(userId, "werun");

        // Verify
        assertTrue(result.isSuccess());
        assertEquals(8000, result.getSteps());
        // floor(8000 * 0.01) = 80
        assertEquals(80, result.getPointsAwarded());
        assertNotNull(result.getFunEquivalences());
        assertFalse(result.getFunEquivalences().isEmpty());

        // Verify record persisted
        LambdaQueryWrapper<StepDailyRecordEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(StepDailyRecordEntity::getUserId, userId)
                .eq(StepDailyRecordEntity::getRecordDate, LocalDate.now());
        StepDailyRecordEntity record = stepDailyRecordMapper.selectOne(wrapper);
        assertNotNull(record);
        assertEquals(8000, record.getStepCount());
        assertEquals(80, record.getPointsAwarded());
        assertTrue(record.getClaimed());
        assertEquals("werun", record.getSource());
    }

    @Test
    void testClaimAlreadyDone() {
        Long tenantId = 101L;
        Long userId = createTestUser(tenantId);
        TenantContext.setTenantId(tenantId);

        stubHealthApiClient.setFixedStepCount(8000);

        // First claim succeeds
        walkingService.claim(userId, "werun");

        // Second claim on same day should fail
        BusinessException ex = assertThrows(BusinessException.class,
                () -> walkingService.claim(userId, "werun"));
        assertEquals(ErrorCode.WALKING_ALREADY_CLAIMED.getCode(), ex.getCode());
    }

    @Test
    void testClaimBelowThreshold() {
        Long tenantId = 102L;
        Long userId = createTestUser(tenantId);
        TenantContext.setTenantId(tenantId);

        // Configure stub to return steps below threshold (1000)
        stubHealthApiClient.setFixedStepCount(500);

        WalkingClaimResponseDTO result = walkingService.claim(userId, "werun");

        assertTrue(result.isSuccess());
        assertEquals(500, result.getSteps());
        assertEquals(0, result.getPointsAwarded());
        assertTrue(result.getFunEquivalences().isEmpty());
    }

    @Test
    void testClaimNoStepData() {
        Long tenantId = 103L;
        Long userId = createTestUser(tenantId);
        TenantContext.setTenantId(tenantId);

        // Configure stub to return -1 to simulate no data (we use null convention)
        // Since StubHealthApiClient returns null only when overrideStepCount is explicitly null,
        // and by default it returns fixedStepCount, we need a workaround.
        // The stub interprets negative override as returning that negative value.
        // But our service checks `steps == null || steps < 0`.
        // Setting override to -1 will cause the stub to return -1, which the service treats as no data.
        stubHealthApiClient.setOverrideStepCount(-1);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> walkingService.claim(userId, "werun"));
        assertEquals(ErrorCode.WALKING_NO_STEP_DATA.getCode(), ex.getCode());
    }

    @Test
    void testGetTodayStatus() {
        Long tenantId = 104L;
        Long userId = createTestUser(tenantId);
        TenantContext.setTenantId(tenantId);

        stubHealthApiClient.setFixedStepCount(6000);
        walkingService.claim(userId, "werun");

        WalkingTodayDTO status = walkingService.getTodayStatus(userId);

        assertNotNull(status);
        assertEquals(6000, status.getTodaySteps());
        assertTrue(status.getClaimed());
        assertEquals(1000, status.getStepsThreshold());
        // floor(6000 * 0.01) = 60
        assertEquals(60, status.getClaimablePoints());
    }

    /**
     * Helper to create a test user directly in DB.
     */
    private Long createTestUser(Long tenantId) {
        userCounter++;
        User user = new User();
        user.setTenantId(tenantId);
        user.setPhone("walk_svc_" + tenantId + "_" + System.nanoTime() + "_" + userCounter);
        user.setPasswordHash(passwordEncoder.encode("test123"));
        user.setNickname("WalkingSvcTester");
        user.setStatus("active");
        user.setLevel(1);
        user.setTotalPoints(0);
        user.setAvailablePoints(0);
        user.setFrozenPoints(0);
        user.setConsecutiveDays(0);
        TenantContext.setTenantId(tenantId);
        userMapper.insert(user);
        return user.getId();
    }
}
