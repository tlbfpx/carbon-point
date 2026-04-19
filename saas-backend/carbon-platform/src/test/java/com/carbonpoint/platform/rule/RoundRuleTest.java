package com.carbonpoint.platform.rule;

import com.carbonpoint.platform.model.RuleContext;
import com.carbonpoint.platform.model.RuleResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("RoundRule")
class RoundRuleTest {

    private final RoundRule rule = new RoundRule();

    private RuleContext ctx(int currentPoints) {
        return RuleContext.builder()
                .userId(1L)
                .tenantId(100L)
                .productCode("checkin")
                .currentPoints(currentPoints)
                .triggerData(Map.of())
                .tenantConfig(Map.of())
                .build();
    }

    @Nested
    @DisplayName("rounding behavior")
    class Rounding {

        @Test
        @DisplayName("integer value passes through unchanged")
        void integerValue() {
            RuleResult result = rule.apply(ctx(100));
            assertThat(result.getPoints()).isEqualTo(100);
            assertThat(result.isApplied()).isTrue();
        }

        @Test
        @DisplayName("rounds currentPoints value (already int, just passes through)")
        void roundsValue() {
            // Since currentPoints is already int, rounding is identity.
            // This rule exists to round after floating-point multiplication in the chain.
            RuleResult result = rule.apply(ctx(42));
            assertThat(result.getPoints()).isEqualTo(42);
            assertThat(result.isApplied()).isTrue();
        }

        @Test
        @DisplayName("zero remains zero")
        void zero() {
            RuleResult result = rule.apply(ctx(0));
            assertThat(result.getPoints()).isEqualTo(0);
            assertThat(result.isApplied()).isTrue();
        }
    }

    @Test
    @DisplayName("getName returns 'round'")
    void name() {
        assertThat(rule.getName()).isEqualTo("round");
    }
}
