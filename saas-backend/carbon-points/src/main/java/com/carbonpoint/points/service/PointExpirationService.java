package com.carbonpoint.points.service;

import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.points.entity.PointExpirationConfig;
import com.carbonpoint.points.entity.PointExtensionRecord;
import com.carbonpoint.points.mapper.PointExpirationConfigMapper;
import com.carbonpoint.points.mapper.PointExtensionRecordMapper;
import com.carbonpoint.points.mapper.PointsUserMapper;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.service.NotificationTrigger;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PointExpirationService {

    private final PointExpirationConfigMapper configMapper;
    private final PointExtensionRecordMapper extensionRecordMapper;
    private final PointsUserMapper userMapper;
    private final PointAccountService pointAccountService;
    private final NotificationTrigger notificationTrigger;

    /**
     * Get expiration config for a tenant. Creates default config if not exists.
     */
    public PointExpirationConfig getConfig(Long tenantId) {
        PointExpirationConfig config = configMapper.selectByTenantId(tenantId);
        if (config == null) {
            config = new PointExpirationConfig();
            config.setTenantId(tenantId);
            config.setEnabled(false);
            config.setExpirationMonths(12);
            config.setPreNoticeDays(30);
            config.setManualExtensionEnabled(false);
            config.setExtensionMonths(3);
            config.setHandling("forfeit");
            configMapper.insert(config);
        }
        return config;
    }

    /**
     * Update expiration config (admin).
     */
    @Transactional
    public PointExpirationConfig updateConfig(Long tenantId, boolean enabled, int expirationMonths,
                                              int preNoticeDays, boolean manualExtensionEnabled,
                                              int extensionMonths, String handling) {
        PointExpirationConfig config = getConfig(tenantId);
        config.setEnabled(enabled);
        config.setExpirationMonths(expirationMonths);
        config.setPreNoticeDays(preNoticeDays);
        config.setManualExtensionEnabled(manualExtensionEnabled);
        config.setExtensionMonths(extensionMonths);
        config.setHandling(handling);
        configMapper.updateById(config);
        return config;
    }

    /**
     * Daily scheduled check: iterate all tenants with expiration enabled,
     * process expired points and send pre-expiration notices.
     */
    @Transactional
    public void checkAndProcessExpiredPoints() {
        List<PointExpirationConfig> configs = configMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<PointExpirationConfig>()
                        .eq(PointExpirationConfig::getEnabled, true));

        for (PointExpirationConfig config : configs) {
            try {
                processTenantExpiration(config);
            } catch (Exception e) {
                log.error("Failed to process expiration for tenant {}", config.getTenantId(), e);
            }
        }
    }

    /**
     * Process expiration for all users in a tenant.
     */
    private void processTenantExpiration(PointExpirationConfig config) {
        Long tenantId = config.getTenantId();
        int expirationMonths = config.getExpirationMonths();
        int preNoticeDays = config.getPreNoticeDays();
        LocalDate cutoffDate = LocalDate.now().minusMonths(expirationMonths);
        LocalDate preNoticeCutoff = cutoffDate.plusDays(preNoticeDays);

        // Find users whose last activity is beyond the expiration window
        List<User> users = userMapper.selectListByTenantId(tenantId);
        for (User user : users) {
            try {
                processUserExpiration(user, config, cutoffDate, preNoticeCutoff);
            } catch (Exception e) {
                log.error("Failed to process expiration for user {} in tenant {}", user.getId(), tenantId, e);
            }
        }
    }

    /**
     * Check and process expiration for a single user.
     */
    private void processUserExpiration(User user, PointExpirationConfig config,
                                       LocalDate cutoffDate, LocalDate preNoticeCutoff) {
        LocalDate lastActivity = getLastActivityDate(user);
        if (lastActivity == null) return;

        if (lastActivity.isBefore(cutoffDate)) {
            // Expired: deduct all available points
            int availablePoints = user.getAvailablePoints() != null ? user.getAvailablePoints() : 0;
            if (availablePoints > 0) {
                pointAccountService.deductPoints(user.getId(), availablePoints, "expired",
                        String.valueOf(user.getId()), "积分过期清零", null);
                notificationTrigger.onPointExpired(user.getTenantId(), user.getId(),
                        user.getPhone(), user.getEmail(), availablePoints);
                log.info("Expired {} points for user {} (last activity: {})", availablePoints, user.getId(), lastActivity);
            }
        } else if (!lastActivity.isAfter(preNoticeCutoff)) {
            // Pre-expiration notice window
            int availablePoints = user.getAvailablePoints() != null ? user.getAvailablePoints() : 0;
            if (availablePoints > 0) {
                String expireDate = cutoffDate.plusDays(1).toString();
                notificationTrigger.onPointExpiring(user.getTenantId(), user.getId(),
                        user.getPhone(), user.getEmail(), availablePoints, expireDate);
                log.info("Sent pre-expiration notice to user {} ({} points, expires {})",
                        user.getId(), availablePoints, expireDate);
            }
        }
    }

    /**
     * User manual extension. Only allowed once per user.
     */
    @Transactional
    public void extendExpiration(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) throw new BusinessException(ErrorCode.USER_NOT_FOUND);

        PointExpirationConfig config = getConfig(user.getTenantId());
        if (!Boolean.TRUE.equals(config.getManualExtensionEnabled())) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "该企业未启用积分延期功能");
        }

        // Check if already extended
        PointExtensionRecord existing = extensionRecordMapper.selectByUserId(userId);
        if (existing != null) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "您已使用过延期机会");
        }

        // Record the extension
        PointExtensionRecord record = new PointExtensionRecord();
        record.setUserId(userId);
        record.setTenantId(user.getTenantId());
        record.setExtendedAt(LocalDateTime.now());
        record.setMonthsExtended(config.getExtensionMonths());
        extensionRecordMapper.insert(record);

        log.info("User {} extended point expiration by {} months", userId, config.getExtensionMonths());
    }

    /**
     * Get expiration status for a user (visible to the user).
     */
    public ExpirationStatus getExpirationStatus(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) throw new BusinessException(ErrorCode.USER_NOT_FOUND);

        ExpirationStatus status = new ExpirationStatus();
        PointExpirationConfig config = getConfig(user.getTenantId());

        status.setEnabled(Boolean.TRUE.equals(config.getEnabled()));
        status.setAvailablePoints(user.getAvailablePoints() != null ? user.getAvailablePoints() : 0);
        status.setExpirationMonths(config.getExpirationMonths());
        status.setCanExtend(Boolean.TRUE.equals(config.getManualExtensionEnabled()));

        if (Boolean.TRUE.equals(config.getEnabled())) {
            LocalDate lastActivity = getLastActivityDate(user);
            status.setLastActivityDate(lastActivity);

            if (lastActivity != null) {
                LocalDate expireDate = lastActivity.plusMonths(config.getExpirationMonths());
                status.setExpirationDate(expireDate);

                // Check if user has already extended
                PointExtensionRecord existing = extensionRecordMapper.selectByUserId(userId);
                status.setAlreadyExtended(existing != null);
            }
        }

        return status;
    }

    /**
     * Get the last activity date for a user.
     * Uses lastCheckinDate, falls back to latest point transaction date.
     */
    private LocalDate getLastActivityDate(User user) {
        if (user.getLastCheckinDate() != null) {
            return user.getLastCheckinDate();
        }
        // Fallback: user has never checked in, use created_at as proxy
        return null;
    }

    /**
     * DTO for expiration status response.
     */
    @lombok.Data
    public static class ExpirationStatus {
        private boolean enabled;
        private int availablePoints;
        private int expirationMonths;
        private LocalDate lastActivityDate;
        private LocalDate expirationDate;
        private boolean canExtend;
        private boolean alreadyExtended;
    }
}
