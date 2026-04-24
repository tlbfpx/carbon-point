package com.carbonpoint.system.event;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Event published when rule templates for a product need to be synced to tenant point rules.
 * Carbon-points module listens for this event and performs the actual upsert.
 */
@Getter
@AllArgsConstructor
public class RuleTemplateSyncEvent {
    private final String productId;
}
