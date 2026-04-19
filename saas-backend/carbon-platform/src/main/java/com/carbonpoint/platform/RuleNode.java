package com.carbonpoint.platform;

import com.carbonpoint.platform.model.RuleContext;
import com.carbonpoint.platform.model.RuleResult;

/**
 * SPI interface for a single rule node in the processing chain.
 * Each product module defines an ordered chain of RuleNode beans.
 */
public interface RuleNode {

    /**
     * Execute this rule against the given context.
     *
     * @param context rule input containing user, tenant, trigger data, and current points
     * @return result with (possibly modified) points and metadata
     */
    RuleResult apply(RuleContext context);

    /**
     * Unique name of this rule node, used in the rule chain definition.
     */
    String getName();
}
