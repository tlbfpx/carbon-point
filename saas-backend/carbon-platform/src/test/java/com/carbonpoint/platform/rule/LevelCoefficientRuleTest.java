package com.carbonpoint.platform.rule;

import com.carbonpoint.platform.model.RuleContext;
import com.carbonpoint.platform.model.RuleResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("LevelCoefficientRule")
class LevelCoefficientRuleTest {

    private final LevelCoefficientRule rule = new LevelCoefficientRule();

    private RuleContext ctx(int currentPoints, int userLevel) {
        return RuleContext.builder()
                .userId(1L)
                .tenantId(100L)
                .productCode("checkin")
                .currentPoints(currentPoints)
                .triggerData(Map.of("userLevel", userLevel))
                .tenantConfig(Map.of())
                .build();
    }

    @Nested
    @DisplayName("level coefficients")
    class Coefficients {

        @Test
        @DisplayName("Level 1 = 1.0x multiplier")
        void level1() {
            RuleResult result = rule.apply(ctx(100, 1));
            assertThat(result.getPoints()).isEqualTo(100);
            assertThat(result.getMetadata()).containsEntry("levelCoefficient", 1.0);
        }

        @Test
        @DisplayName("Level 2 = 1.2x multiplier")
        void level2() {
            RuleResult result = rule.apply(ctx(100, 2));
            assertThat(result.getPoints()).isEqualTo(120);
            assertThat(result.getMetadata()).containsEntry("levelCoefficient", 1.2);
        }

        @Test
        @DisplayName("Level 3 = 1.5x multiplier")
        void level3() {
            RuleResult result = rule.apply(ctx(100, 3));
            assertThat(result.getPoints()).isEqualTo(150);
            assertThat(result.getMetadata()).containsEntry("levelCoefficient", 1.5);
        }

        @Test
        @DisplayName("Level 4 = 2.0x multiplier")
        void level4() {
            RuleResult result = rule.apply(ctx(100, 4));
            assertThat(result.getPoints()).isEqualTo(200);
            assertThat(result.getMetadata()).containsEntry("levelCoefficient", 2.0);
        }

        @Test
        @DisplayName("Level 5 = 2.5x multiplier")
        void level5() {
            RuleResult result = rule.apply(ctx(100, 5));
            assertThat(result.getPoints()).isEqualTo(250);
            assertThat(result.getMetadata()).containsEntry("levelCoefficient", 2.5);
        }

        @Test
        @DisplayName("Unknown level defaults to 1.0x")
        void unknownLevel() {
            RuleResult result = rule.apply(ctx(100, 99));
            assertThat(result.getPoints()).isEqualTo(100);
        }
    }

    @Nested
    @DisplayName("missing userLevel")
    class MissingLevel {

        @Test
        @DisplayName("defaults to level 1 when userLevel not in triggerData")
        void missingLevel() {
            RuleContext context = RuleContext.builder()
                    .userId(1L)
                    .tenantId(100L)
                    .productCode("checkin")
                    .currentPoints(50)
                    .triggerData(Map.of())
                    .tenantConfig(Map.of())
                    .build();

            RuleResult result = rule.apply(context);

            assertThat(result.getPoints()).isEqualTo(50);
            assertThat(result.isApplied()).isFalse();
        }
    }

    @Test
    @DisplayName("getName returns 'levelCoefficient'")
    void name() {
        assertThat(rule.getName()).isEqualTo("levelCoefficient");
    }
}
