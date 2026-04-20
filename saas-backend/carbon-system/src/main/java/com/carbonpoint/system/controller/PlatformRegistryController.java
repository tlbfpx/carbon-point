package com.carbonpoint.system.controller;

import com.carbonpoint.common.result.Result;
import com.carbonpoint.platform.Feature;
import com.carbonpoint.platform.ProductModule;
import com.carbonpoint.platform.registry.ProductRegistry;
import com.carbonpoint.system.dto.res.RegistryModuleRes;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Exposes the SPI registry so the platform admin UI can discover
 * available triggers, rule nodes, and feature templates.
 */
@RestController
@RequestMapping("/platform/registry")
@RequiredArgsConstructor
public class PlatformRegistryController {

    private static final Map<String, String> RULE_NODE_DESCRIPTIONS = new LinkedHashMap<>();
    private static final Map<String, String> TRIGGER_DESCRIPTIONS = new LinkedHashMap<>();

    static {
        TRIGGER_DESCRIPTIONS.put("checkin", "用户手动打卡触发，验证打卡时间是否在有效时段内");
        TRIGGER_DESCRIPTIONS.put("sensor", "传感器数据触发（走路计步），验证步数是否达到阈值");
        TRIGGER_DESCRIPTIONS.put("manual", "用户手动触发");

        RULE_NODE_DESCRIPTIONS.put("timeSlotMatch", "时段匹配 — 检查触发时间是否在允许的时段内");
        RULE_NODE_DESCRIPTIONS.put("randomBase", "随机基数 — 在配置的积分区间内随机生成基础积分");
        RULE_NODE_DESCRIPTIONS.put("specialDateMultiplier", "特殊日期倍率 — 节假日/特殊日期积分翻倍");
        RULE_NODE_DESCRIPTIONS.put("levelCoefficient", "等级系数 — 根据用户等级调整积分系数");
        RULE_NODE_DESCRIPTIONS.put("round", "数值取整 — 对积分结果进行四舍五入处理");
        RULE_NODE_DESCRIPTIONS.put("dailyCap", "每日上限 — 检查当日累计积分是否超过每日上限");
        RULE_NODE_DESCRIPTIONS.put("thresholdFilter", "步数阈值过滤 — 过滤不满足最低步数要求的数据");
        RULE_NODE_DESCRIPTIONS.put("formulaCalc", "步数公式换算 — 按公式将步数换算为积分");
    }

    private final ProductRegistry productRegistry;

    /**
     * List all registered product modules with full metadata.
     * GET /platform/registry/modules
     */
    @GetMapping("/modules")
    public Result<List<RegistryModuleRes>> getModules() {
        List<RegistryModuleRes> result = productRegistry.getAllModules().stream()
                .map(this::toModuleRes)
                .toList();
        return Result.success(result);
    }

    /**
     * Get a single module by code.
     * GET /platform/registry/modules/{code}
     */
    @GetMapping("/modules/{code}")
    public Result<RegistryModuleRes> getModule(@PathVariable String code) {
        return productRegistry.getModule(code)
                .map(module -> Result.success(toModuleRes(module)))
                .orElse(Result.error(com.carbonpoint.common.result.ErrorCode.NOT_FOUND, "产品模块不存在: " + code));
    }

    /**
     * List all unique trigger types across all registered modules.
     * GET /platform/registry/triggers
     */
    @GetMapping("/triggers")
    public Result<List<RegistryModuleRes.TriggerInfo>> getTriggers() {
        Set<String> seen = new LinkedHashSet<>();
        List<RegistryModuleRes.TriggerInfo> triggers = new ArrayList<>();
        for (ProductModule module : productRegistry.getAllModules()) {
            String type = module.getTriggerType();
            if (seen.add(type)) {
                triggers.add(RegistryModuleRes.TriggerInfo.builder()
                        .type(type)
                        .name(getTriggerName(type))
                        .productCode(module.getCode())
                        .description(TRIGGER_DESCRIPTIONS.getOrDefault(type, ""))
                        .build());
            }
        }
        return Result.success(triggers);
    }

    /**
     * List all unique rule node types across all registered modules.
     * GET /platform/registry/rule-nodes
     */
    @GetMapping("/rule-nodes")
    public Result<List<RegistryModuleRes.RuleNodeInfo>> getRuleNodes() {
        Set<String> seen = new LinkedHashSet<>();
        List<RegistryModuleRes.RuleNodeInfo> nodes = new ArrayList<>();
        for (ProductModule module : productRegistry.getAllModules()) {
            List<String> chain = module.getRuleChain();
            if (chain != null) {
                for (int i = 0; i < chain.size(); i++) {
                    String name = chain.get(i);
                    if (seen.add(name)) {
                        nodes.add(RegistryModuleRes.RuleNodeInfo.builder()
                                .name(name)
                                .description(RULE_NODE_DESCRIPTIONS.getOrDefault(name, ""))
                                .sortOrder(i)
                                .build());
                    }
                }
            }
        }
        nodes.sort(Comparator.comparingInt(RegistryModuleRes.RuleNodeInfo::getSortOrder));
        return Result.success(nodes);
    }

    /**
     * List all unique feature types across all registered modules.
     * GET /platform/registry/features
     */
    @GetMapping("/features")
    public Result<List<RegistryModuleRes.FeatureInfo>> getFeatures() {
        Set<String> seen = new LinkedHashSet<>();
        List<RegistryModuleRes.FeatureInfo> features = new ArrayList<>();
        for (ProductModule module : productRegistry.getAllModules()) {
            List<String> featureTypes = module.getFeatures();
            if (featureTypes != null) {
                for (String type : featureTypes) {
                    if (seen.add(type)) {
                        features.add(RegistryModuleRes.FeatureInfo.builder()
                                .type(type)
                                .name(getFeatureName(type))
                                .required(false)
                                .defaultConfig(Map.of())
                                .build());
                    }
                }
            }
        }
        return Result.success(features);
    }

    private RegistryModuleRes toModuleRes(ProductModule module) {
        List<RegistryModuleRes.RuleNodeInfo> ruleNodes = new ArrayList<>();
        List<String> chain = module.getRuleChain();
        if (chain != null) {
            for (int i = 0; i < chain.size(); i++) {
                String name = chain.get(i);
                ruleNodes.add(RegistryModuleRes.RuleNodeInfo.builder()
                        .name(name)
                        .description(RULE_NODE_DESCRIPTIONS.getOrDefault(name, ""))
                        .sortOrder(i)
                        .build());
            }
        }

        List<RegistryModuleRes.FeatureInfo> featureDetails = new ArrayList<>();
        List<String> featureTypes = module.getFeatures();
        if (featureTypes != null) {
            for (String type : featureTypes) {
                featureDetails.add(RegistryModuleRes.FeatureInfo.builder()
                        .type(type)
                        .name(getFeatureName(type))
                        .required(false)
                        .defaultConfig(Map.of())
                        .build());
            }
        }

        return RegistryModuleRes.builder()
                .code(module.getCode())
                .name(module.getName())
                .triggerType(module.getTriggerType())
                .ruleChain(chain)
                .features(featureTypes)
                .trigger(RegistryModuleRes.TriggerInfo.builder()
                        .type(module.getTriggerType())
                        .name(getTriggerName(module.getTriggerType()))
                        .productCode(module.getCode())
                        .description(TRIGGER_DESCRIPTIONS.getOrDefault(module.getTriggerType(), ""))
                        .build())
                .ruleNodes(ruleNodes)
                .featureDetails(featureDetails)
                .build();
    }

    private String getTriggerName(String type) {
        return switch (type) {
            case "checkin" -> "打卡触发器";
            case "sensor" -> "传感器数据触发器";
            case "manual" -> "手动触发器";
            default -> type;
        };
    }

    private String getFeatureName(String type) {
        return switch (type) {
            case "consecutive_reward" -> "连续打卡奖励";
            case "special_date" -> "特殊日期";
            case "fun_equivalence" -> "趣味等价物";
            case "points_exchange" -> "积分兑换";
            case "time_slot" -> "时段规则";
            case "daily_cap" -> "每日上限";
            case "holiday_bonus" -> "节假日加成";
            default -> type;
        };
    }
}
