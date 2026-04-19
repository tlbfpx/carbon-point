package com.carbonpoint.platform;

import com.carbonpoint.platform.registry.ProductRegistry;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

@DisplayName("ProductRegistry")
class ProductRegistryTest {

    private final ApplicationContextRunner baseRunner = new ApplicationContextRunner()
            .withUserConfiguration(RegistryConfig.class);

    @Configuration
    static class RegistryConfig {
        @Bean
        ProductRegistry productRegistry(java.util.Optional<List<ProductModule>> modules) {
            return new ProductRegistry(modules);
        }
    }

    private static ProductModule module(String code, String name) {
        return new ProductModule() {
            @Override public String getCode() { return code; }
            @Override public String getName() { return name; }
            @Override public String getTriggerType() { return "manual"; }
            @Override public List<String> getRuleChain() { return List.of(); }
            @Override public List<String> getFeatures() { return List.of(); }
        };
    }

    @Nested
    @DisplayName("empty context")
    class EmptyContext {

        @Test
        @DisplayName("discovers no modules when none are registered")
        void discoversNoModules() {
            baseRunner.run(ctx -> {
                ProductRegistry registry = ctx.getBean(ProductRegistry.class);
                assertThat(registry.getAllModules()).isEmpty();
                assertThat(registry.hasModule("checkin")).isFalse();
                assertThat(registry.getModule("checkin")).isEmpty();
            });
        }
    }

    @Nested
    @DisplayName("single module")
    class SingleModule {

        @Test
        @DisplayName("discovers a single module correctly")
        void discoversSingleModule() {
            ProductModule checkin = module("checkin", "Stair Check-in");

            baseRunner.withBean("checkinModule", ProductModule.class, () -> checkin)
                    .run(ctx -> {
                        ProductRegistry registry = ctx.getBean(ProductRegistry.class);
                        assertThat(registry.getAllModules()).hasSize(1);
                        assertThat(registry.hasModule("checkin")).isTrue();
                        assertThat(registry.getModule("checkin"))
                                .isPresent()
                                .get()
                                .extracting(ProductModule::getName)
                                .isEqualTo("Stair Check-in");
                    });
        }
    }

    @Nested
    @DisplayName("multiple modules")
    class MultipleModules {

        @Test
        @DisplayName("discovers multiple modules")
        void discoversMultipleModules() {
            ProductModule checkin = module("checkin", "Stair Check-in");
            ProductModule reading = module("reading", "Reading Challenge");

            baseRunner.withBean("checkinModule", ProductModule.class, () -> checkin)
                    .withBean("readingModule", ProductModule.class, () -> reading)
                    .run(ctx -> {
                        ProductRegistry registry = ctx.getBean(ProductRegistry.class);
                        assertThat(registry.getAllModules()).hasSize(2);
                        assertThat(registry.hasModule("checkin")).isTrue();
                        assertThat(registry.hasModule("reading")).isTrue();
                    });
        }
    }

    @Nested
    @DisplayName("unknown code")
    class UnknownCode {

        @Test
        @DisplayName("returns empty for unknown code")
        void returnsEmptyForUnknownCode() {
            ProductModule checkin = module("checkin", "Stair Check-in");

            baseRunner.withBean("checkinModule", ProductModule.class, () -> checkin)
                    .run(ctx -> {
                        ProductRegistry registry = ctx.getBean(ProductRegistry.class);
                        assertThat(registry.getModule("nonexistent")).isEmpty();
                        assertThat(registry.hasModule("nonexistent")).isFalse();
                    });
        }
    }

    @Nested
    @DisplayName("duplicate code")
    class DuplicateCode {

        @Test
        @DisplayName("throws IllegalStateException on duplicate codes")
        void throwsOnDuplicateCodes() {
            ProductModule m1 = module("checkin", "Check-in A");
            ProductModule m2 = module("checkin", "Check-in B");

            baseRunner.withBean("moduleA", ProductModule.class, () -> m1)
                    .withBean("moduleB", ProductModule.class, () -> m2)
                    .run(ctx -> {
                        assertThat(ctx.getStartupFailure()).isNotNull();
                        assertThat(ctx.getStartupFailure())
                                .hasCauseInstanceOf(IllegalStateException.class);
                    });
        }
    }
}
