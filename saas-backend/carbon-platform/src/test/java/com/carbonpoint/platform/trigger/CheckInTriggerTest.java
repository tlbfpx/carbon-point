package com.carbonpoint.platform.trigger;

import com.carbonpoint.platform.model.TriggerContext;
import com.carbonpoint.platform.model.TriggerResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("CheckInTrigger")
class CheckInTriggerTest {

    private final CheckInTrigger trigger = new CheckInTrigger();

    private TriggerContext ctx(Map<String, Object> params) {
        return TriggerContext.builder()
                .userId(1L)
                .tenantId(100L)
                .productCode("checkin")
                .params(params)
                .build();
    }

    @Test
    @DisplayName("getProductCode returns 'checkin'")
    void getProductCode() {
        assertThat(trigger.getProductCode()).isEqualTo("checkin");
    }

    @Nested
    @DisplayName("when checkInTime is provided")
    class ValidCheckInTime {

        @Test
        @DisplayName("returns success with checkInTime in data")
        void successWithCheckInTime() {
            TriggerContext context = ctx(Map.of("checkInTime", "09:30"));

            TriggerResult result = trigger.execute(context);

            assertThat(result.isSuccess()).isTrue();
            assertThat(result.getData()).containsEntry("checkInTime", "09:30");
            assertThat(result.getData()).containsEntry("source", "manual");
            assertThat(result.getData()).containsEntry("triggeredAt", "09:30");
        }

        @Test
        @DisplayName("parses HH:mm:ss format correctly")
        void parsesSecondsFormat() {
            TriggerContext context = ctx(Map.of("checkInTime", "09:30:15"));

            TriggerResult result = trigger.execute(context);

            assertThat(result.isSuccess()).isTrue();
            assertThat(result.getData()).containsEntry("checkInTime", "09:30:15");
        }

        @Test
        @DisplayName("passes optional minPoints and maxPoints into data")
        void passesPointsRange() {
            TriggerContext context = ctx(Map.of(
                    "checkInTime", "09:30",
                    "minPoints", 5,
                    "maxPoints", 20
            ));

            TriggerResult result = trigger.execute(context);

            assertThat(result.isSuccess()).isTrue();
            assertThat(result.getData()).containsEntry("minPoints", 5);
            assertThat(result.getData()).containsEntry("maxPoints", 20);
        }

        @Test
        @DisplayName("passes timeSlots into data when provided")
        void passesTimeSlots() {
            List<Map<String, Object>> slots = List.of(
                    Map.of("startTime", "08:00", "endTime", "10:00")
            );
            TriggerContext context = ctx(Map.of(
                    "checkInTime", "09:00",
                    "timeSlots", slots
            ));

            TriggerResult result = trigger.execute(context);

            assertThat(result.isSuccess()).isTrue();
            assertThat(result.getData()).containsEntry("timeSlots", slots);
        }
    }

    @Nested
    @DisplayName("when checkInTime is missing")
    class MissingCheckInTime {

        @Test
        @DisplayName("returns fail when params is null")
        void nullParams() {
            TriggerContext context = TriggerContext.builder()
                    .userId(1L)
                    .tenantId(100L)
                    .productCode("checkin")
                    .params(null)
                    .build();

            TriggerResult result = trigger.execute(context);

            assertThat(result.isSuccess()).isFalse();
            assertThat(result.getMessage()).contains("Missing checkInTime");
        }

        @Test
        @DisplayName("returns fail when checkInTime key is absent")
        void missingKey() {
            TriggerContext context = ctx(Map.of("otherKey", "value"));

            TriggerResult result = trigger.execute(context);

            assertThat(result.isSuccess()).isFalse();
            assertThat(result.getMessage()).contains("Missing checkInTime");
        }
    }

    @Nested
    @DisplayName("when checkInTime is invalid")
    class InvalidCheckInTime {

        @Test
        @DisplayName("returns fail for unparseable time string")
        void invalidFormat() {
            TriggerContext context = ctx(Map.of("checkInTime", "not-a-time"));

            TriggerResult result = trigger.execute(context);

            assertThat(result.isSuccess()).isFalse();
            assertThat(result.getMessage()).contains("Invalid checkInTime");
        }
    }
}
