package com.carbonpoint.platform;

import java.util.List;

/**
 * SPI interface for pluggable product modules.
 * Each product (e.g. check-in, reading, running) implements this interface
 * and is auto-discovered by the {@link com.carbonpoint.platform.registry.ProductRegistry}.
 */
public interface ProductModule {

    /**
     * Unique product code, e.g. "checkin", "reading".
     */
    String getCode();

    /**
     * Human-readable product name.
     */
    String getName();

    /**
     * How this product is triggered, e.g. "manual", "device", "api".
     */
    String getTriggerType();

    /**
     * Ordered list of rule node bean names that form the processing chain.
     */
    List<String> getRuleChain();

    /**
     * Feature types this product exposes.
     */
    List<String> getFeatures();
}
