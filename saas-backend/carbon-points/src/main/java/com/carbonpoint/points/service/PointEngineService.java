package com.carbonpoint.points.service;

import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.points.LevelConstants;
import com.carbonpoint.points.dto.PointCalcResult;
import com.carbonpoint.points.entity.PointRule;
import com.carbonpoint.points.mapper.CheckInRecordQueryMapper;
import com.carbonpoint.points.mapper.PointsUserMapper;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.service.NotificationTrigger;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Random;

@Slf4j
@Service
@RequiredArgsConstructor
public class PointEngineService {

    private final PointRuleService pointRuleService;
    private final PointAccountService pointAccountService;
    private final CheckInRecordQueryMapper checkInRecordQueryMapper;
    private final PointsUserMapper pointsUserMapper;
    private final NotificationTrigger notificationTrigger;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Random random = new Random();

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter TIME_FMT_WITH_SECONDS = DateTimeFormatter.ofPattern("HH:mm:ss");

    /**
     * Core point calculation following the fixed chain:
     * 1. Time slot match → random base points
     * 2. Special date multiplier
     * 3. Level coefficient
     * 4. Round
     * 5. Daily cap
     * 6. (Continuous reward handled separately)
     */
    public PointCalcResult calculate(Long userId, Long ruleId, int userLevel) {
        PointRule timeSlotRule = pointRuleService.getById(ruleId);
        if (timeSlotRule == null) {
            throw new BusinessException(ErrorCode.POINT_RULE_NOT_FOUND);
        }
        return calculate(userId, timeSlotRule, userLevel);
    }

    /**
     * Calculate points using an already-loaded PointRule.
     */
    public PointCalcResult calculate(Long userId, PointRule timeSlotRule, int userLevel) {
        PointCalcResult result = new PointCalcResult();

        // Step 1: Base points from the rule
        int basePoints = calculateBasePoints(timeSlotRule);
        result.setBasePoints(basePoints);

        double multiplierRate = 1.0;
        double levelMultiplier = 1.0;
        int dailyAwarded = getDailyAwarded(userId);

        // Step 2: Special date multiplier
        String specialMultiplierStr = getSpecialDateMultiplier(timeSlotRule.getTenantId());
        if (specialMultiplierStr != null) {
            multiplierRate = Double.parseDouble(specialMultiplierStr);
            result.setMultiplierRate(multiplierRate);
        }

        // Step 3: Level coefficient
        levelMultiplier = LevelConstants.getCoefficient(userLevel);
        result.setLevelMultiplier(levelMultiplier);

        // Step 4: Calculate
        double rawPoints = basePoints * multiplierRate * levelMultiplier;
        int roundedPoints = (int) Math.round(rawPoints);

        // Step 5: Daily cap
        int dailyLimit = getDailyLimit(timeSlotRule.getTenantId());
        boolean dailyCapHit = false;
        if (dailyLimit > 0 && dailyAwarded + roundedPoints > dailyLimit) {
            int allowed = dailyLimit - dailyAwarded;
            if (allowed < 0) allowed = 0;
            roundedPoints = allowed;
            dailyCapHit = true;
        }
        result.setDailyCapHit(dailyCapHit);
        result.setFinalPoints(roundedPoints);
        result.setTotalPoints(roundedPoints);

        log.debug("Point calculation for user {}: base={}, multiplier={}, level={}, dailyAwarded={}, dailyLimit={}, final={}, capHit={}",
                userId, basePoints, multiplierRate, levelMultiplier, dailyAwarded, dailyLimit, roundedPoints, dailyCapHit);
        return result;
    }

    /**
     * Public calculate that auto-detects which time slot is active.
     */
    public PointCalcResult calculate(Long userId, int userLevel) {
        Long tenantId = getTenantIdFromUser(userId);
        LocalTime now = LocalTime.now();

        PointRule activeRule = pointRuleService.getRulesByType(tenantId, PointRuleService.TYPE_TIME_SLOT)
                .stream()
                .filter(r -> isTimeInSlot(now, r.getConfig()))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.CHECKIN_NOT_IN_TIME_SLOT));

        return calculate(userId, activeRule.getId(), userLevel);
    }

    /**
     * Check and award streak/continuous check-in bonus.
     */
    public void checkAndAwardStreakReward(Long userId, Integer consecutiveDays) {
        Long tenantId = getTenantIdFromUser(userId);
        List<PointRule> streakRules = pointRuleService.getRulesByType(tenantId, PointRuleService.TYPE_STREAK);
        for (PointRule rule : streakRules) {
            try {
                JsonNode config = objectMapper.readTree(rule.getConfig());
                int requiredDays = config.get("days").asInt();
                int bonusPoints = config.get("bonusPoints").asInt();
                if (consecutiveDays >= requiredDays && consecutiveDays % requiredDays == 0) {
                    pointAccountService.awardPoints(userId, bonusPoints, "streak_bonus",
                            String.valueOf(rule.getId()),
                            String.format("连续打卡%s天奖励", requiredDays));
                    log.info("Awarded streak bonus {} points to user {} for {} consecutive days",
                            bonusPoints, userId, consecutiveDays);

                    // Send streak bonus notification
                    User user = pointsUserMapper.selectById(userId);
                    if (user != null) {
                        notificationTrigger.onStreakBonus(tenantId, userId, user.getPhone(), user.getEmail(),
                                consecutiveDays, bonusPoints);
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to process streak rule {}", rule.getId(), e);
            }
        }
    }

    /**
     * Check if a given time falls within a time slot rule's range.
     */
    public boolean isTimeInSlot(LocalTime time, String configJson) {
        try {
            JsonNode node = objectMapper.readTree(configJson);
            JsonNode startNode = node.get("startTime");
            JsonNode endNode = node.get("endTime");
            if (startNode == null || endNode == null) {
                log.warn("isTimeInSlot: missing startTime or endTime in config: {}", configJson);
                return false;
            }
            String startStr = startNode.asText();
            String endStr = endNode.asText();
            // Try with-seconds formatter first, fall back to without-seconds
            LocalTime start = startStr.length() == 8
                    ? LocalTime.parse(startStr, TIME_FMT_WITH_SECONDS)
                    : LocalTime.parse(startStr, TIME_FMT);
            LocalTime end = endStr.length() == 8
                    ? LocalTime.parse(endStr, TIME_FMT_WITH_SECONDS)
                    : LocalTime.parse(endStr, TIME_FMT);
            boolean result = !time.isBefore(start) && time.isBefore(end);
            log.debug("isTimeInSlot: time={}, start={}, end={}, result={}, config={}", time, start, end, result, configJson);
            return result;
        } catch (Exception e) {
            log.warn("Failed to parse time slot config: {}", configJson, e);
            return false;
        }
    }

    /**
     * Get currently active time slot rule for a tenant.
     */
    public PointRule getActiveTimeSlot(Long tenantId) {
        LocalTime now = LocalTime.now();
        return pointRuleService.getRulesByType(tenantId, PointRuleService.TYPE_TIME_SLOT)
                .stream()
                .filter(r -> isTimeInSlot(now, r.getConfig()))
                .findFirst()
                .orElse(null);
    }

    private int calculateBasePoints(PointRule rule) {
        try {
            JsonNode config = objectMapper.readTree(rule.getConfig());
            int min = config.get("minPoints").asInt();
            int max = config.get("maxPoints").asInt();
            return min + random.nextInt(max - min + 1);
        } catch (Exception e) {
            log.warn("Failed to parse time slot config, defaulting to 1 point", e);
            return 1;
        }
    }

    private String getSpecialDateMultiplier(Long tenantId) {
        if (tenantId == null) return null;
        List<PointRule> rules = pointRuleService.getRulesByType(tenantId, PointRuleService.TYPE_SPECIAL_DATE);
        LocalDate today = LocalDate.now();

        for (PointRule rule : rules) {
            try {
                JsonNode config = objectMapper.readTree(rule.getConfig());
                if (config.has("dates")) {
                    for (JsonNode dateNode : config.get("dates")) {
                        if (LocalDate.parse(dateNode.asText()).equals(today)) {
                            return config.get("multiplier").asText();
                        }
                    }
                } else if (config.has("recurring")) {
                    String recurring = config.get("recurring").asText();
                    int dayOfMonth = config.get("dayOfMonth").asInt();
                    double multiplier = config.get("multiplier").asDouble();

                    if ("MONTHLY".equals(recurring) && today.getDayOfMonth() == dayOfMonth) {
                        return String.valueOf(multiplier);
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to check special date rule {}", rule.getId(), e);
            }
        }
        return null;
    }

    private int getDailyLimit(Long tenantId) {
        if (tenantId == null) return 0;
        List<PointRule> rules = pointRuleService.getRulesByType(tenantId, PointRuleService.TYPE_DAILY_CAP);
        if (rules.isEmpty()) return 0;
        try {
            JsonNode config = objectMapper.readTree(rules.get(0).getConfig());
            return config.get("dailyLimit").asInt();
        } catch (Exception e) {
            return 0;
        }
    }

    /**
     * Query total final_points awarded to a user today from check_in_records.
     * FIX: was returning 0, now properly queries the DB.
     */
    private int getDailyAwarded(Long userId) {
        String todayStr = LocalDate.now().format(DATE_FMT);
        int awarded = checkInRecordQueryMapper.sumFinalPointsToday(userId, todayStr);
        log.debug("getDailyAwarded: userId={}, date={}, awarded={}", userId, todayStr, awarded);
        return awarded;
    }

    private Long getTenantIdFromUser(Long userId) {
        return com.carbonpoint.common.tenant.TenantContext.getTenantId();
    }
}
