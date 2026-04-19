package com.carbonpoint.platform.trigger;

import com.carbonpoint.platform.Trigger;
import com.carbonpoint.platform.model.TriggerContext;
import com.carbonpoint.platform.model.TriggerResult;

import java.util.HashMap;
import java.util.Map;

/**
 * Trigger for sensor-data (walking) products.
 * Validates step count against threshold and produces
 * step count and source info for the rule chain.
 */
public class SensorDataTrigger implements Trigger {

    private static final String PRODUCT_CODE = "walking";

    @Override
    public TriggerResult execute(TriggerContext context) {
        Map<String, Object> params = context.getParams();
        if (params == null || !params.containsKey("stepCount")) {
            return TriggerResult.fail("Missing stepCount parameter");
        }

        int stepCount;
        try {
            stepCount = Integer.parseInt(String.valueOf(params.get("stepCount")));
        } catch (NumberFormatException e) {
            return TriggerResult.fail("Invalid stepCount value: " + params.get("stepCount"));
        }

        if (stepCount < 0) {
            return TriggerResult.fail("stepCount must be non-negative");
        }

        String source = params.containsKey("source") ? String.valueOf(params.get("source")) : "device";

        Map<String, Object> data = new HashMap<>();
        data.put("stepCount", stepCount);
        data.put("source", source);
        data.put("triggeredAt", System.currentTimeMillis());

        // Pass threshold if provided for downstream rule nodes
        if (params.containsKey("threshold")) {
            data.put("threshold", params.get("threshold"));
        }

        return TriggerResult.success(data);
    }

    @Override
    public String getProductCode() {
        return PRODUCT_CODE;
    }
}
