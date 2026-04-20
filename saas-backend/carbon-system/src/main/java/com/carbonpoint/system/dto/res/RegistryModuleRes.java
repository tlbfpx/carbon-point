package com.carbonpoint.system.dto.res;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Response DTO for a registered ProductModule from the SPI registry.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegistryModuleRes {
    private String code;
    private String name;
    private String triggerType;
    private List<String> ruleChain;
    private List<String> features;

    /**
     * Resolved trigger info from the module's trigger type.
     */
    private TriggerInfo trigger;

    /**
     * Resolved rule node descriptions.
     */
    private List<RuleNodeInfo> ruleNodes;

    /**
     * Resolved feature descriptions.
     */
    private List<FeatureInfo> featureDetails;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TriggerInfo {
        private String type;
        private String name;
        private String productCode;
        private String description;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RuleNodeInfo {
        private String name;
        private String description;
        private Integer sortOrder;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FeatureInfo {
        private String type;
        private String name;
        private boolean required;
        private Map<String, Object> defaultConfig;
    }
}
