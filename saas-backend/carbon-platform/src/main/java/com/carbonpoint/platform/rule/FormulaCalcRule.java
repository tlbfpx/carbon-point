package com.carbonpoint.platform.rule;

import com.carbonpoint.platform.RuleNode;
import com.carbonpoint.platform.model.RuleContext;
import com.carbonpoint.platform.model.RuleResult;

import java.util.HashMap;
import java.util.Map;

/**
 * Rule node for walking products: calculates floor(steps * coefficient).
 */
public class FormulaCalcRule implements RuleNode {

    @Override
    public RuleResult apply(RuleContext context) {
        Map<String, Object> config = context.getTenantConfig();
        Object coeffObj = config.get("coefficient");

        if (coeffObj == null) {
            return RuleResult.passthrough(context.getCurrentPoints());
        }

        Object stepObj = context.getTriggerData().get("stepCount");
        if (stepObj == null) {
            return RuleResult.passthrough(context.getCurrentPoints());
        }

        double coefficient = toDouble(coeffObj);
        int stepCount = toInt(stepObj);

        int calculated = (int) Math.floor(stepCount * coefficient);

        Map<String, Object> meta = new HashMap<>();
        meta.put("formula", String.format("floor(%d * %s)", stepCount, coefficient));
        meta.put("stepCount", stepCount);
        meta.put("coefficient", coefficient);

        return RuleResult.of(calculated, meta);
    }

    @Override
    public String getName() {
        return "formulaCalc";
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
