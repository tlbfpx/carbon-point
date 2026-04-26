package com.carbonpoint.platform.rule;

import com.carbonpoint.platform.RuleNode;
import com.carbonpoint.platform.model.RuleContext;
import com.carbonpoint.platform.model.RuleResult;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * DISPLAY ONLY rule node — does not modify points.
 * Calculates fun conversions from steps to calories to real-world items
 * and attaches the results as metadata for frontend display.
 */
@Component
public class FunConversionRule implements RuleNode {

    private static final double CALORIES_PER_STEP = 0.04; // ~40 calories per 1000 steps

    @Override
    @SuppressWarnings("unchecked")
    public RuleResult apply(RuleContext context) {
        Object stepsObj = context.getTriggerData().get("steps");
        if (stepsObj == null) {
            stepsObj = context.getTriggerData().get("stepCount");
        }

        int steps = stepsObj != null ? toInt(stepsObj) : 0;
        double totalCalories = steps * CALORIES_PER_STEP;

        List<Map<String, Object>> conversionRules = extractConversionRules(context);
        List<Map<String, Object>> conversions = new ArrayList<>();

        if (conversionRules != null && !conversionRules.isEmpty()) {
            for (Map<String, Object> rule : conversionRules) {
                String itemName = String.valueOf(rule.getOrDefault("itemName", ""));
                String unit = String.valueOf(rule.getOrDefault("unit", ""));
                String icon = String.valueOf(rule.getOrDefault("icon", ""));
                double caloriesPerUnit = toDouble(rule.getOrDefault("caloriesPerUnit", 1.0));

                double quantity = totalCalories / caloriesPerUnit;
                quantity = Math.round(quantity * 100.0) / 100.0;

                if (quantity > 0.01) {
                    Map<String, Object> conversion = new LinkedHashMap<>();
                    conversion.put("itemName", itemName);
                    conversion.put("unit", unit);
                    conversion.put("icon", icon);
                    conversion.put("quantity", quantity);
                    conversion.put("caloriesPerUnit", caloriesPerUnit);
                    conversions.add(conversion);
                }
            }
        }

        Map<String, Object> meta = new HashMap<>();
        meta.put("steps", steps);
        meta.put("totalCalories", Math.round(totalCalories * 100.0) / 100.0);
        meta.put("conversions", conversions);

        // Passthrough — this rule does not modify points
        return RuleResult.builder()
                .points(context.getCurrentPoints())
                .applied(false)
                .metadata(meta)
                .build();
    }

    @Override
    public String getName() {
        return "funConversion";
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> extractConversionRules(RuleContext context) {
        Object rules = context.getTenantConfig().get("funConversions");
        if (rules instanceof List) {
            return (List<Map<String, Object>>) rules;
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

    private double toDouble(Object value) {
        if (value == null) return 0.0;
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }
}
