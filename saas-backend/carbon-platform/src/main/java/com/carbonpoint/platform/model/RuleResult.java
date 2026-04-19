package com.carbonpoint.platform.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Collections;
import java.util.Map;

/**
 * Result of a rule node execution.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RuleResult {

    /**
     * The points value after this rule was applied.
     */
    private int points;

    /**
     * Whether this rule modified the points value.
     */
    private boolean applied;

    /**
     * Metadata produced by this rule node (e.g. multiplier used, cap hit).
     */
    private Map<String, Object> metadata;

    /**
     * Create a passthrough result that does not modify points.
     */
    public static RuleResult passthrough(int currentPoints) {
        return RuleResult.builder()
                .points(currentPoints)
                .applied(false)
                .metadata(Collections.emptyMap())
                .build();
    }

    /**
     * Create a result with modified points.
     */
    public static RuleResult of(int points, Map<String, Object> metadata) {
        return RuleResult.builder()
                .points(points)
                .applied(true)
                .metadata(metadata != null ? metadata : Collections.emptyMap())
                .build();
    }
}
