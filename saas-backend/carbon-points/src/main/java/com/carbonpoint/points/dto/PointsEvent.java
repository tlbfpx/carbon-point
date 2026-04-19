package com.carbonpoint.points.dto;

/**
 * Event payload for the PointsEventBus.
 * Carries all context needed to award/deduct points and record a transaction
 * with product and source metadata.
 *
 * @param tenantId     the tenant the user belongs to
 * @param userId       the target user
 * @param productCode  product identifier, e.g. "stair_climbing", "walking"
 * @param sourceType   source of the event, e.g. "check_in", "step_claim", "streak_bonus", "exchange"
 * @param points       positive = earn, negative = spend; 0 is a no-op
 * @param bizId        business reference ID (check-in record ID, order ID, etc.)
 * @param remark       human-readable description
 */
public record PointsEvent(
    Long tenantId,
    Long userId,
    String productCode,
    String sourceType,
    int points,
    String bizId,
    String remark
) {}
