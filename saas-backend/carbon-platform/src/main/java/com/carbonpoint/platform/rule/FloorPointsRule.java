package com.carbonpoint.platform.rule;

import com.carbonpoint.platform.RuleNode;
import com.carbonpoint.platform.model.RuleContext;
import com.carbonpoint.platform.model.RuleResult;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Rule node that calculates base points by floor count multiplied by points_per_floor.
 * <p>
 * Reads floorCount and pointsPerFloor from triggerData.
 * If either is null/missing, passes through (feature not enabled, falls to random_base).
 * Returns RuleResult.of(calculatedPoints) with basePoints, floorCount, pointsPerFloor metadata.
 */
@Component
public class FloorPointsRule implements RuleNode {

    @Override
    public RuleResult apply(RuleContext context) {
        Map<String, Object> triggerData = context.getTriggerData();

        Object floorCountObj = triggerData.get("floorCount");
        Object pointsPerFloorObj = triggerData.get("pointsPerFloor");

        // Feature not enabled — passthrough to next rule (e.g. randomBase)
        if (floorCountObj == null || pointsPerFloorObj == null) {
            return RuleResult.passthrough(context.getCurrentPoints());
        }

        int floorCount = toInt(floorCountObj);
        int pointsPerFloor = toInt(pointsPerFloorObj);

        if (floorCount <= 0 || pointsPerFloor <= 0) {
            return RuleResult.passthrough(context.getCurrentPoints());
        }

        int calculatedPoints = floorCount * pointsPerFloor;

        Map<String, Object> meta = new HashMap<>();
        meta.put("basePoints", calculatedPoints);
        meta.put("floorCount", floorCount);
        meta.put("pointsPerFloor", pointsPerFloor);

        return RuleResult.of(calculatedPoints, meta);
    }

    @Override
    public String getName() {
        return "floorPoints";
    }

    private int toInt(Object value) {
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        return Integer.parseInt(String.valueOf(value));
    }
}
