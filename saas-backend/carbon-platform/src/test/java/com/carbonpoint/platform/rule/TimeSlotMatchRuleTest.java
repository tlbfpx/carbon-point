package com.carbonpoint.platform.rule;

import com.carbonpoint.platform.model.RuleContext;
import com.carbonpoint.platform.model.RuleResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("TimeSlotMatchRule")
class TimeSlotMatchRuleTest {

    private final TimeSlotMatchRule rule = new TimeSlotMatchRule();

    private RuleContext ctx(LocalTime time, List<Map<String, Object>> slots) {
        return RuleContext.builder()
                .userId(1L)
                .tenantId(100L)
                .productCode("checkin")
                .currentPoints(10)
                .triggerData(Map.of("checkInTime", time.toString()))
                .tenantConfig(Map.of("timeSlots", slots))
                .build();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> slot(String start, String end) {
        return Map.of("startTime", start, "endTime", end);
    }

    @Nested
    @DisplayName("when time is within a slot")
    class WithinSlot {

        @Test
        @DisplayName("passes points through with slot info in metadata")
        void passesThrough() {
            RuleContext context = ctx(
                    LocalTime.of(9, 30),
                    List.of(slot("08:00", "10:00"), slot("14:00", "16:00"))
            );

            RuleResult result = rule.apply(context);

            assertThat(result.getPoints()).isEqualTo(10);
            assertThat(result.isApplied()).isTrue();
            assertThat(result.getMetadata()).containsEntry("matchedSlot", "08:00-10:00");
        }
    }

    @Nested
    @DisplayName("when time is not within any slot")
    class OutsideSlot {

        @Test
        @DisplayName("sets points to 0")
        void setsPointsToZero() {
            RuleContext context = ctx(
                    LocalTime.of(12, 0),
                    List.of(slot("08:00", "10:00"), slot("14:00", "16:00"))
            );

            RuleResult result = rule.apply(context);

            assertThat(result.getPoints()).isEqualTo(0);
            assertThat(result.isApplied()).isTrue();
            assertThat(result.getMetadata()).containsEntry("matchedSlot", "none");
        }
    }

    @Nested
    @DisplayName("when no slots configured")
    class NoSlots {

        @Test
        @DisplayName("sets points to 0 if timeSlots is empty")
        void emptySlots() {
            RuleContext context = ctx(
                    LocalTime.of(9, 30),
                    List.of()
            );

            RuleResult result = rule.apply(context);

            assertThat(result.getPoints()).isEqualTo(0);
            assertThat(result.isApplied()).isTrue();
        }

        @Test
        @DisplayName("sets points to 0 if timeSlots key is missing")
        void missingSlots() {
            RuleContext context = RuleContext.builder()
                    .userId(1L)
                    .tenantId(100L)
                    .productCode("checkin")
                    .currentPoints(10)
                    .triggerData(Map.of("checkInTime", "09:30"))
                    .tenantConfig(Map.of())
                    .build();

            RuleResult result = rule.apply(context);

            assertThat(result.getPoints()).isEqualTo(0);
            assertThat(result.isApplied()).isTrue();
        }
    }

    @Nested
    @DisplayName("when checkInTime is missing from triggerData")
    class MissingTime {

        @Test
        @DisplayName("sets points to 0")
        void missingCheckInTime() {
            RuleContext context = RuleContext.builder()
                    .userId(1L)
                    .tenantId(100L)
                    .productCode("checkin")
                    .currentPoints(10)
                    .triggerData(Map.of())
                    .tenantConfig(Map.of("timeSlots", List.of(slot("08:00", "10:00"))))
                    .build();

            RuleResult result = rule.apply(context);

            assertThat(result.getPoints()).isEqualTo(0);
            assertThat(result.isApplied()).isTrue();
        }
    }

    @Test
    @DisplayName("getName returns 'timeSlotMatch'")
    void name() {
        assertThat(rule.getName()).isEqualTo("timeSlotMatch");
    }
}
