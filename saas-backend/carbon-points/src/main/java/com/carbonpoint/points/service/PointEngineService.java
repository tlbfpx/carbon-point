package com.carbonpoint.points.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.platform.model.RuleContext;
import com.carbonpoint.platform.model.RuleResult;
import com.carbonpoint.platform.registry.ProductRegistry;
import com.carbonpoint.platform.rule.RuleChainExecutor;
import com.carbonpoint.points.dto.PointCalcResult;
import com.carbonpoint.points.entity.PointRule;
import com.carbonpoint.points.mapper.CheckInRecordQueryMapper;
import com.carbonpoint.points.mapper.PointsUserMapper;
import com.carbonpoint.system.entity.ProductEntity;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.mapper.ProductMapper;
import com.carbonpoint.system.service.NotificationTrigger;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Unified point calculation engine.
 * Reads rule chain configuration from database (platform_products table)
 * with fallback to hardcoded ProductModule SPI.
 */
@Slf4j
@Service
public class PointEngineService {

    private final PointRuleService pointRuleService;
    private final PointAccountService pointAccountService;
    private final CheckInRecordQueryMapper checkInRecordQueryMapper;
    private final PointsUserMapper pointsUserMapper;
    private final NotificationTrigger notificationTrigger;
    private final RuleChainExecutor ruleChainExecutor;
    private final ProductRegistry productRegistry;
    private final ProductMapper productMapper;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter TIME_FMT_WITH_SECONDS = DateTimeFormatter.ofPattern("HH:mm:ss");

    public PointEngineService(
            PointRuleService pointRuleService,
            PointAccountService pointAccountService,
            CheckInRecordQueryMapper checkInRecordQueryMapper,
            PointsUserMapper pointsUserMapper,
            NotificationTrigger notificationTrigger,
            RuleChainExecutor ruleChainExecutor,
            ProductRegistry productRegistry,
            ProductMapper productMapper) {
        this.pointRuleService = pointRuleService;
        this.pointAccountService = pointAccountService;
        this.checkInRecordQueryMapper = checkInRecordQueryMapper;
        this.pointsUserMapper = pointsUserMapper;
        this.notificationTrigger = notificationTrigger;
        this.ruleChainExecutor = ruleChainExecutor;
        this.productRegistry = productRegistry;
        this.productMapper = productMapper;
    }

    public PointCalcResult calculate(Long userId, Long ruleId, int userLevel) {
        PointRule timeSlotRule = pointRuleService.getById(ruleId);
        if (timeSlotRule == null) {
            throw new BusinessException(ErrorCode.POINT_RULE_NOT_FOUND);
        }
        return calculate(userId, timeSlotRule, userLevel);
    }

    /**
     * Calculate points using the rule chain engine.
     * Throws if the rule chain cannot be executed (no legacy fallback).
     */
    public PointCalcResult calculate(Long userId, PointRule timeSlotRule, int userLevel) {
        return executeRuleChain(userId, timeSlotRule, userLevel);
    }

    private PointCalcResult executeRuleChain(Long userId, PointRule timeSlotRule, int userLevel) {
        final String productCode = "stair_climbing";

        // First try to get rule chain from database
        List<String> ruleChainNames = getRuleChainFromDatabase(productCode);
        String usedProductCode = productCode;

        // Fallback to ProductRegistry if database doesn't have valid config
        if (ruleChainNames == null || ruleChainNames.isEmpty()) {
            log.info("No valid rule chain config in database for product {}, falling back to ProductRegistry", productCode);
            var moduleOpt = productRegistry.getModule(productCode);
            if (moduleOpt.isEmpty()) {
                throw new BusinessException(ErrorCode.SYSTEM_ERROR,
                        "Rule chain engine unavailable: product module '" + productCode + "' not registered");
            }

            var module = moduleOpt.get();
            ruleChainNames = module.getRuleChain();
            if (ruleChainNames == null || ruleChainNames.isEmpty()) {
                throw new BusinessException(ErrorCode.SYSTEM_ERROR,
                        "Rule chain engine unavailable: no rule chain defined for '" + productCode + "'");
            }
        }

        Long tenantId = timeSlotRule.getTenantId();

        Map<String, Object> tenantConfig = buildTenantConfig(tenantId);
        Map<String, Object> triggerData = buildTriggerData(userId, userLevel, tenantId);

        RuleContext context = RuleContext.builder()
                .userId(userId)
                .tenantId(tenantId)
                .productCode(usedProductCode)
                .currentPoints(0)
                .tenantConfig(tenantConfig)
                .triggerData(triggerData)
                .build();

        RuleResult chainResult = ruleChainExecutor.executeByName(ruleChainNames, context);

        PointCalcResult result = new PointCalcResult();
        result.setBasePoints(extractIntMetadata(chainResult, "basePoints", chainResult.getPoints()));
        result.setMultiplierRate(extractDoubleMetadata(chainResult, "multiplierRate", 1.0));
        result.setLevelMultiplier(extractDoubleMetadata(chainResult, "levelMultiplier", 1.0));
        result.setFinalPoints(chainResult.getPoints());
        result.setTotalPoints(chainResult.getPoints());
        result.setDailyCapHit(extractBoolMetadata(chainResult, "dailyCapHit", false));

        log.debug("RuleChain calculation for user {}: final={}, capHit={}, metadata={}",
                userId, chainResult.getPoints(), result.isDailyCapHit(), chainResult.getMetadata());

        return result;
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

    int getDailyAwarded(Long userId) {
        String todayStr = LocalDate.now().format(DATE_FMT);
        int awarded = checkInRecordQueryMapper.sumFinalPointsToday(userId, todayStr);
        log.debug("getDailyAwarded: userId={}, date={}, awarded={}", userId, todayStr, awarded);
        return awarded;
    }

    private Long getTenantIdFromUser(Long userId) {
        return TenantContext.getTenantId();
    }

    /**
     * Get rule chain configuration from database (platform_products table).
     *
     * @param productCode the product code to look up
     * @return the rule chain, or empty list if not found or invalid
     */
    private List<String> getRuleChainFromDatabase(String productCode) {
        try {
            LambdaQueryWrapper<ProductEntity> wrapper = new LambdaQueryWrapper<>();
            wrapper.eq(ProductEntity::getCode, productCode)
                   .eq(ProductEntity::getStatus, 1); // Only enabled products

            ProductEntity product = productMapper.selectOne(wrapper);
            if (product == null) {
                log.debug("Product not found in database: {}", productCode);
                return Collections.emptyList();
            }

            String ruleChainConfig = product.getRuleChainConfig();
            if (!StringUtils.hasText(ruleChainConfig)) {
                log.debug("No ruleChainConfig for product: {}", productCode);
                return Collections.emptyList();
            }

            List<String> ruleChain = objectMapper.readValue(ruleChainConfig, new TypeReference<List<String>>() {});
            log.info("Loaded rule chain from database for product {}: {}", productCode, ruleChain);
            return ruleChain;
        } catch (Exception e) {
            log.warn("Failed to load rule chain from database for product: {}", productCode, e);
            return Collections.emptyList();
        }
    }
}
