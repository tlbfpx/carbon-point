package com.carbonpoint.stair.product;

import com.carbonpoint.platform.ProductModule;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class StairClimbingProduct implements ProductModule {

    private static final String CODE = "stair_climbing";
    private static final String TRIGGER_TYPE = "check_in";

    private static final List<String> RULE_CHAIN = List.of(
            "time_slot_match",
            "random_base",
            "special_date_multiplier",
            "level_coefficient",
            "round",
            "daily_cap"
    );

    private static final List<String> FEATURES = List.of(
            "time_slot_config",
            "special_date",
            "weekly_gift",
            "consecutive_reward",
            "points_exchange"
    );

    @Override
    public String getCode() {
        return CODE;
    }

    @Override
    public String getName() {
        return "Stair Climbing";
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
