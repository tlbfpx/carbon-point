package com.carbonpoint.walking.client;

/**
 * Client interface for fetching step data from health platforms.
 * Implementations integrate with WeRun, HealthKit, Health Connect, etc.
 */
public interface HealthApiClient {

    /**
     * Fetch today's step count for the given user.
     *
     * @param userId the user ID
     * @param source data source identifier (werun/healthkit/health_connect)
     * @return step count for today, or null if no data available
     */
    Integer fetchTodaySteps(Long userId, String source);
}
