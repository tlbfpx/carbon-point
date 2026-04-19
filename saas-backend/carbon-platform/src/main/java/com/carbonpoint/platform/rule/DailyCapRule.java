package com.carbonpoint.platform.rule;

import com.carbonpoint.platform.RuleNode;
import com.carbonpoint.platform.model.RuleContext;
import com.carbonpoint.platform.model.RuleResult;

import java.util.HashMap;
import java.util.Map;

/**
 * Rule node that clamps points if the daily cap is exceeded.
 * Compares current daily total + new points against the configured cap.
 */
public class DailyCapRule implements RuleNode {

    @Override
    public RuleResult apply(RuleContext context) {
        Map<String, Object> config = context.getTenantConfig();
        Object capObj = config.get("dailyCap");

        if (capObj == null) {
            return RuleResult.passthrough(context.getCurrentPoints());
        }

        int dailyCap = toInt(capObj);
        if (dailyCap <= 0) {
            return RuleResult.passthrough(context.getCurrentPoints());
        }

        int dailyAwarded = getDailyAwarded(context);
        int currentPoints = context.getCurrentPoints();
        int totalIfAwarded = dailyAwarded + currentPoints;

        if (totalIfAwarded <= dailyCap) {
            return RuleResult.passthrough(currentPoints);
        }

        int allowed = Math.max(0, dailyCap - dailyAwarded);

        Map<String, Object> meta = new HashMap<>();
        meta.put("dailyCapHit", true);
        meta.put("dailyCap", dailyCap);
        meta.put("dailyAwarded", dailyAwarded);
        meta.put("originalPoints", currentPoints);
        meta.put("clampedPoints", allowed);

        return RuleResult.of(allowed, meta);
    }

    @Override
    public String getName() {
        return "dailyCap";
    }

    private int getDailyAwarded(RuleContext context) {
        Object awardedObj = context.getTriggerData().get("dailyAwarded");
        if (awardedObj == null) {
            return 0;
        }
        return toInt(awardedObj);
    }

    private int toInt(Object value) {
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        return Integer.parseInt(String.valueOf(value));
    }
}
