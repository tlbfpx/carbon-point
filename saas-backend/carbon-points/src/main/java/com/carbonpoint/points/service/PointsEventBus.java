package com.carbonpoint.points.service;

import com.carbonpoint.points.dto.PointsEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Synchronous event bus for points-related events.
 * <p>
 * Every event is logged and immediately dispatched to the
 * {@link PointsEventHandler} for processing within the same transaction
 * boundary as the caller.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PointsEventBus {

    private final PointsEventHandler handler;

    /**
     * Publish a points event for synchronous processing.
     *
     * @param event the event to publish
     */
    public void publish(PointsEvent event) {
        log.info("PointsEvent published: userId={}, tenantId={}, product={}, source={}, points={}, bizId={}",
                event.userId(), event.tenantId(), event.productCode(), event.sourceType(),
                event.points(), event.bizId());
        handler.handle(event);
    }
}
