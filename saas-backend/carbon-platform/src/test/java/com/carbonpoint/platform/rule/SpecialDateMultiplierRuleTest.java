package com.carbonpoint.platform.rule;

import com.carbonpoint.platform.model.RuleContext;
import com.carbonpoint.platform.model.RuleResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("SpecialDateMultiplierRule")
class SpecialDateMultiplierRuleTest {

    private final SpecialDateMultiplierRule rule = new SpecialDateMultiplierRule();

    private RuleContext ctx(int currentPoints, List<Map<String, Object>> specialDates) {
        return RuleContext.builder()
                .userId(1L)
                .tenantId(100L)
                .productCode("checkin")
                .currentPoints(currentPoints)
                .triggerData(Map.of())
                .tenantConfig(Map.of("specialDates", specialDates))
                .build();
    }

    @Nested
    @DisplayName("when today is a specific date")
    class SpecificDate {

        @Test
        @DisplayName("applies multiplier to current points")
        void appliesMultiplier() {
            String today = LocalDate.now().toString();
            RuleContext context = ctx(10, List.of(
                    Map.of("date", today, "multiplier", 2.0)
            ));

            RuleResult result = rule.apply(context);

            assertThat(result.getPoints()).isEqualTo(20);
            assertThat(result.isApplied()).isTrue();
            assertThat(result.getMetadata()).containsEntry("specialDateMultiplier", 2.0);
        }

        @Test
        @DisplayName("applies 1.5x multiplier correctly")
        void appliesOneAndHalf() {
            String today = LocalDate.now().toString();
            RuleContext context = ctx(10, List.of(
                    Map.of("date", today, "multiplier", 1.5)
            ));

            RuleResult result = rule.apply(context);

            assertThat(result.getPoints()).isEqualTo(15);
            assertThat(result.isApplied()).isTrue();
        }
    }

    @Nested
    @DisplayName("when today is not a special date")
    class NotSpecialDate {

        @Test
        @DisplayName("passes points through with 1.0 multiplier")
        void passthrough() {
            RuleContext context = ctx(10, List.of(
                    Map.of("date", "2099-01-01", "multiplier", 2.0)
            ));

            RuleResult result = rule.apply(context);

            assertThat(result.getPoints()).isEqualTo(10);
            assertThat(result.isApplied()).isFalse();
        }
    }

    @Nested
    @DisplayName("recurring monthly patterns")
    class RecurringMonthly {

        @Test
        @DisplayName("applies multiplier when recurring monthly matches today's day of month")
        void monthlyMatch() {
            int dayOfMonth = LocalDate.now().getDayOfMonth();
            RuleContext context = ctx(10, List.of(
                    Map.of("recurring", "MONTHLY", "dayOfMonth", dayOfMonth, "multiplier", 3.0)
            ));

            RuleResult result = rule.apply(context);

            assertThat(result.getPoints()).isEqualTo(30);
            assertThat(result.isApplied()).isTrue();
        }

        @Test
        @DisplayName("does not apply multiplier when day of month does not match")
        void monthlyNoMatch() {
            int wrongDay = LocalDate.now().getDayOfMonth() == 15 ? 16 : 15;
            RuleContext context = ctx(10, List.of(
                    Map.of("recurring", "MONTHLY", "dayOfMonth", wrongDay, "multiplier", 3.0)
            ));

            RuleResult result = rule.apply(context);

            assertThat(result.getPoints()).isEqualTo(10);
            assertThat(result.isApplied()).isFalse();
        }
    }

    @Nested
    @DisplayName("no special dates configured")
    class NoSpecialDates {

        @Test
        @DisplayName("passes through when specialDates is empty")
        void emptyDates() {
            RuleContext context = ctx(10, List.of());

            RuleResult result = rule.apply(context);

            assertThat(result.getPoints()).isEqualTo(10);
            assertThat(result.isApplied()).isFalse();
        }

        @Test
        @DisplayName("passes through when specialDates key is missing")
        void missingKey() {
            RuleContext context = RuleContext.builder()
                    .userId(1L)
                    .tenantId(100L)
                    .productCode("checkin")
                    .currentPoints(10)
                    .triggerData(Map.of())
                    .tenantConfig(Map.of())
                    .build();

            RuleResult result = rule.apply(context);

            assertThat(result.getPoints()).isEqualTo(10);
            assertThat(result.isApplied()).isFalse();
        }
    }

    @Test
    @DisplayName("getName returns 'specialDateMultiplier'")
    void name() {
        assertThat(rule.getName()).isEqualTo("specialDateMultiplier");
    }
}
