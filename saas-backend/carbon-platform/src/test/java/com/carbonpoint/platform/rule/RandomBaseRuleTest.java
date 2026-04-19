package com.carbonpoint.platform.rule;

import com.carbonpoint.platform.model.RuleContext;
import com.carbonpoint.platform.model.RuleResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("RandomBaseRule")
class RandomBaseRuleTest {

    private final RandomBaseRule rule = new RandomBaseRule();

    private RuleContext ctx(int minPoints, int maxPoints) {
        return RuleContext.builder()
                .userId(1L)
                .tenantId(100L)
                .productCode("checkin")
                .currentPoints(0)
                .triggerData(Map.of())
                .tenantConfig(Map.of("minPoints", minPoints, "maxPoints", maxPoints))
                .build();
    }

    @Nested
    @DisplayName("generates random base points")
    class RandomGeneration {

        @RepeatedTest(20)
        @DisplayName("result is within [minPoints, maxPoints]")
        void withinRange() {
            RuleContext context = ctx(5, 15);

            RuleResult result = rule.apply(context);

            assertThat(result.getPoints()).isBetween(5, 15);
            assertThat(result.isApplied()).isTrue();
        }

        @Test
        @DisplayName("minPoints equals maxPoints returns that exact value")
        void equalRange() {
            RuleContext context = ctx(10, 10);

            RuleResult result = rule.apply(context);

            assertThat(result.getPoints()).isEqualTo(10);
            assertThat(result.isApplied()).isTrue();
        }
    }

    @Nested
    @DisplayName("missing config")
    class MissingConfig {

        @Test
        @DisplayName("returns current points as passthrough when minPoints missing")
        void missingMinPoints() {
            RuleContext context = RuleContext.builder()
                    .userId(1L)
                    .tenantId(100L)
                    .productCode("checkin")
                    .currentPoints(7)
                    .triggerData(Map.of())
                    .tenantConfig(Map.of("maxPoints", 10))
                    .build();

            RuleResult result = rule.apply(context);

            assertThat(result.getPoints()).isEqualTo(7);
            assertThat(result.isApplied()).isFalse();
        }

        @Test
        @DisplayName("returns current points as passthrough when maxPoints missing")
        void missingMaxPoints() {
            RuleContext context = RuleContext.builder()
                    .userId(1L)
                    .tenantId(100L)
                    .productCode("checkin")
                    .currentPoints(7)
                    .triggerData(Map.of())
                    .tenantConfig(Map.of("minPoints", 5))
                    .build();

            RuleResult result = rule.apply(context);

            assertThat(result.getPoints()).isEqualTo(7);
            assertThat(result.isApplied()).isFalse();
        }

        @Test
        @DisplayName("returns current points as passthrough when tenantConfig empty")
        void emptyConfig() {
            RuleContext context = RuleContext.builder()
                    .userId(1L)
                    .tenantId(100L)
                    .productCode("checkin")
                    .currentPoints(3)
                    .triggerData(Map.of())
                    .tenantConfig(Map.of())
                    .build();

            RuleResult result = rule.apply(context);

            assertThat(result.getPoints()).isEqualTo(3);
            assertThat(result.isApplied()).isFalse();
        }
    }

    @Test
    @DisplayName("getName returns 'randomBase'")
    void name() {
        assertThat(rule.getName()).isEqualTo("randomBase");
    }
}
