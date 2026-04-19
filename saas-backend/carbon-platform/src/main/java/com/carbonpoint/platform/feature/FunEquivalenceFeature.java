package com.carbonpoint.platform.feature;

import com.carbonpoint.platform.Feature;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Feature for fun equivalence display.
 * Shows step-to-item equivalences like "500 steps = 10 bananas = 2 bowls of rice".
 */
public class FunEquivalenceFeature implements Feature {

    @Override
    public String getType() {
        return "funEquivalence";
    }

    @Override
    public String getName() {
        return "趣味等效换算";
    }

    @Override
    public boolean isRequired() {
        return false;
    }

    @Override
    public Map<String, Object> getDefaultConfig() {
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("enabled", true);

        List<Map<String, Object>> items = List.of(
                Map.of("key", "banana", "label", "香蕉", "stepsPerUnit", 50),
                Map.of("key", "rice", "label", "米饭(碗)", "stepsPerUnit", 200),
                Map.of("key", "cola", "label", "可乐(罐)", "stepsPerUnit", 150)
        );
        config.put("items", items);

        return config;
    }

    /**
     * Calculate equivalence quantities for a given step count.
     *
     * @param steps total step count
     * @param items list of equivalence items to calculate against
     * @return map of item key to quantity (floored)
     */
    public Map<String, Number> calculate(int steps, List<EquivalenceItem> items) {
        Map<String, Number> result = new LinkedHashMap<>();
        for (EquivalenceItem item : items) {
            int quantity = item.getStepsPerUnit() > 0
                    ? (int) Math.floor((double) steps / item.getStepsPerUnit())
                    : 0;
            result.put(item.getKey(), quantity);
        }
        return result;
    }

    /**
     * Represents a single equivalence item (e.g., "banana" = 50 steps per unit).
     */
    @Data
    @AllArgsConstructor
    public static class EquivalenceItem {
        private String key;
        private String label;
        private int stepsPerUnit;
    }
}
