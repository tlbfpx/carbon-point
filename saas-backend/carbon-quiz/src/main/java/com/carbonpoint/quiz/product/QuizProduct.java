package com.carbonpoint.quiz.product;

import com.carbonpoint.platform.ProductModule;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class QuizProduct implements ProductModule {

    private static final String CODE = "quiz";
    private static final String TRIGGER_TYPE = "manual";
    private static final List<String> RULE_CHAIN = List.of(
            "quiz_check",
            "quiz_points",
            "level_coefficient",
            "round",
            "daily_cap"
    );
    private static final List<String> FEATURES = List.of(
            "quiz.enabled",
            "quiz.question_types",
            "quiz.daily_limit",
            "quiz.analysis"
    );

    @Override
    public String getCode() {
        return CODE;
    }

    @Override
    public String getName() {
        return "答题积分";
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
