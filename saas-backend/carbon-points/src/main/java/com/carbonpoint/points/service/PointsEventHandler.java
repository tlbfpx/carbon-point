package com.carbonpoint.points.service;

import com.carbonpoint.points.dto.PointsEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class PointsEventHandler {

    private final PointAccountService pointAccountService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(PointsEvent event) {
        if (event.points() == 0) {
            log.debug("Ignoring zero-point event for user {}", event.userId());
            return;
        }

        try {
            if (event.points() > 0) {
                pointAccountService.awardPointsFromEvent(event);
            } else {
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
        } catch (Exception e) {
            log.error("Failed to handle PointsEvent: userId={}, source={}, points={}, bizId={}",
                    event.userId(), event.sourceType(), event.points(), event.bizId(), e);
        }
    }
}
