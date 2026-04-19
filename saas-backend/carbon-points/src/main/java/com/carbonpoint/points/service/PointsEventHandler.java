package com.carbonpoint.points.service;

import com.carbonpoint.points.dto.PointsEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Handles {@link PointsEvent} payloads published through the {@link PointsEventBus}.
 * <p>
 * Responsibilities:
 * <ul>
 *   <li>Ignore zero-point events</li>
 *   <li>Delegate positive points to {@link PointAccountService#awardPointsFromEvent}</li>
 *   <li>Trigger level check after point changes</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PointsEventHandler {

    private final PointAccountService pointAccountService;

    /**
     * Process a points event.
     *
     * @param event the event to handle
     */
    public void handle(PointsEvent event) {
        if (event.points() == 0) {
            log.debug("Ignoring zero-point event for user {}", event.userId());
            return;
        }

        if (event.points() > 0) {
            pointAccountService.awardPointsFromEvent(event);
        } else {
            // Negative points (spending) — delegate to existing deductPoints
            pointAccountService.deductPoints(
                    event.userId(),
                    Math.abs(event.points()),
                    event.sourceType(),
                    event.bizId(),
                    event.remark(),
                    null
            );
        }

        log.info("Handled PointsEvent: userId={}, product={}, source={}, points={}, bizId={}",
                event.userId(), event.productCode(), event.sourceType(), event.points(), event.bizId());
    }
}
