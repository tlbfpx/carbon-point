package com.carbonpoint.platform;

import java.util.Map;

/**
 * SPI interface for product features.
 * A feature represents an optional or required capability of a product module.
 */
public interface Feature {

    /**
     * Feature type identifier, e.g. "leaderboard", "badge", "daily_cap".
     */
    String getType();

    /**
     * Human-readable feature name.
     */
    String getName();

    /**
     * Whether this feature is required for the product to function.
     */
    boolean isRequired();

    /**
     * Default configuration for this feature when activated.
     */
    Map<String, Object> getDefaultConfig();
}
