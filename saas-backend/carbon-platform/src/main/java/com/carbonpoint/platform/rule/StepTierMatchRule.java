package com.carbonpoint.platform.rule;

import com.carbonpoint.platform.RuleNode;
import com.carbonpoint.platform.model.RuleContext;
import com.carbonpoint.platform.model.RuleResult;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Rule node that matches step count against configured walking tier rules.
 * Finds the first tier where minSteps <= steps < maxSteps and returns its points.
 * If no tier matches, returns 0 points.
 */
@Component
public class StepTierMatchRule implements RuleNode {

    private static final double CALORIES_PER_STEP = 0.04; // ~40 calories per 1000 steps

    @Override
    @SuppressWarnings("unchecked")
    public RuleResult apply(RuleContext context) {
        Object stepsObj = context.getTriggerData().get("steps");
        if (stepsObj == null) {
            stepsObj = context.getTriggerData().get("stepCount");
        }
        if (stepsObj == null) {
            return RuleResult.of(0, metadata(null, false, 0));
        }

        int steps = toInt(stepsObj);
        List<Map<String, Object>> walkingTiers = extractWalkingTiers(context);

        if (walkingTiers == null || walkingTiers.isEmpty()) {
            return RuleResult.of(0, metadata(null, false, steps));
        }

        // Sort tiers by minSteps ascending
        List<Map<String, Object>> sorted = new ArrayList<>(walkingTiers);
        sorted.sort((a, b) -> {
            int minA = toInt(a.getOrDefault("minSteps", 0));
            int minB = toInt(b.getOrDefault("minSteps", 0));
            return Integer.compare(minA, minB);
        });

        for (Map<String, Object> tier : sorted) {
            int minSteps = toInt(tier.getOrDefault("minSteps", 0));
            int maxSteps = toInt(tier.getOrDefault("maxSteps", Integer.MAX_VALUE));
            int points = toInt(tier.getOrDefault("points", 0));

            if (steps >= minSteps && steps < maxSteps) {
                Map<String, Object> meta = new HashMap<>();
                meta.put("matchedTier", tier);
                meta.put("tierMatched", true);
                meta.put("steps", steps);
                meta.put("points", points);
                return RuleResult.of(points, meta);
            }
        }

        return RuleResult.of(0, metadata(null, false, steps));
    }

    @Override
    public String getName() {
        return "stepTierMatch";
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> extractWalkingTiers(RuleContext context) {
        Object tiers = context.getTenantConfig().get("walkingTiers");
        if (tiers instanceof List) {
            return (List<Map<String, Object>>) tiers;
        }
        return null;
    }

    private int toInt(Object value) {
        if (value == null) return 0;
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private Map<String, Object> metadata(Object matchedTier, boolean matched, int steps) {
        Map<String, Object> meta = new HashMap<>();
        meta.put("matchedTier", matchedTier);
        meta.put("tierMatched", matched);
        meta.put("steps", steps);
        return meta;
    }
}
