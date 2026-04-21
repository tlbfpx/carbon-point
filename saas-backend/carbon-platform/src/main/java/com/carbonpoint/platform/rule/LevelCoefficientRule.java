package com.carbonpoint.platform.rule;

import com.carbonpoint.platform.RuleNode;
import com.carbonpoint.platform.model.RuleContext;
import com.carbonpoint.platform.model.RuleResult;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Rule node that applies level-based coefficient to points.
 * Levels: 1=1.0x, 2=1.2x, 3=1.5x, 4=2.0x, 5=2.5x.
 */
@Component
public class LevelCoefficientRule implements RuleNode {

    @Override
    public RuleResult apply(RuleContext context) {
        Object levelObj = context.getTriggerData().get("userLevel");
        if (levelObj == null) {
            return RuleResult.passthrough(context.getCurrentPoints());
        }

        int level = toInt(levelObj);
        double coefficient = getCoefficient(level);

        int newPoints = (int) Math.round(context.getCurrentPoints() * coefficient);

        Map<String, Object> meta = new HashMap<>();
        meta.put("levelCoefficient", coefficient);
        meta.put("userLevel", level);

        return RuleResult.of(newPoints, meta);
    }

    @Override
    public String getName() {
        return "levelCoefficient";
    }

    private double getCoefficient(int level) {
        return switch (level) {
            case 1 -> 1.0;
            case 2 -> 1.2;
            case 3 -> 1.5;
            case 4 -> 2.0;
            case 5 -> 2.5;
            default -> 1.0;
        };
    }

    private int toInt(Object value) {
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        return Integer.parseInt(String.valueOf(value));
    }
}
