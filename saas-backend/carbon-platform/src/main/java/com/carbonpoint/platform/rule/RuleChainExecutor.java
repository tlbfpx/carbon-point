package com.carbonpoint.platform.rule;

import com.carbonpoint.platform.RuleNode;
import com.carbonpoint.platform.model.RuleContext;
import com.carbonpoint.platform.model.RuleResult;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Executes a list of RuleNode in sequence, passing RuleResult points
 * from one node as input to the next via a local accumulator
 * (RuleContext remains immutable).
 */
@Component
public class RuleChainExecutor {

    /**
     * Execute the rule chain.
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
}
