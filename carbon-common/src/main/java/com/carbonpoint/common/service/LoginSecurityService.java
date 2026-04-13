package com.carbonpoint.common.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * Login security anomaly detection service.
 *
 * <p>Detects:
 * <ul>
 *   <li>New device logins</li>
 *   <li>Abnormal location logins (different city from last login)</li>
 *   <li>Abnormal time logins (2:00 AM - 5:00 AM)</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LoginSecurityService {

    private final LoginSecurityLogService loginSecurityLogService;

    private static final LocalTime ABNORMAL_START = LocalTime.of(2, 0);
    private static final LocalTime ABNORMAL_END = LocalTime.of(5, 0);

    /**
     * Detect if this is a new device login.
     * Compares device fingerprint against recent successful login records.
     *
     * @param userId             the user ID
     * @param deviceFingerprint  current device fingerprint
     * @return true if this is a new/unknown device
     */
    public boolean detectNewDevice(Long userId, String deviceFingerprint) {
        if (deviceFingerprint == null || deviceFingerprint.isBlank()) {
            return false;
        }

        List<com.carbonpoint.common.entity.LoginSecurityLogEntity> recentLogins =
                loginSecurityLogService.getRecentLogins(userId, 5);

        for (var login : recentLogins) {
            if ("SUCCESS".equals(login.getStatus())
                    && deviceFingerprint.equals(login.getDeviceFingerprint())) {
                return false;
            }
        }
        return !recentLogins.isEmpty(); // Only flag as new if user has history
    }

    /**
     * Detect if this is an abnormal location login.
     * Compares city against last successful login's location.
     *
     * @param userId   the user ID
     * @param location current login location
     * @return true if location differs from last known location
     */
    public boolean detectAbnormalLocation(Long userId, String location) {
        if (location == null || location.isBlank()) {
            return false;
        }

        List<com.carbonpoint.common.entity.LoginSecurityLogEntity> recentLogins =
                loginSecurityLogService.getRecentLogins(userId, 1);

        if (recentLogins.isEmpty()) {
            return false;
        }

        var lastLogin = recentLogins.get(0);
        if (!"SUCCESS".equals(lastLogin.getStatus())) {
            return false;
        }

        // Simple comparison — in production would use IP geolocation service
        String lastLocation = lastLogin.getLocation();
        if (lastLocation == null || lastLocation.isBlank()) {
            return false;
        }

        boolean isDifferent = !location.equals(lastLocation);
        if (isDifferent) {
            log.warn("Abnormal location detected: userId={}, lastLocation={}, currentLocation={}",
                    userId, lastLocation, location);
        }
        return isDifferent;
    }

    /**
     * Detect if login is at an abnormal time (2:00 AM - 5:00 AM).
     *
     * @param userId the user ID
     * @return true if login time is abnormal
     */
    public boolean detectAbnormalTime(Long userId) {
        LocalDateTime now = LocalDateTime.now();
        LocalTime time = now.toLocalTime();

        boolean isAbnormal = !time.isBefore(ABNORMAL_START) && time.isBefore(ABNORMAL_END);
        if (isAbnormal) {
            log.warn("Abnormal login time detected: userId={}, time={}", userId, time);
        }
        return isAbnormal;
    }

    /**
     * Get the last known location for a user.
     */
    public String getLastKnownLocation(Long userId) {
        List<com.carbonpoint.common.entity.LoginSecurityLogEntity> recentLogins =
                loginSecurityLogService.getRecentLogins(userId, 1);

        if (recentLogins.isEmpty()) {
            return null;
        }
        return recentLogins.get(0).getLocation();
    }

    /**
     * Check if a user has any recent suspicious activity (failed attempts in history).
     */
    public boolean hasRecentFailures(Long userId, int limit) {
        List<com.carbonpoint.common.entity.LoginSecurityLogEntity> recentLogins =
                loginSecurityLogService.getRecentLogins(userId, limit);

        return recentLogins.stream().anyMatch(l -> "FAILED".equals(l.getStatus()));
    }
}
