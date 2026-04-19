package com.carbonpoint.platform.trigger;

import com.carbonpoint.platform.model.TriggerContext;
import com.carbonpoint.platform.model.TriggerResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("SensorDataTrigger")
class SensorDataTriggerTest {

    private final SensorDataTrigger trigger = new SensorDataTrigger();

    private TriggerContext ctx(Map<String, Object> params) {
        return TriggerContext.builder()
                .userId(1L)
                .tenantId(100L)
                .productCode("walking")
                .params(params)
                .build();
    }

    @Test
    @DisplayName("getProductCode returns 'walking'")
    void getProductCode() {
        assertThat(trigger.getProductCode()).isEqualTo("walking");
    }

    @Nested
    @DisplayName("when stepCount is provided")
    class ValidStepCount {

        @Test
        @DisplayName("returns success with stepCount and source in data")
        void successWithStepCount() {
            TriggerContext context = ctx(Map.of("stepCount", "5000"));

            TriggerResult result = trigger.execute(context);

            assertThat(result.isSuccess()).isTrue();
            assertThat(result.getData()).containsEntry("stepCount", 5000);
            assertThat(result.getData()).containsEntry("source", "device");
            assertThat(result.getData()).containsKey("triggeredAt");
        }

        @Test
        @DisplayName("uses provided source when specified")
        void customSource() {
            TriggerContext context = ctx(Map.of(
                    "stepCount", "3000",
                    "source", "werun"
            ));

            TriggerResult result = trigger.execute(context);

            assertThat(result.isSuccess()).isTrue();
            assertThat(result.getData()).containsEntry("source", "werun");
            assertThat(result.getData()).containsEntry("stepCount", 3000);
        }

        @Test
        @DisplayName("passes threshold into data when provided")
        void passesThreshold() {
            TriggerContext context = ctx(Map.of(
                    "stepCount", "6000",
                    "threshold", "5000"
            ));

            TriggerResult result = trigger.execute(context);

            assertThat(result.isSuccess()).isTrue();
            assertThat(result.getData()).containsEntry("threshold", "5000");
        }

        @Test
        @DisplayName("accepts integer stepCount directly")
        void integerStepCount() {
            TriggerContext context = ctx(Map.of("stepCount", 8000));

            TriggerResult result = trigger.execute(context);

            assertThat(result.isSuccess()).isTrue();
            assertThat(result.getData()).containsEntry("stepCount", 8000);
        }

        @Test
        @DisplayName("accepts zero stepCount")
        void zeroStepCount() {
            TriggerContext context = ctx(Map.of("stepCount", "0"));

            TriggerResult result = trigger.execute(context);

            assertThat(result.isSuccess()).isTrue();
            assertThat(result.getData()).containsEntry("stepCount", 0);
        }
    }

    @Nested
    @DisplayName("when stepCount is missing")
    class MissingStepCount {

        @Test
        @DisplayName("returns fail when params is null")
        void nullParams() {
            TriggerContext context = TriggerContext.builder()
                    .userId(1L)
                    .tenantId(100L)
                    .productCode("walking")
                    .params(null)
                    .build();

            TriggerResult result = trigger.execute(context);

            assertThat(result.isSuccess()).isFalse();
            assertThat(result.getMessage()).contains("Missing stepCount");
        }

        @Test
        @DisplayName("returns fail when stepCount key is absent")
        void missingKey() {
            TriggerContext context = ctx(Map.of("otherKey", "value"));

            TriggerResult result = trigger.execute(context);

            assertThat(result.isSuccess()).isFalse();
            assertThat(result.getMessage()).contains("Missing stepCount");
        }
    }

    @Nested
    @DisplayName("when stepCount is invalid")
    class InvalidStepCount {

        @Test
        @DisplayName("returns fail for non-numeric stepCount")
        void nonNumeric() {
            TriggerContext context = ctx(Map.of("stepCount", "abc"));

            TriggerResult result = trigger.execute(context);

            assertThat(result.isSuccess()).isFalse();
            assertThat(result.getMessage()).contains("Invalid stepCount");
        }

        @Test
        @DisplayName("returns fail for negative stepCount")
        void negativeStepCount() {
            TriggerContext context = ctx(Map.of("stepCount", "-100"));

            TriggerResult result = trigger.execute(context);

            assertThat(result.isSuccess()).isFalse();
            assertThat(result.getMessage()).contains("stepCount must be non-negative");
        }
    }
}
