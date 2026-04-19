package com.carbonpoint.platform.feature;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("FunEquivalenceFeature")
class FunEquivalenceFeatureTest {

    private final FunEquivalenceFeature feature = new FunEquivalenceFeature();

    @Nested
    @DisplayName("feature metadata")
    class Metadata {

        @Test
        @DisplayName("type is 'funEquivalence'")
        void type() {
            assertThat(feature.getType()).isEqualTo("funEquivalence");
        }

        @Test
        @DisplayName("name is not null or blank")
        void name() {
            assertThat(feature.getName()).isNotBlank();
        }

        @Test
        @DisplayName("is not required")
        void required() {
            assertThat(feature.isRequired()).isFalse();
        }

        @Test
        @DisplayName("defaultConfig contains equivalence items")
        void defaultConfig() {
            Map<String, Object> config = feature.getDefaultConfig();
            assertThat(config).containsKey("items");
        }
    }

    @Nested
    @DisplayName("calculate")
    class Calculate {

        @Test
        @DisplayName("calculates quantities for given step count")
        void calculatesQuantities() {
            FunEquivalenceFeature.EquivalenceItem bananas = new FunEquivalenceFeature.EquivalenceItem("banana", "香蕉", 50);
            FunEquivalenceFeature.EquivalenceItem rice = new FunEquivalenceFeature.EquivalenceItem("rice", "米饭(碗)", 200);

            Map<String, Number> result = feature.calculate(500, List.of(bananas, rice));

            assertThat(result.get("banana")).isEqualTo(10);       // 500 / 50
            assertThat(result.get("rice")).isEqualTo(2);          // 500 / 200
        }

        @Test
        @DisplayName("floors fractional results")
        void floorsFractional() {
            FunEquivalenceFeature.EquivalenceItem bananas = new FunEquivalenceFeature.EquivalenceItem("banana", "香蕉", 75);

            Map<String, Number> result = feature.calculate(100, List.of(bananas));

            assertThat(result.get("banana")).isEqualTo(1);       // floor(100 / 75) = 1
        }

        @Test
        @DisplayName("returns 0 when steps less than item step value")
        void lessThanStepValue() {
            FunEquivalenceFeature.EquivalenceItem bananas = new FunEquivalenceFeature.EquivalenceItem("banana", "香蕉", 200);

            Map<String, Number> result = feature.calculate(50, List.of(bananas));

            assertThat(result.get("banana")).isEqualTo(0);
        }

        @Test
        @DisplayName("returns empty map for empty items list")
        void emptyItems() {
            Map<String, Number> result = feature.calculate(500, List.of());
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("zero steps returns all zeros")
        void zeroSteps() {
            FunEquivalenceFeature.EquivalenceItem bananas = new FunEquivalenceFeature.EquivalenceItem("banana", "香蕉", 50);

            Map<String, Number> result = feature.calculate(0, List.of(bananas));

            assertThat(result.get("banana")).isEqualTo(0);
        }
    }
}
