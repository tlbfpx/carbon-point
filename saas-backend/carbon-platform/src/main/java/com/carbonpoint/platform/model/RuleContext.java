package com.carbonpoint.platform.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Input context for a rule node execution.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RuleContext {

    /**
     * The user being evaluated.
     */
    private Long userId;

    /**
     * The tenant the user belongs to.
     */
    private Long tenantId;

    /**
     * The product code being processed.
     */
    private String productCode;

    /**
     * Current point value entering this rule node.
     */
    private int currentPoints;

    /**
     * Tenant-specific configuration for rules.
     */
    private Map<String, Object> tenantConfig;

    /**
     * Data produced by the trigger.
     */
    private Map<String, Object> triggerData;
}
