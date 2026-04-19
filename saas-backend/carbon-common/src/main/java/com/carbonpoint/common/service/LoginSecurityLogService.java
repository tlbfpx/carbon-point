package com.carbonpoint.common.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.carbonpoint.common.entity.LoginSecurityLogEntity;
import com.carbonpoint.common.mapper.LoginSecurityLogMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Login security audit log service.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LoginSecurityLogService extends ServiceImpl<LoginSecurityLogMapper, LoginSecurityLogEntity> {

    /**
     * Record a login security event.
     *
     * @param log the login security log entry
     */
    public void log(LoginSecurityLogEntity log) {
        save(log);
    }

    /**
     * Record a login success event.
     */
    public void logSuccess(Long userId, String username, String ip, String userAgent,
                           String location, String deviceFingerprint,
                           Boolean isNewDevice, Boolean isAbnormalLocation, Boolean isAbnormalTime) {
        LoginSecurityLogEntity entity = new LoginSecurityLogEntity();
        entity.setUserId(userId);
        entity.setUsername(username);
        entity.setIp(ip);
        entity.setUserAgent(userAgent);
        entity.setLocation(location);
        entity.setDeviceFingerprint(deviceFingerprint);
        entity.setStatus("SUCCESS");
        entity.setLoginType("PASSWORD");
        entity.setIsNewDevice(isNewDevice);
        entity.setIsAbnormalLocation(isAbnormalLocation);
        entity.setIsAbnormalTime(isAbnormalTime);
        entity.setCreatedAt(LocalDateTime.now());
        save(entity);
    }

    /**
     * Record a login failure event.
     */
    public void logFailure(String username, String ip, String userAgent, String location,
                           String failReason) {
        LoginSecurityLogEntity entity = new LoginSecurityLogEntity();
        entity.setUsername(username);
        entity.setIp(ip);
        entity.setUserAgent(userAgent);
        entity.setLocation(location);
        entity.setStatus("FAILED");
        entity.setFailReason(failReason);
        entity.setLoginType("PASSWORD");
        entity.setCreatedAt(LocalDateTime.now());
        save(entity);
    }

    /**
     * Record an account locked event.
     */
    public void logLocked(String username, String ip, String userAgent, String location) {
        LoginSecurityLogEntity entity = new LoginSecurityLogEntity();
        entity.setUsername(username);
        entity.setIp(ip);
        entity.setUserAgent(userAgent);
        entity.setLocation(location);
        entity.setStatus("LOCKED");
        entity.setFailReason("ACCOUNT_LOCKED");
        entity.setLoginType("PASSWORD");
        entity.setCreatedAt(LocalDateTime.now());
        save(entity);
    }

    /**
     * Get recent login history for a user.
     */
    public List<LoginSecurityLogEntity> getRecentLogins(Long userId, int limit) {
        LambdaQueryWrapper<LoginSecurityLogEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(LoginSecurityLogEntity::getUserId, userId)
                .orderByDesc(LoginSecurityLogEntity::getCreatedAt)
                .last("LIMIT " + limit);
        return list(wrapper);
    }

    /**
     * Page query login security logs (admin use).
     */
    public Page<LoginSecurityLogEntity> pageQuery(Long userId, String status, String ip,
                                                   LocalDateTime startTime, LocalDateTime endTime,
                                                   int pageNum, int pageSize) {
        LambdaQueryWrapper<LoginSecurityLogEntity> wrapper = new LambdaQueryWrapper<>();
        if (userId != null) {
            wrapper.eq(LoginSecurityLogEntity::getUserId, userId);
        }
        if (status != null && !status.isBlank()) {
            wrapper.eq(LoginSecurityLogEntity::getStatus, status);
        }
        if (ip != null && !ip.isBlank()) {
            wrapper.eq(LoginSecurityLogEntity::getIp, ip);
        }
        if (startTime != null) {
            wrapper.ge(LoginSecurityLogEntity::getCreatedAt, startTime);
        }
        if (endTime != null) {
            wrapper.le(LoginSecurityLogEntity::getCreatedAt, endTime);
        }
        wrapper.orderByDesc(LoginSecurityLogEntity::getCreatedAt);

        Page<LoginSecurityLogEntity> page = new Page<>(pageNum, pageSize);
        return page(page, wrapper);
    }
}
