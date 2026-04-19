package com.carbonpoint.platform.rule;

import com.carbonpoint.platform.RuleNode;
import com.carbonpoint.platform.model.RuleContext;
import com.carbonpoint.platform.model.RuleResult;

import java.util.HashMap;
import java.util.Map;

/**
 * Rule node for walking products: filters out points if step count
 * is below the configured threshold.
 */
public class ThresholdFilterRule implements RuleNode {

    @Override
    public RuleResult apply(RuleContext context) {
        Map<String, Object> config = context.getTenantConfig();
        Object thresholdObj = config.get("threshold");

        if (thresholdObj == null) {
            return RuleResult.passthrough(context.getCurrentPoints());
        }

        Object stepObj = context.getTriggerData().get("stepCount");
        if (stepObj == null) {
            return RuleResult.passthrough(context.getCurrentPoints());
        }

        int threshold = toInt(thresholdObj);
        int stepCount = toInt(stepObj);

        if (stepCount < threshold) {
            Map<String, Object> meta = new HashMap<>();
            meta.put("filtered", true);
            meta.put("stepCount", stepCount);
            meta.put("threshold", threshold);
            return RuleResult.of(0, meta);
        }

        return RuleResult.passthrough(context.getCurrentPoints());
    }

    @Override
    public String getName() {
        return "thresholdFilter";
    }

    private int toInt(Object value) {
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        return Integer.parseInt(String.valueOf(value));
    }
}
