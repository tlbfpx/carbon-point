package com.carbonpoint.walking.client;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

/**
 * Stub implementation of HealthApiClient for development and testing.
 * Returns a configurable fixed step count value.
 */
@Component
@Primary
public class StubHealthApiClient implements HealthApiClient {

    /** Default fixed step count returned by the stub */
    private static final int DEFAULT_STEP_COUNT = 8000;

    private int fixedStepCount = DEFAULT_STEP_COUNT;

    /** Set to null to simulate "no data available" */
    private Integer overrideStepCount = null;

    @Override
    public Integer fetchTodaySteps(Long userId, String source) {
        if (overrideStepCount != null) {
            return overrideStepCount;
        }
        return fixedStepCount;
    }

    /**
     * Configure the fixed step count returned by this stub.
     */
    public void setFixedStepCount(int stepCount) {
        this.fixedStepCount = stepCount;
    }

    /**
     * Override step count (set null to revert to fixedStepCount).
     * Set to a negative value to simulate "no data available" (returns null).
     */
    public void setOverrideStepCount(Integer stepCount) {
        this.overrideStepCount = stepCount;
    }
}
