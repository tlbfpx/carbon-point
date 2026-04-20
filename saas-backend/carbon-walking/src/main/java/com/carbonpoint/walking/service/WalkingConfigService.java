package com.carbonpoint.walking.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.points.entity.PointRule;
import com.carbonpoint.points.mapper.PointRuleMapper;
import com.carbonpoint.walking.dto.FunEquivalenceTemplateDTO;
import com.carbonpoint.walking.dto.WalkingConfigDTO;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Service for managing walking configuration and fun equivalence templates.
 * Stores configs as point rules with types 'step_calc' and 'walking_fun_equiv'.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WalkingConfigService {

    private final PointRuleMapper pointRuleMapper;
    private final ObjectMapper objectMapper;

    private static final String RULE_TYPE_STEP_CALC = "step_calc";
    private static final String RULE_TYPE_FUN_EQUIV = "walking_fun_equiv";

    // Default values
    private static final Integer DEFAULT_STEPS_THRESHOLD = 1000;
    private static final Integer DEFAULT_POINTS_COEFFICIENT = 1; // 0.01 as integer (divide by 100)
    private static final Integer DEFAULT_DAILY_CAP = 50;

    /**
     * Get walking configuration for current tenant.
     */
    public WalkingConfigDTO getConfig() {
        Long tenantId = TenantContext.getTenantId();
        LambdaQueryWrapper<PointRule> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PointRule::getTenantId, tenantId)
                .eq(PointRule::getType, RULE_TYPE_STEP_CALC);

        PointRule rule = pointRuleMapper.selectOne(wrapper);

        if (rule == null) {
            return WalkingConfigDTO.builder()
                    .stepsThreshold(DEFAULT_STEPS_THRESHOLD)
                    .pointsCoefficient(DEFAULT_POINTS_COEFFICIENT)
                    .dailyCap(DEFAULT_DAILY_CAP)
                    .build();
        }

        try {
            Map<String, Object> config = objectMapper.readValue(
                    rule.getConfig(), new TypeReference<Map<String, Object>>() {});

            return WalkingConfigDTO.builder()
                    .stepsThreshold(((Number) config.getOrDefault("stepsThreshold", DEFAULT_STEPS_THRESHOLD)).intValue())
                    .pointsCoefficient(((Number) config.getOrDefault("pointsCoefficient", DEFAULT_POINTS_COEFFICIENT)).intValue())
                    .dailyCap(((Number) config.getOrDefault("dailyCap", DEFAULT_DAILY_CAP)).intValue())
                    .build();
        } catch (Exception e) {
            log.error("Failed to parse walking config for tenant {}", tenantId, e);
            return WalkingConfigDTO.builder()
                    .stepsThreshold(DEFAULT_STEPS_THRESHOLD)
                    .pointsCoefficient(DEFAULT_POINTS_COEFFICIENT)
                    .dailyCap(DEFAULT_DAILY_CAP)
                    .build();
        }
    }

    /**
     * Update walking configuration for current tenant.
     */
    public void updateConfig(WalkingConfigDTO config) {
        Long tenantId = TenantContext.getTenantId();
        LambdaQueryWrapper<PointRule> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PointRule::getTenantId, tenantId)
                .eq(PointRule::getType, RULE_TYPE_STEP_CALC);

        PointRule existing = pointRuleMapper.selectOne(wrapper);

        Map<String, Object> configMap = Map.of(
                "stepsThreshold", config.getStepsThreshold(),
                "pointsCoefficient", config.getPointsCoefficient(),
                "dailyCap", config.getDailyCap()
        );

        try {
            String configJson = objectMapper.writeValueAsString(configMap);

            if (existing != null) {
                existing.setConfig(configJson);
                pointRuleMapper.updateById(existing);
            } else {
                PointRule newRule = new PointRule();
                newRule.setTenantId(tenantId);
                newRule.setType(RULE_TYPE_STEP_CALC);
                newRule.setName("步数积分配置");
                newRule.setConfig(configJson);
                newRule.setEnabled(true);
                newRule.setSortOrder(0);
                pointRuleMapper.insert(newRule);
            }
            log.info("Updated walking config for tenant {}: threshold={}, coefficient={}, cap={}",
                    tenantId, config.getStepsThreshold(), config.getPointsCoefficient(), config.getDailyCap());
        } catch (Exception e) {
            log.error("Failed to update walking config for tenant {}", tenantId, e);
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "更新配置失败");
        }
    }

    /**
     * Get fun equivalence templates for current tenant.
     */
    public List<FunEquivalenceTemplateDTO> getEquivalenceTemplates() {
        Long tenantId = TenantContext.getTenantId();
        LambdaQueryWrapper<PointRule> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PointRule::getTenantId, tenantId)
                .eq(PointRule::getType, RULE_TYPE_FUN_EQUIV);

        PointRule rule = pointRuleMapper.selectOne(wrapper);

        if (rule == null) {
            return getDefaultTemplates();
        }

        try {
            Map<String, Object> config = objectMapper.readValue(
                    rule.getConfig(), new TypeReference<Map<String, Object>>() {});
            List<?> items = (List<?>) config.getOrDefault("items", new ArrayList<>());

            List<FunEquivalenceTemplateDTO> result = new ArrayList<>();
            for (Object item : items) {
                if (item instanceof Map) {
                    Map<?, ?> map = (Map<?, ?>) item;
                    Object stepsPerObj = map.get("stepsPer");
                    int stepsPer = 0;
                    if (stepsPerObj instanceof Number) {
                        stepsPer = ((Number) stepsPerObj).intValue();
                    }
                    result.add(FunEquivalenceTemplateDTO.builder()
                            .name((String) map.get("name"))
                            .stepsPer(stepsPer)
                            .icon((String) map.get("icon"))
                            .build());
                }
            }
            return result.isEmpty() ? getDefaultTemplates() : result;
        } catch (Exception e) {
            log.error("Failed to parse fun equivalence templates for tenant {}", tenantId, e);
            return getDefaultTemplates();
        }
    }

    /**
     * Update fun equivalence templates for current tenant.
     */
    public void updateEquivalenceTemplates(List<FunEquivalenceTemplateDTO> templates) {
        Long tenantId = TenantContext.getTenantId();
        LambdaQueryWrapper<PointRule> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PointRule::getTenantId, tenantId)
                .eq(PointRule::getType, RULE_TYPE_FUN_EQUIV);

        PointRule existing = pointRuleMapper.selectOne(wrapper);

        Map<String, Object> configMap = Map.of("items", templates);

        try {
            String configJson = objectMapper.writeValueAsString(configMap);

            if (existing != null) {
                existing.setConfig(configJson);
                pointRuleMapper.updateById(existing);
            } else {
                PointRule newRule = new PointRule();
                newRule.setTenantId(tenantId);
                newRule.setType(RULE_TYPE_FUN_EQUIV);
                newRule.setName("趣味换算配置");
                newRule.setConfig(configJson);
                newRule.setEnabled(true);
                newRule.setSortOrder(0);
                pointRuleMapper.insert(newRule);
            }
            log.info("Updated fun equivalence templates for tenant {}: {} templates",
                    tenantId, templates.size());
        } catch (Exception e) {
            log.error("Failed to update fun equivalence templates for tenant {}", tenantId, e);
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "更新配置失败");
        }
    }

    /**
     * Get default fun equivalence templates.
     */
    private List<FunEquivalenceTemplateDTO> getDefaultTemplates() {
        return List.of(
                FunEquivalenceTemplateDTO.builder()
                        .name("一碗米饭")
                        .stepsPer(3000)
                        .icon("🍚")
                        .build(),
                FunEquivalenceTemplateDTO.builder()
                        .name("一根香蕉")
                        .stepsPer(200)
                        .icon("🍌")
                        .build(),
                FunEquivalenceTemplateDTO.builder()
                        .name("1公里")
                        .stepsPer(1400)
                        .icon("🏃")
                        .build()
        );
    }
}
