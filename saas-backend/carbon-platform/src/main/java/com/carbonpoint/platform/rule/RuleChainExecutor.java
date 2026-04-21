package com.carbonpoint.platform.rule;

import com.carbonpoint.platform.RuleNode;
import com.carbonpoint.platform.model.RuleContext;
import com.carbonpoint.platform.model.RuleResult;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Executes a list of RuleNode in sequence, passing RuleResult points
 * from one node as input to the next via a local accumulator
 * (RuleContext remains immutable).
 *
 * Supports two invocation modes:
 * 1. execute(List&lt;RuleNode&gt;, RuleContext) — caller provides pre-resolved nodes
 * 2. execute(List&lt;String&gt; nodeNames, RuleContext) — resolves nodes by name from Spring context
 *
 * Name mapping: Product modules use snake_case (e.g. "time_slot_match"),
 * while RuleNode.getName() returns camelCase (e.g. "timeSlotMatch").
 * The NAME_MAP handles the translation.
 */
@Slf4j
@Component
public class RuleChainExecutor {

    /**
     * snake_case (product config) → camelCase (RuleNode.getName()) mapping.
     * Covers all nodes in StairClimbingProduct.RULE_CHAIN plus extras.
     */
    private static final Map<String, String> NAME_MAP = Map.ofEntries(
            Map.entry("time_slot_match", "timeSlotMatch"),
            Map.entry("random_base", "randomBase"),
            Map.entry("special_date_multiplier", "specialDateMultiplier"),
            Map.entry("level_coefficient", "levelCoefficient"),
            Map.entry("round", "round"),
            Map.entry("daily_cap", "dailyCap"),
            Map.entry("threshold_filter", "thresholdFilter"),
            Map.entry("formula_calc", "formulaCalc")
    );

    /** All RuleNode beans from Spring context. */
    private final List<RuleNode> allNodes;

    /** Index: camelCase name → RuleNode bean. Built in @PostConstruct. */
    private final Map<String, RuleNode> nodeIndex = new HashMap<>();

    public RuleChainExecutor(Optional<List<RuleNode>> allNodes) {
        this.allNodes = allNodes.orElse(List.of());
    }

    @PostConstruct
    void init() {
        for (RuleNode node : allNodes) {
            String name = node.getName();
            if (name != null) {
                nodeIndex.put(name, node);
                log.info("RuleChainExecutor registered rule node: {}", name);
            }
        }
        log.info("RuleChainExecutor initialized with {} rule nodes", nodeIndex.size());
    }

    /**
     * Execute the rule chain using pre-resolved node instances.
     *
     * @param nodes   ordered list of rule nodes
     * @param context initial rule context (immutable)
     * @return result from the last node (or passthrough if chain is empty)
     */
    public RuleResult execute(List<RuleNode> nodes, RuleContext context) {
        if (nodes == null || nodes.isEmpty()) {
            return RuleResult.passthrough(context.getCurrentPoints());
        }

        int currentPoints = context.getCurrentPoints();
        RuleResult result = null;
        for (RuleNode node : nodes) {
            // Rebuild context with updated points so each node sees the accumulated value
            RuleContext updatedContext = RuleContext.builder()
                    .userId(context.getUserId())
                    .tenantId(context.getTenantId())
                    .productCode(context.getProductCode())
                    .currentPoints(currentPoints)
                    .tenantConfig(context.getTenantConfig())
                    .triggerData(context.getTriggerData())
                    .build();
            result = node.apply(updatedContext);
            currentPoints = result.getPoints();
        }

        return result;
    }

    /**
     * Execute the rule chain by resolving node names from Spring context.
     * Accepts both snake_case ("time_slot_match") and camelCase ("timeSlotMatch").
     *
     * @param nodeNames ordered list of node names (snake_case or camelCase)
     * @param context   initial rule context (immutable)
     * @return result from the last node (or passthrough if chain is empty/unresolvable)
     */
    public RuleResult executeByName(List<String> nodeNames, RuleContext context) {
        if (nodeNames == null || nodeNames.isEmpty()) {
            return RuleResult.passthrough(context.getCurrentPoints());
        }

        List<RuleNode> resolved = new ArrayList<>();
        for (String rawName : nodeNames) {
            // Try direct camelCase lookup first, then map from snake_case
            String camelName = NAME_MAP.getOrDefault(rawName, rawName);
            RuleNode node = nodeIndex.get(camelName);
            if (node != null) {
                resolved.add(node);
            } else {
                log.warn("RuleChainExecutor: unknown rule node '{}' (tried '{}'), skipping", rawName, camelName);
            }
        }

        if (resolved.isEmpty()) {
            log.warn("RuleChainExecutor: no valid nodes resolved from names {}", nodeNames);
            return RuleResult.passthrough(context.getCurrentPoints());
        }

        return execute(resolved, context);
    }
}
