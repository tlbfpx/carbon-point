package com.carbonpoint.platform;

import com.carbonpoint.platform.model.TriggerContext;
import com.carbonpoint.platform.model.TriggerResult;

/**
 * SPI interface for product triggers.
 * A trigger validates incoming user action data and produces a TriggerResult
 * that feeds into the rule chain for point calculation.
 */
public interface Trigger {

    /**
     * Execute the trigger logic for the given context.
     *
     * @param context trigger input containing user, tenant, product info, and parameters
     * @return result indicating success/failure and any data to pass into the rule chain
     */
    TriggerResult execute(TriggerContext context);

    /**
     * The product code this trigger is associated with.
     */
    String getProductCode();
}
