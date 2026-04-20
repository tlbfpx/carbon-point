package com.carbonpoint.walking.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.points.service.PointAccountService;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.mapper.UserMapper;
import com.carbonpoint.walking.client.HealthApiClient;
import com.carbonpoint.walking.dto.*;
import com.carbonpoint.walking.entity.StepDailyRecordEntity;
import com.carbonpoint.walking.mapper.StepDailyRecordMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class WalkingService {

    private final StepDailyRecordMapper stepDailyRecordMapper;
    private final HealthApiClient healthApiClient;
    private final PointAccountService pointAccountService;
    private final UserMapper userMapper;

    /** Default coefficient: points = floor(steps * coefficient) */
    private static final double DEFAULT_COEFFICIENT = 0.01;
    /** Default minimum steps threshold to earn points */
    private static final int DEFAULT_STEPS_THRESHOLD = 1000;

    /**
     * Claim points for today's walking steps.
     *
     * Flow:
     * 1. Check duplicate via selectByUserAndDate (if exists and claimed -> error)
     * 2. Fetch step count from HealthApiClient
     * 3. Calculate points: threshold check + floor(steps * coefficient)
     * 4. Insert StepDailyRecordEntity (DuplicateKeyException -> already claimed)
     * 5. Award points via PointAccountService.awardPoints()
     * 6. Build response with fun equivalences
     */
    @Transactional
    public WalkingClaimResponseDTO claim(Long userId, String source) {
        Long tenantId = TenantContext.getTenantId();
        LocalDate today = LocalDate.now();

        // 0. Validate user exists and belongs to tenant
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        if (!user.getTenantId().equals(tenantId)) {
            throw new BusinessException(ErrorCode.USER_NOT_IN_TENANT);
        }

        // 1. Check for existing record today
        StepDailyRecordEntity existing = selectByUserAndDate(userId, today);
        if (existing != null && Boolean.TRUE.equals(existing.getClaimed())) {
            throw new BusinessException(ErrorCode.WALKING_ALREADY_CLAIMED);
        }

        // 2. Fetch step count from health API
        Integer steps = healthApiClient.fetchTodaySteps(userId, source);
        if (steps == null || steps < 0) {
            throw new BusinessException(ErrorCode.WALKING_NO_STEP_DATA);
        }

        // 3. Calculate points
        int pointsAwarded = calculatePoints(steps);

        // 4. Insert record
        StepDailyRecordEntity record = new StepDailyRecordEntity();
        record.setTenantId(tenantId);
        record.setUserId(userId);
        record.setRecordDate(today);
        record.setStepCount(steps);
        record.setPointsAwarded(pointsAwarded);
        record.setSource(source);
        record.setClaimed(true);

        try {
            stepDailyRecordMapper.insert(record);
        } catch (DuplicateKeyException e) {
            throw new BusinessException(ErrorCode.WALKING_ALREADY_CLAIMED);
        }

        // 5. Award points if any
        if (pointsAwarded > 0) {
            pointAccountService.awardPoints(userId, pointsAwarded, "walking",
                    String.valueOf(record.getId()),
                    String.format("步数打卡获得 %d 积分 (%d步)", pointsAwarded, steps));
        }

        // 6. Build response
        User updatedUser = userMapper.selectById(userId);
        List<WalkingClaimResponseDTO.FunEquivalence> funEquivalences =
                pointsAwarded > 0 ? calculateFunEquivalences(steps) : List.of();

        log.info("User {} claimed walking points: steps={}, points={}", userId, steps, pointsAwarded);

        return WalkingClaimResponseDTO.builder()
                .success(true)
                .message(pointsAwarded > 0
                        ? String.format("恭喜！今日%d步，获得%d积分", steps, pointsAwarded)
                        : String.format("今日%d步，未达到积分领取门槛", steps))
                .steps(steps)
                .pointsAwarded(pointsAwarded)
                .funEquivalences(funEquivalences)
                .availablePoints(updatedUser != null ? updatedUser.getAvailablePoints() : 0)
                .totalPoints(updatedUser != null ? updatedUser.getTotalPoints() : 0)
                .build();
    }

    /**
     * Get today's walking status for a user.
     */
    public WalkingTodayDTO getTodayStatus(Long userId) {
        LocalDate today = LocalDate.now();
        StepDailyRecordEntity record = selectByUserAndDate(userId, today);

        Integer todaySteps;
        boolean claimed;

        if (record != null) {
            todaySteps = record.getStepCount();
            claimed = Boolean.TRUE.equals(record.getClaimed());
        } else {
            // Try to fetch current steps from health API (best effort)
            todaySteps = 0;
            claimed = false;
        }

        int claimablePoints = calculatePoints(todaySteps != null ? todaySteps : 0);
        List<WalkingClaimResponseDTO.FunEquivalence> funEquivalences =
                claimablePoints > 0 ? calculateFunEquivalences(todaySteps != null ? todaySteps : 0) : List.of();

        return WalkingTodayDTO.builder()
                .todaySteps(todaySteps)
                .stepsThreshold(DEFAULT_STEPS_THRESHOLD)
                .claimablePoints(claimablePoints)
                .claimed(claimed)
                .funEquivalences(funEquivalences)
                .build();
    }

    /**
     * Get walking records for a user (paginated).
     */
    public Page<WalkingRecordDTO> getRecords(Long userId, int page, int size) {
        Long tenantId = TenantContext.getTenantId();
        LambdaQueryWrapper<StepDailyRecordEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(StepDailyRecordEntity::getUserId, userId)
                .eq(StepDailyRecordEntity::getTenantId, tenantId)
                .orderByDesc(StepDailyRecordEntity::getRecordDate);

        Page<StepDailyRecordEntity> result = stepDailyRecordMapper.selectPage(
                new Page<>(page, size), wrapper);

        Page<WalkingRecordDTO> dtoPage = new Page<>(
                result.getCurrent(), result.getSize(), result.getTotal());
        dtoPage.setRecords(result.getRecords().stream().map(r ->
                WalkingRecordDTO.builder()
                        .id(r.getId())
                        .date(r.getRecordDate())
                        .steps(r.getStepCount())
                        .pointsEarned(r.getPointsAwarded())
                        .source(r.getSource())
                        .createdAt(r.getCreatedAt())
                        .build()
        ).toList());

        return dtoPage;
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    /**
     * Look up a step record by user and date.
     */
    private StepDailyRecordEntity selectByUserAndDate(Long userId, LocalDate date) {
        LambdaQueryWrapper<StepDailyRecordEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(StepDailyRecordEntity::getUserId, userId)
                .eq(StepDailyRecordEntity::getRecordDate, date);
        return stepDailyRecordMapper.selectOne(wrapper);
    }

    /**
     * Calculate points from steps using: floor(steps * coefficient).
     * Returns 0 if steps are below the threshold.
     */
    private int calculatePoints(int steps) {
        if (steps < DEFAULT_STEPS_THRESHOLD) {
            return 0;
        }
        return (int) Math.floor(steps * DEFAULT_COEFFICIENT);
    }

    /**
     * Calculate fun equivalences for the given step count.
     * Default fun items are configurable; these are the defaults.
     */
    private List<WalkingClaimResponseDTO.FunEquivalence> calculateFunEquivalences(int steps) {
        List<WalkingClaimResponseDTO.FunEquivalence> equivalences = new ArrayList<>();

        // ~50 calories per 1000 steps, ~0.3 bananas each
        double bananaCalories = 105.0;
        double caloriesPer1000Steps = 50.0;
        double bananas = (steps / 1000.0 * caloriesPer1000Steps) / bananaCalories;
        if (bananas > 0.01) {
            equivalences.add(WalkingClaimResponseDTO.FunEquivalence.builder()
                    .item("banana")
                    .description("香蕉")
                    .quantity(Math.round(bananas * 100.0) / 100.0)
                    .build());
        }

        // ~1 bowl of rice per 3000 steps
        double riceBowls = steps / 3000.0;
        if (riceBowls > 0.01) {
            equivalences.add(WalkingClaimResponseDTO.FunEquivalence.builder()
                    .item("rice_bowl")
                    .description("碗米饭")
                    .quantity(Math.round(riceBowls * 100.0) / 100.0)
                    .build());
        }

        // ~0.5km per 700 steps
        double km = (steps / 700.0) * 0.5;
        if (km > 0.01) {
            equivalences.add(WalkingClaimResponseDTO.FunEquivalence.builder()
                    .item("distance_km")
                    .description("公里")
                    .quantity(Math.round(km * 100.0) / 100.0)
                    .build());
        }

        return equivalences;
    }
}
