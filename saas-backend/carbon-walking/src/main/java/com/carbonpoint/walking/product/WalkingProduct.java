package com.carbonpoint.walking.product;

import com.carbonpoint.platform.ProductModule;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class WalkingProduct implements ProductModule {

    private static final String CODE = "walking";
    private static final String TRIGGER_TYPE = "sensor_data";
    private static final List<String> RULE_CHAIN = List.of("threshold_filter", "formula_calc");
    private static final List<String> FEATURES = List.of(
            "step_calc_config",    // required
            "fun_equivalence",     // optional
            "points_exchange"      // required
    );

    @Override
    public String getCode() {
        return CODE;
    }

    @Override
    public String getName() {
        return "Walking Step Counter";
    }

    @Override
    public String getTriggerType() {
        return TRIGGER_TYPE;
    }

    @Override
    public List<String> getRuleChain() {
        return RULE_CHAIN;
    }

    @Override
    public List<String> getFeatures() {
        return FEATURES;
    }
}
