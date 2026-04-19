package com.carbonpoint.platform.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.Map;

/**
 * Input context for a rule node execution.
 * Immutable — rule nodes read from this context but cannot mutate it.
 */
@Getter
@Builder
@AllArgsConstructor
public class RuleContext {

    /**
     * The user being evaluated.
     */
    private final Long userId;

    /**
     * The tenant the user belongs to.
     */
    private final Long tenantId;

    /**
     * The product code being processed.
     */
    private final String productCode;

    /**
     * Initial point value entering the rule chain.
     */
    private final int currentPoints;

    /**
     * Tenant-specific configuration for rules.
     */
    private final Map<String, Object> tenantConfig;

    /**
     * Data produced by the trigger.
     */
    private final Map<String, Object> triggerData;
}
