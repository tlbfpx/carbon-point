package com.carbonpoint.platform.feature;

import com.carbonpoint.platform.Feature;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Feature for special date multiplier configuration.
 * Supports specific dates (e.g., holidays) and recurring patterns (e.g., monthly).
 */
public class SpecialDateFeature implements Feature {

    @Override
    public String getType() {
        return "specialDate";
    }

    @Override
    public String getName() {
        return "特殊日期加倍";
    }

    @Override
    public boolean isRequired() {
        return false;
    }

    @Override
    public Map<String, Object> getDefaultConfig() {
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("enabled", true);

        List<Map<String, Object>> dates = List.of(
                Map.of("date", "2026-01-01", "multiplier", 2.0, "name", "元旦"),
                Map.of("date", "2026-02-17", "multiplier", 2.0, "name", "春节"),
                Map.of("date", "2026-05-01", "multiplier", 2.0, "name", "劳动节"),
                Map.of("date", "2026-10-01", "multiplier", 2.0, "name", "国庆节"),
                Map.of("recurring", "MONTHLY", "dayOfMonth", 1, "multiplier", 1.5, "name", "每月1号")
        );
        config.put("specialDates", dates);

        return config;
    }
}
