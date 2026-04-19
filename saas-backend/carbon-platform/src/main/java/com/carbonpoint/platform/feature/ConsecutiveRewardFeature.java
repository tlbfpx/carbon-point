package com.carbonpoint.platform.feature;

import com.carbonpoint.platform.Feature;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Feature that tracks consecutive check-in days and awards bonus points
 * at configured milestones (e.g., 7-day streak, 30-day streak).
 */
public class ConsecutiveRewardFeature implements Feature {

    @Override
    public String getType() {
        return "consecutiveReward";
    }

    @Override
    public String getName() {
        return "连续打卡奖励";
    }

    @Override
    public boolean isRequired() {
        return false;
    }

    @Override
    public Map<String, Object> getDefaultConfig() {
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("enabled", true);

        List<Map<String, Object>> milestones = List.of(
                Map.of("days", 3, "bonusPoints", 50, "name", "连续3天"),
                Map.of("days", 7, "bonusPoints", 200, "name", "连续7天"),
                Map.of("days", 30, "bonusPoints", 1000, "name", "连续30天")
        );
        config.put("milestones", milestones);

        return config;
    }
}
