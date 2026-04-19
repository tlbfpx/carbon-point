package com.carbonpoint.platform.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Collections;
import java.util.Map;

/**
 * Result of a trigger execution.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TriggerResult {

    /**
     * Whether the trigger was successful.
     */
    private boolean success;

    /**
     * Human-readable message (error detail on failure, description on success).
     */
    private String message;

    /**
     * Data produced by the trigger to feed into the rule chain.
     */
    private Map<String, Object> data;

    /**
     * Create a successful result with no data.
     */
    public static TriggerResult success() {
        return TriggerResult.builder()
                .success(true)
                .message("OK")
                .data(Collections.emptyMap())
                .build();
    }

    /**
     * Create a successful result with data.
     */
    public static TriggerResult success(Map<String, Object> data) {
        return TriggerResult.builder()
                .success(true)
                .message("OK")
                .data(data)
                .build();
    }

    /**
     * Create a failed result with a message.
     */
    public static TriggerResult fail(String message) {
        return TriggerResult.builder()
                .success(false)
                .message(message)
                .data(Collections.emptyMap())
                .build();
    }
}
