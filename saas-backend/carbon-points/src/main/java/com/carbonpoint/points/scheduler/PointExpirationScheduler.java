package com.carbonpoint.points.scheduler;

import com.carbonpoint.points.service.PointExpirationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class PointExpirationScheduler {

    private final PointExpirationService expirationService;

    @Scheduled(cron = "0 0 2 * * ?")
    public void dailyExpirationCheck() {
        log.info("Starting daily point expiration check");
        try {
            expirationService.checkAndProcessExpiredPoints();
        } catch (Exception e) {
            log.error("Point expiration check failed", e);
        }
        log.info("Daily point expiration check completed");
    }
}
