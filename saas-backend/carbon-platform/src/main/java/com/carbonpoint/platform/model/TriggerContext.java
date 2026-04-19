package com.carbonpoint.platform.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Input context for a trigger execution.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TriggerContext {

    /**
     * The user who triggered the action.
     */
    private Long userId;

    /**
     * The tenant the user belongs to.
     */
    private Long tenantId;

    /**
     * The product code, e.g. "checkin".
     */
    private String productCode;

    /**
     * Arbitrary parameters for the trigger.
     */
    private Map<String, Object> params;
}
