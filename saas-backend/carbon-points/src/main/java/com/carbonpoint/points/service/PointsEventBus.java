package com.carbonpoint.points.service;

import com.carbonpoint.points.dto.PointsEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class PointsEventBus {

    private final ApplicationEventPublisher eventPublisher;

    public void publish(PointsEvent event) {
        log.info("PointsEvent published: userId={}, tenantId={}, product={}, source={}, points={}, bizId={}",
                event.userId(), event.tenantId(), event.productCode(), event.sourceType(),
                event.points(), event.bizId());
        eventPublisher.publishEvent(event);
    }
}
