package com.carbonpoint.platform.rule;

import com.carbonpoint.platform.model.RuleContext;
import com.carbonpoint.platform.model.RuleResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("FormulaCalcRule")
class FormulaCalcRuleTest {

    private final FormulaCalcRule rule = new FormulaCalcRule();

    private RuleContext ctx(int currentPoints, double coefficient, int stepCount) {
        return RuleContext.builder()
                .userId(1L)
                .tenantId(100L)
                .productCode("walking")
                .currentPoints(currentPoints)
                .triggerData(Map.of("stepCount", stepCount))
                .tenantConfig(Map.of("coefficient", coefficient))
                .build();
    }

    @Nested
    @DisplayName("formula calculation")
    class Calculation {

        @Test
        @DisplayName("calculates floor(steps * coefficient)")
        void basicCalculation() {
            RuleResult result = rule.apply(ctx(0, 0.1, 5000));

            assertThat(result.getPoints()).isEqualTo(500);
            assertThat(result.isApplied()).isTrue();
            assertThat(result.getMetadata()).containsEntry("formula", "floor(5000 * 0.1)");
        }

        @Test
        @DisplayName("floors the result correctly")
        void floorsResult() {
            RuleResult result = rule.apply(ctx(0, 0.03, 1000));

            assertThat(result.getPoints()).isEqualTo(30);
            assertThat(result.isApplied()).isTrue();
        }

        @Test
        @DisplayName("zero steps returns zero")
        void zeroSteps() {
            RuleResult result = rule.apply(ctx(0, 0.1, 0));

            assertThat(result.getPoints()).isEqualTo(0);
            assertThat(result.isApplied()).isTrue();
        }
    }

    @Nested
    @DisplayName("missing config or data")
    class MissingData {

        @Test
        @DisplayName("passes through when coefficient not configured")
        void missingCoefficient() {
            RuleContext context = RuleContext.builder()
                    .userId(1L)
                    .tenantId(100L)
                    .productCode("walking")
                    .currentPoints(42)
                    .triggerData(Map.of("stepCount", 5000))
                    .tenantConfig(Map.of())
                    .build();

            RuleResult result = rule.apply(context);

            assertThat(result.getPoints()).isEqualTo(42);
            assertThat(result.isApplied()).isFalse();
        }

        @Test
        @DisplayName("passes through when stepCount not in triggerData")
        void missingStepCount() {
            RuleContext context = RuleContext.builder()
                    .userId(1L)
                    .tenantId(100L)
                    .productCode("walking")
                    .currentPoints(42)
                    .triggerData(Map.of())
                    .tenantConfig(Map.of("coefficient", 0.1))
                    .build();

            RuleResult result = rule.apply(context);

            assertThat(result.getPoints()).isEqualTo(42);
            assertThat(result.isApplied()).isFalse();
        }
    }

    @Test
    @DisplayName("getName returns 'formulaCalc'")
    void name() {
        assertThat(rule.getName()).isEqualTo("formulaCalc");
    }
}
