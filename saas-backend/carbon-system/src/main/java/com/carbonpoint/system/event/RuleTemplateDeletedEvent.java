package com.carbonpoint.system.event;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Event published when a rule template is deleted.
 * Carbon-points module listens for this event and cleans up related tenant point rules.
 */
@Getter
@AllArgsConstructor
public class RuleTemplateDeletedEvent {
    private final String templateId;
}
