package com.carbonpoint.points.service;

import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.platform.model.RuleContext;
import com.carbonpoint.platform.model.RuleResult;
import com.carbonpoint.platform.registry.ProductRegistry;
import com.carbonpoint.platform.rule.RuleChainExecutor;
import com.carbonpoint.points.LevelConstants;
import com.carbonpoint.points.dto.PointCalcResult;
import com.carbonpoint.points.entity.PointRule;
import com.carbonpoint.points.mapper.CheckInRecordQueryMapper;
import com.carbonpoint.points.mapper.PointsUserMapper;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.service.NotificationTrigger;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;

@Slf4j
@Service
public class PointEngineService {

    private final PointRuleService pointRuleService;
    private final PointAccountService pointAccountService;
    private final CheckInRecordQueryMapper checkInRecordQueryMapper;
    private final PointsUserMapper pointsUserMapper;
    private final NotificationTrigger notificationTrigger;
    private final Optional<RuleChainExecutor> ruleChainExecutor;
    private final Optional<ProductRegistry> productRegistry;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Random random = new Random();

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter TIME_FMT_WITH_SECONDS = DateTimeFormatter.ofPattern("HH:mm:ss");

    public PointEngineService(
            PointRuleService pointRuleService,
            PointAccountService pointAccountService,
            CheckInRecordQueryMapper checkInRecordQueryMapper,
            PointsUserMapper pointsUserMapper,
            NotificationTrigger notificationTrigger,
            Optional<RuleChainExecutor> ruleChainExecutor,
            Optional<ProductRegistry> productRegistry) {
        this.pointRuleService = pointRuleService;
        this.pointAccountService = pointAccountService;
        this.checkInRecordQueryMapper = checkInRecordQueryMapper;
        this.pointsUserMapper = pointsUserMapper;
        this.notificationTrigger = notificationTrigger;
        this.ruleChainExecutor = ruleChainExecutor;
        this.productRegistry = productRegistry;
    }

    public PointCalcResult calculate(Long userId, Long ruleId, int userLevel) {
        PointRule timeSlotRule = pointRuleService.getById(ruleId);
        if (timeSlotRule == null) {
            throw new BusinessException(ErrorCode.POINT_RULE_NOT_FOUND);
        }
        return calculate(userId, timeSlotRule, userLevel);
    }

    public PointCalcResult calculate(Long userId, PointRule timeSlotRule, int userLevel) {
        // Try rule chain execution first (when carbon-platform is available)
        if (ruleChainExecutor.isPresent() && productRegistry.isPresent()) {
            Optional<PointCalcResult> chainResult = tryRuleChain(userId, timeSlotRule, userLevel);
            if (chainResult.isPresent()) {
                return chainResult.get();
            }
        }

        // Fallback: hardcoded calculation chain
        return calculateLegacy(userId, timeSlotRule, userLevel);
    }

    private Optional<PointCalcResult> tryRuleChain(Long userId, PointRule timeSlotRule, int userLevel) {
        try {
            var registry = productRegistry.get();
            var executor = ruleChainExecutor.get();

            // Use "stair_climbing" as default product code
            var moduleOpt = registry.getModule("stair_climbing");
            if (moduleOpt.isEmpty()) {
                return Optional.empty();
            }

            var module = moduleOpt.get();
            List<String> ruleChainNames = module.getRuleChain();
            if (ruleChainNames == null || ruleChainNames.isEmpty()) {
                return Optional.empty();
            }

            Long tenantId = timeSlotRule.getTenantId();

            Map<String, Object> tenantConfig = buildTenantConfig(tenantId);
            Map<String, Object> triggerData = buildTriggerData(userId, userLevel, tenantId);

            RuleContext context = RuleContext.builder()
                    .userId(userId)
                    .tenantId(tenantId)
                    .productCode(module.getCode())
                    .currentPoints(0)
                    .tenantConfig(tenantConfig)
                    .triggerData(triggerData)
                    .build();

            RuleResult chainResult = executor.executeByName(ruleChainNames, context);

            PointCalcResult result = new PointCalcResult();
            result.setBasePoints(extractIntMetadata(chainResult, "basePoints", chainResult.getPoints()));
            result.setMultiplierRate(extractDoubleMetadata(chainResult, "multiplierRate", 1.0));
            result.setLevelMultiplier(extractDoubleMetadata(chainResult, "levelMultiplier", 1.0));
            result.setFinalPoints(chainResult.getPoints());
            result.setTotalPoints(chainResult.getPoints());
            result.setDailyCapHit(extractBoolMetadata(chainResult, "dailyCapHit", false));

            log.debug("RuleChain calculation for user {}: final={}, capHit={}, metadata={}",
                    userId, chainResult.getPoints(), result.isDailyCapHit(), chainResult.getMetadata());

            return Optional.of(result);
        } catch (Exception e) {
            log.warn("Rule chain execution failed, falling back to legacy: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private Map<String, Object> buildTenantConfig(Long tenantId) {
        Map<String, Object> config = new HashMap<>();

        // Time slot rules
        List<PointRule> timeSlotRules = pointRuleService.getRulesByType(tenantId, PointRuleService.TYPE_TIME_SLOT);
        config.put("timeSlotRules", timeSlotRules.stream().map(r -> {
            try {
                return objectMapper.readTree(r.getConfig());
            } catch (Exception e) {
                return null;
            }
        }).filter(java.util.Objects::nonNull).toList());

        // Special date rules
        List<PointRule> specialDateRules = pointRuleService.getRulesByType(tenantId, PointRuleService.TYPE_SPECIAL_DATE);
        config.put("specialDateRules", specialDateRules.stream().map(r -> {
            try {
                return objectMapper.readTree(r.getConfig());
            } catch (Exception e) {
                return null;
            }
        }).filter(java.util.Objects::nonNull).toList());

        // Daily cap rules
        List<PointRule> dailyCapRules = pointRuleService.getRulesByType(tenantId, PointRuleService.TYPE_DAILY_CAP);
        if (!dailyCapRules.isEmpty()) {
            try {
                config.put("dailyCapConfig", objectMapper.readTree(dailyCapRules.get(0).getConfig()));
            } catch (Exception ignored) {
            }
        }

        return config;
    }

    private Map<String, Object> buildTriggerData(Long userId, int userLevel, Long tenantId) {
        Map<String, Object> data = new HashMap<>();
        data.put("checkInTime", LocalTime.now().format(TIME_FMT));
        data.put("userLevel", userLevel);
        data.put("dailyAwarded", getDailyAwarded(userId));
        return data;
    }

    private int extractIntMetadata(RuleResult result, String key, int defaultValue) {
        if (result.getMetadata() != null && result.getMetadata().containsKey(key)) {
            Object val = result.getMetadata().get(key);
            if (val instanceof Number) return ((Number) val).intValue();
        }
        return defaultValue;
    }

    private double extractDoubleMetadata(RuleResult result, String key, double defaultValue) {
        if (result.getMetadata() != null && result.getMetadata().containsKey(key)) {
            Object val = result.getMetadata().get(key);
            if (val instanceof Number) return ((Number) val).doubleValue();
        }
        return defaultValue;
    }

    private boolean extractBoolMetadata(RuleResult result, String key, boolean defaultValue) {
        if (result.getMetadata() != null && result.getMetadata().containsKey(key)) {
            Object val = result.getMetadata().get(key);
            if (val instanceof Boolean) return (Boolean) val;
        }
        return defaultValue;
    }

    private PointCalcResult calculateLegacy(Long userId, PointRule timeSlotRule, int userLevel) {
        PointCalcResult result = new PointCalcResult();

        int basePoints = calculateBasePoints(timeSlotRule);
        result.setBasePoints(basePoints);

        double multiplierRate = 1.0;
        double levelMultiplier = 1.0;
        int dailyAwarded = getDailyAwarded(userId);

        String specialMultiplierStr = getSpecialDateMultiplier(timeSlotRule.getTenantId());
        if (specialMultiplierStr != null) {
            multiplierRate = Double.parseDouble(specialMultiplierStr);
            result.setMultiplierRate(multiplierRate);
        }

        levelMultiplier = LevelConstants.getCoefficient(userLevel);
        result.setLevelMultiplier(levelMultiplier);

        double rawPoints = basePoints * multiplierRate * levelMultiplier;
        int roundedPoints = (int) Math.round(rawPoints);

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

        log.debug("Legacy calculation for user {}: base={}, multiplier={}, level={}, dailyAwarded={}, dailyLimit={}, final={}, capHit={}",
                userId, basePoints, multiplierRate, levelMultiplier, dailyAwarded, dailyLimit, roundedPoints, dailyCapHit);
        return result;
    }

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

    public void checkAndAwardStreakReward(Long userId, Integer consecutiveDays) {
        Long tenantId = getTenantIdFromUser(userId);
        List<PointRule> streakRules = pointRuleService.getRulesByType(tenantId, PointRuleService.TYPE_STREAK);
        for (PointRule rule : streakRules) {
            try {
                JsonNode config = objectMapper.readTree(rule.getConfig());
                int requiredDays = config.get("days").asInt();
                int bonusPoints = config.get("bonusPoints").asInt();
                if (consecutiveDays.equals(requiredDays)) {
                    pointAccountService.awardPoints(userId, bonusPoints, "streak_bonus",
                            String.valueOf(rule.getId()),
                            String.format("连续打卡%s天奖励", requiredDays));
                    log.info("Awarded streak bonus {} points to user {} for {} consecutive days",
                            bonusPoints, userId, consecutiveDays);

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
                    double multiplier = config.get("multiplier").asDouble();

                    if ("MONTHLY".equals(recurring)) {
                        int dayOfMonth = config.get("dayOfMonth").asInt();
                        if (today.getDayOfMonth() == dayOfMonth) {
                            return String.valueOf(multiplier);
                        }
                    } else if ("WEEKLY".equals(recurring)) {
                        int dayOfWeek = config.get("dayOfWeek").asInt();
                        if (today.getDayOfWeek().getValue() == dayOfWeek) {
                            return String.valueOf(multiplier);
                        }
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

    private int getDailyAwarded(Long userId) {
        String todayStr = LocalDate.now().format(DATE_FMT);
        int awarded = checkInRecordQueryMapper.sumFinalPointsToday(userId, todayStr);
        log.debug("getDailyAwarded: userId={}, date={}, awarded={}", userId, todayStr, awarded);
        return awarded;
    }

    private Long getTenantIdFromUser(Long userId) {
        return TenantContext.getTenantId();
    }
}
