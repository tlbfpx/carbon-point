package com.carbonpoint.platform.rule;

import com.carbonpoint.platform.RuleNode;
import com.carbonpoint.platform.model.RuleContext;
import com.carbonpoint.platform.model.RuleResult;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Rule node that checks if today is a special date and applies a multiplier.
 * Supports specific dates and recurring monthly patterns.
 */
@Component
public class SpecialDateMultiplierRule implements RuleNode {

    @Override
    @SuppressWarnings("unchecked")
    public RuleResult apply(RuleContext context) {
        Map<String, Object> config = context.getTenantConfig();
        Object datesObj = config.get("specialDates");

        if (!(datesObj instanceof List)) {
            return RuleResult.passthrough(context.getCurrentPoints());
        }

        List<Map<String, Object>> specialDates = (List<Map<String, Object>>) datesObj;
        if (specialDates.isEmpty()) {
            return RuleResult.passthrough(context.getCurrentPoints());
        }

        LocalDate today = LocalDate.now();
        Double multiplier = findMultiplier(specialDates, today);

        if (multiplier == null) {
            return RuleResult.passthrough(context.getCurrentPoints());
        }

        int newPoints = (int) Math.round(context.getCurrentPoints() * multiplier);

        Map<String, Object> meta = new HashMap<>();
        meta.put("specialDateMultiplier", multiplier);
        meta.put("specialDateApplied", true);

        return RuleResult.of(newPoints, meta);
    }

    @Override
    public String getName() {
        return "specialDateMultiplier";
    }

    private Double findMultiplier(List<Map<String, Object>> specialDates, LocalDate today) {
        for (Map<String, Object> dateEntry : specialDates) {
            // Check specific date
            if (dateEntry.containsKey("date")) {
                String dateStr = String.valueOf(dateEntry.get("date"));
                LocalDate date = LocalDate.parse(dateStr);
                if (date.equals(today)) {
                    return toDouble(dateEntry.get("multiplier"));
                }
            }

            // Check recurring monthly pattern
            if (dateEntry.containsKey("recurring")) {
                String recurring = String.valueOf(dateEntry.get("recurring"));
                if ("MONTHLY".equals(recurring)) {
                    int dayOfMonth = toInt(dateEntry.get("dayOfMonth"));
                    if (today.getDayOfMonth() == dayOfMonth) {
                        return toDouble(dateEntry.get("multiplier"));
                    }
                }
            }
        }
        return null;
    }

    private double toDouble(Object value) {
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        return Double.parseDouble(String.valueOf(value));
    }

    private int toInt(Object value) {
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        return Integer.parseInt(String.valueOf(value));
    }
}
