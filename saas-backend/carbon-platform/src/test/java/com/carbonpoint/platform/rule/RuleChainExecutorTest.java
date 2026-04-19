package com.carbonpoint.platform.rule;

import com.carbonpoint.platform.RuleNode;
import com.carbonpoint.platform.model.RuleContext;
import com.carbonpoint.platform.model.RuleResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("RuleChainExecutor")
class RuleChainExecutorTest {

    private final RuleChainExecutor executor = new RuleChainExecutor();

    private RuleContext baseContext() {
        return RuleContext.builder()
                .userId(1L)
                .tenantId(100L)
                .productCode("checkin")
                .currentPoints(0)
                .triggerData(Map.of())
                .tenantConfig(Map.of())
                .build();
    }

    @Nested
    @DisplayName("empty chain")
    class EmptyChain {

        @Test
        @DisplayName("returns passthrough with currentPoints")
        void emptyChain() {
            RuleContext context = baseContext();
            context.setCurrentPoints(10);

            RuleResult result = executor.execute(List.of(), context);

            assertThat(result.getPoints()).isEqualTo(10);
            assertThat(result.isApplied()).isFalse();
        }
    }

    @Nested
    @DisplayName("single node")
    class SingleNode {

        @Test
        @DisplayName("executes single node")
        void single() {
            RuleNode doubling = new RuleNode() {
                @Override
                public RuleResult apply(RuleContext ctx) {
                    return RuleResult.of(ctx.getCurrentPoints() * 2, Map.of("doubled", true));
                }

                @Override
                public String getName() {
                    return "doubler";
                }
            };

            RuleContext context = baseContext();
            context.setCurrentPoints(5);

            RuleResult result = executor.execute(List.of(doubling), context);

            assertThat(result.getPoints()).isEqualTo(10);
            assertThat(result.isApplied()).isTrue();
        }
    }

    @Nested
    @DisplayName("multiple nodes")
    class MultipleNodes {

        @Test
        @DisplayName("chains results from one node to the next")
        void chainResults() {
            RuleNode doubler = new RuleNode() {
                @Override
                public RuleResult apply(RuleContext ctx) {
                    return RuleResult.of(ctx.getCurrentPoints() * 2, Map.of());
                }

                @Override
                public String getName() {
                    return "doubler";
                }
            };

            RuleNode adder = new RuleNode() {
                @Override
                public RuleResult apply(RuleContext ctx) {
                    return RuleResult.of(ctx.getCurrentPoints() + 3, Map.of());
                }

                @Override
                public String getName() {
                    return "adder";
                }
            };

            RuleContext context = baseContext();
            context.setCurrentPoints(5);

            RuleResult result = executor.execute(List.of(doubler, adder), context);

            // 5 * 2 = 10, then 10 + 3 = 13
            assertThat(result.getPoints()).isEqualTo(13);
            assertThat(result.isApplied()).isTrue();
        }

        @Test
        @DisplayName("three nodes chain correctly")
        void threeNodes() {
            RuleNode times3 = new RuleNode() {
                @Override
                public RuleResult apply(RuleContext ctx) {
                    return RuleResult.of(ctx.getCurrentPoints() * 3, Map.of());
                }

                @Override
                public String getName() {
                    return "times3";
                }
            };

            RuleNode minus1 = new RuleNode() {
                @Override
                public RuleResult apply(RuleContext ctx) {
                    return RuleResult.of(ctx.getCurrentPoints() - 1, Map.of());
                }

                @Override
                public String getName() {
                    return "minus1";
                }
            };

            RuleNode divider = new RuleNode() {
                @Override
                public RuleResult apply(RuleContext ctx) {
                    return RuleResult.of(ctx.getCurrentPoints() / 2, Map.of());
                }

                @Override
                public String getName() {
                    return "divider";
                }
            };

            RuleContext context = baseContext();
            context.setCurrentPoints(10);

            RuleResult result = executor.execute(List.of(times3, minus1, divider), context);

            // 10 * 3 = 30, 30 - 1 = 29, 29 / 2 = 14
            assertThat(result.getPoints()).isEqualTo(14);
            assertThat(result.isApplied()).isTrue();
        }
    }
}
