package com.carbonpoint.platform.feature;

import com.carbonpoint.platform.Feature;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Feature that marks a product as supporting cross-product points exchange.
 * This is a required feature for products participating in the shared points pool.
 */
public class PointsExchangeFeature implements Feature {

    @Override
    public String getType() {
        return "pointsExchange";
    }

    @Override
    public String getName() {
        return "积分互通";
    }

    @Override
    public boolean isRequired() {
        return true;
    }

    @Override
    public Map<String, Object> getDefaultConfig() {
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("enabled", true);
        config.put("exchangeRate", 1.0);
        config.put("direction", "BOTH"); // BOTH, IN, OUT
        return config;
    }
}
