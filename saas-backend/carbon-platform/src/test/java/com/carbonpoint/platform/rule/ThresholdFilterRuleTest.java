package com.carbonpoint.platform.rule;

import com.carbonpoint.platform.model.RuleContext;
import com.carbonpoint.platform.model.RuleResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("ThresholdFilterRule")
class ThresholdFilterRuleTest {

    private final ThresholdFilterRule rule = new ThresholdFilterRule();

    private RuleContext ctx(int currentPoints, int threshold, int stepCount) {
        return RuleContext.builder()
                .userId(1L)
                .tenantId(100L)
                .productCode("walking")
                .currentPoints(currentPoints)
                .triggerData(Map.of("stepCount", stepCount))
                .tenantConfig(Map.of("threshold", threshold))
                .build();
    }

    @Nested
    @DisplayName("when step count meets threshold")
    class MeetsThreshold {

        @Test
        @DisplayName("passes points through when step count equals threshold")
        void equalThreshold() {
            RuleResult result = rule.apply(ctx(50, 1000, 1000));

            assertThat(result.getPoints()).isEqualTo(50);
            assertThat(result.isApplied()).isFalse();
        }

        @Test
        @DisplayName("passes points through when step count exceeds threshold")
        void exceedsThreshold() {
            RuleResult result = rule.apply(ctx(50, 1000, 5000));

            assertThat(result.getPoints()).isEqualTo(50);
            assertThat(result.isApplied()).isFalse();
        }
    }

    @Nested
    @DisplayName("when step count below threshold")
    class BelowThreshold {

        @Test
        @DisplayName("sets points to 0")
        void setsToZero() {
            RuleResult result = rule.apply(ctx(50, 1000, 500));

            assertThat(result.getPoints()).isEqualTo(0);
            assertThat(result.isApplied()).isTrue();
            assertThat(result.getMetadata()).containsEntry("filtered", true);
        }
    }

    @Nested
    @DisplayName("missing config or data")
    class MissingData {

        @Test
        @DisplayName("passes through when threshold not configured")
        void missingThreshold() {
            RuleContext context = RuleContext.builder()
                    .userId(1L)
                    .tenantId(100L)
                    .productCode("walking")
                    .currentPoints(50)
                    .triggerData(Map.of("stepCount", 100))
                    .tenantConfig(Map.of())
                    .build();

            RuleResult result = rule.apply(context);

            assertThat(result.getPoints()).isEqualTo(50);
            assertThat(result.isApplied()).isFalse();
        }

        @Test
        @DisplayName("passes through when stepCount not in triggerData")
        void missingStepCount() {
            RuleContext context = RuleContext.builder()
                    .userId(1L)
                    .tenantId(100L)
                    .productCode("walking")
                    .currentPoints(50)
                    .triggerData(Map.of())
                    .tenantConfig(Map.of("threshold", 1000))
                    .build();

            RuleResult result = rule.apply(context);

            assertThat(result.getPoints()).isEqualTo(50);
            assertThat(result.isApplied()).isFalse();
        }
    }

    @Test
    @DisplayName("getName returns 'thresholdFilter'")
    void name() {
        assertThat(rule.getName()).isEqualTo("thresholdFilter");
    }
}
