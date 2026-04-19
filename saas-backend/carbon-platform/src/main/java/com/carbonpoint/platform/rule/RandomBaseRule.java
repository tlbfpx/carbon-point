package com.carbonpoint.platform.rule;

import com.carbonpoint.platform.RuleNode;
import com.carbonpoint.platform.model.RuleContext;
import com.carbonpoint.platform.model.RuleResult;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Rule node that generates random base points within [minPoints, maxPoints] range
 * from the tenant configuration.
 */
public class RandomBaseRule implements RuleNode {

    @Override
    public RuleResult apply(RuleContext context) {
        Map<String, Object> config = context.getTenantConfig();

        Object minObj = config.get("minPoints");
        Object maxObj = config.get("maxPoints");

        if (minObj == null || maxObj == null) {
            return RuleResult.passthrough(context.getCurrentPoints());
        }

        int minPoints = toInt(minObj);
        int maxPoints = toInt(maxObj);

        int basePoints = minPoints + ThreadLocalRandom.current().nextInt(maxPoints - minPoints + 1);

        Map<String, Object> meta = new HashMap<>();
        meta.put("basePoints", basePoints);
        meta.put("minPoints", minPoints);
        meta.put("maxPoints", maxPoints);

        return RuleResult.of(basePoints, meta);
    }

    @Override
    public String getName() {
        return "randomBase";
    }

    private int toInt(Object value) {
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        return Integer.parseInt(String.valueOf(value));
    }
}
