package com.carbonpoint.platform.rule;

import com.carbonpoint.platform.model.RuleContext;
import com.carbonpoint.platform.model.RuleResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("DailyCapRule")
class DailyCapRuleTest {

    private final DailyCapRule rule = new DailyCapRule();

    private RuleContext ctx(int currentPoints, int dailyCap, int dailyAwarded) {
        return RuleContext.builder()
                .userId(1L)
                .tenantId(100L)
                .productCode("checkin")
                .currentPoints(currentPoints)
                .triggerData(Map.of("dailyAwarded", dailyAwarded))
                .tenantConfig(Map.of("dailyCap", dailyCap))
                .build();
    }

    @Nested
    @DisplayName("when points are under cap")
    class UnderCap {

        @Test
        @DisplayName("passes points through when dailyAwarded + currentPoints <= cap")
        void underCap() {
            RuleResult result = rule.apply(ctx(10, 100, 50));

            assertThat(result.getPoints()).isEqualTo(10);
            assertThat(result.isApplied()).isFalse();
        }

        @Test
        @DisplayName("passes points through when exactly at cap")
        void exactlyAtCap() {
            RuleResult result = rule.apply(ctx(50, 100, 50));

            assertThat(result.getPoints()).isEqualTo(50);
            assertThat(result.isApplied()).isFalse();
        }
    }

    @Nested
    @DisplayName("when points exceed cap")
    class ExceedsCap {

        @Test
        @DisplayName("clamps points to remaining allowance")
        void clampsToRemaining() {
            RuleResult result = rule.apply(ctx(30, 100, 80));

            assertThat(result.getPoints()).isEqualTo(20);
            assertThat(result.isApplied()).isTrue();
            assertThat(result.getMetadata()).containsEntry("dailyCapHit", true);
        }

        @Test
        @DisplayName("sets points to 0 when daily cap already reached")
        void capAlreadyReached() {
            RuleResult result = rule.apply(ctx(10, 100, 100));

            assertThat(result.getPoints()).isEqualTo(0);
            assertThat(result.isApplied()).isTrue();
            assertThat(result.getMetadata()).containsEntry("dailyCapHit", true);
        }

        @Test
        @DisplayName("sets points to 0 when daily awarded exceeds cap")
        void dailyAwardedExceedsCap() {
            RuleResult result = rule.apply(ctx(10, 100, 110));

            assertThat(result.getPoints()).isEqualTo(0);
            assertThat(result.isApplied()).isTrue();
        }
    }

    @Nested
    @DisplayName("no daily cap configured")
    class NoCap {

        @Test
        @DisplayName("passes through when dailyCap is 0")
        void zeroCap() {
            RuleResult result = rule.apply(ctx(10, 0, 500));

            assertThat(result.getPoints()).isEqualTo(10);
            assertThat(result.isApplied()).isFalse();
        }

        @Test
        @DisplayName("passes through when dailyCap is missing")
        void missingCap() {
            RuleContext context = RuleContext.builder()
                    .userId(1L)
                    .tenantId(100L)
                    .productCode("checkin")
                    .currentPoints(10)
                    .triggerData(Map.of("dailyAwarded", 500))
                    .tenantConfig(Map.of())
                    .build();

            RuleResult result = rule.apply(context);

            assertThat(result.getPoints()).isEqualTo(10);
            assertThat(result.isApplied()).isFalse();
        }
    }

    @Nested
    @DisplayName("missing dailyAwarded")
    class MissingAwarded {

        @Test
        @DisplayName("assumes 0 daily awarded when not in triggerData")
        void missingDailyAwarded() {
            RuleContext context = RuleContext.builder()
                    .userId(1L)
                    .tenantId(100L)
                    .productCode("checkin")
                    .currentPoints(50)
                    .triggerData(Map.of())
                    .tenantConfig(Map.of("dailyCap", 100))
                    .build();

            RuleResult result = rule.apply(context);

            assertThat(result.getPoints()).isEqualTo(50);
            assertThat(result.isApplied()).isFalse();
        }
    }

    @Test
    @DisplayName("getName returns 'dailyCap'")
    void name() {
        assertThat(rule.getName()).isEqualTo("dailyCap");
    }
}
