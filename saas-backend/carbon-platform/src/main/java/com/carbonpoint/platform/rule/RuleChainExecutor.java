package com.carbonpoint.platform.rule;

import com.carbonpoint.platform.RuleNode;
import com.carbonpoint.platform.model.RuleContext;
import com.carbonpoint.platform.model.RuleResult;

import java.util.List;

/**
 * Executes a list of RuleNode in sequence, passing RuleResult points
 * from one node as input (currentPoints) to the next.
 */
public class RuleChainExecutor {

    /**
     * Execute the rule chain.
     *
     * @param nodes   ordered list of rule nodes
     * @param context initial rule context
     * @return result from the last node (or passthrough if chain is empty)
     */
    public RuleResult execute(List<RuleNode> nodes, RuleContext context) {
        if (nodes == null || nodes.isEmpty()) {
            return RuleResult.passthrough(context.getCurrentPoints());
        }

        RuleResult result = null;
        for (RuleNode node : nodes) {
            result = node.apply(context);
            // Feed the output points as input for the next node
            context.setCurrentPoints(result.getPoints());
        }

        return result;
    }
}
