package com.carbonpoint.platform.rule;

import com.carbonpoint.platform.RuleNode;
import com.carbonpoint.platform.model.RuleContext;
import com.carbonpoint.platform.model.RuleResult;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Rule node that rounds the current points value.
 * Since RuleContext.currentPoints is already int, this is effectively
 * a passthrough marker in the chain. It exists to provide a consistent
 * rounding step after floating-point multiplications.
 */
@Component
public class RoundRule implements RuleNode {

    @Override
    public RuleResult apply(RuleContext context) {
        int rounded = (int) Math.round(context.getCurrentPoints());
        return RuleResult.of(rounded, Map.of("rounded", true));
    }

    @Override
    public String getName() {
        return "round";
    }
}
