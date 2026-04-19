package com.carbonpoint.system.security;

import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Redis-based refresh token metadata management for security validation.
 * Stores metadata keyed by jti (JWT ID), supports rotation and invalidation.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RefreshTokenMetadataService {

    private static final String REFRESH_TOKEN_META_PREFIX = "refresh_token:meta:";
    private static final String USER_REFRESH_TOKEN_INDEX_PREFIX = "user:refresh_tokens:";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Store refresh token metadata on first issuance.
     */
    public void storeMetadata(String jti, Long userId, Long tenantId,
                               String deviceFingerprint, String issuedIp) {
        RefreshTokenMetadata meta = new RefreshTokenMetadata();
        meta.setJti(jti);
        meta.setUserId(userId);
        meta.setTenantId(tenantId);
        meta.setDeviceFingerprint(deviceFingerprint);
        meta.setIssuedIp(issuedIp);
        meta.setIssuedAt(Instant.now().toEpochMilli());
        meta.setUsed(false);

        try {
            String json = objectMapper.writeValueAsString(meta);
            redisTemplate.opsForValue().set(
                    REFRESH_TOKEN_META_PREFIX + jti,
                    json,
                    Duration.ofMillis(2592000000L) // 30 days, matches refresh token TTL
            );
            // Index: maintain a set of jtis per user for bulk invalidation (e.g., on password reset)
            redisTemplate.opsForSet().add(USER_REFRESH_TOKEN_INDEX_PREFIX + userId, jti);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize refresh token metadata", e);
            throw new BusinessException(ErrorCode.SYSTEM_ERROR);
        }
    }

    /**
     * Retrieve refresh token metadata by jti.
     */
    public RefreshTokenMetadata getMetadata(String jti) {
        String json = redisTemplate.opsForValue().get(REFRESH_TOKEN_META_PREFIX + jti);
        if (json == null) {
            return null;
        }
        try {
            return objectMapper.readValue(json, RefreshTokenMetadata.class);
        } catch (JsonProcessingException e) {
            log.error("Failed to deserialize refresh token metadata for jti={}", jti, e);
            return null;
        }
    }

    /**
     * Mark a refresh token jti as used (after rotation).
     */
    public void markAsUsed(String jti) {
        RefreshTokenMetadata meta = getMetadata(jti);
        if (meta != null) {
            meta.setUsed(true);
            try {
                String json = objectMapper.writeValueAsString(meta);
                redisTemplate.opsForValue().set(REFRESH_TOKEN_META_PREFIX + jti, json,
                        Duration.ofMillis(2592000000L));
            } catch (JsonProcessingException e) {
                log.error("Failed to update refresh token metadata after use", e);
            }
        }
    }

    /**
     * Validate refresh token metadata for rotation security checks.
     * Returns null if all checks pass; throws BusinessException if any check fails.
     */
    public void validateForRotation(String jti, String deviceFingerprint, String currentIp) {
        RefreshTokenMetadata meta = getMetadata(jti);
        if (meta == null) {
            log.warn("Refresh token jti not found in Redis: {}", jti);
            throw new BusinessException(ErrorCode.AUTH_REFRESH_TOKEN_INVALID);
        }

        // 1. Check if already used (replay attack)
        if (Boolean.TRUE.equals(meta.isUsed())) {
            log.warn("Refresh token already used (replay attack detected): jti={}", jti);
            throw new BusinessException(ErrorCode.AUTH_REFRESH_TOKEN_INVALID);
        }

        // 2. Device fingerprint check
        if (meta.getDeviceFingerprint() != null && deviceFingerprint != null
                && !meta.getDeviceFingerprint().equals(deviceFingerprint)) {
            log.warn("Device fingerprint mismatch for userId={}: expected={}, got={}",
                    meta.getUserId(), meta.getDeviceFingerprint(), deviceFingerprint);
            throw new BusinessException(ErrorCode.AUTH_LOGIN_RISK_DETECTED);
        }

        // 3. IP address change check
        if (meta.getIssuedIp() != null && currentIp != null && !meta.getIssuedIp().equals(currentIp)) {
            log.warn("IP address changed for userId={}: issued={}, current={}",
                    meta.getUserId(), meta.getIssuedIp(), currentIp);
            throw new BusinessException(ErrorCode.AUTH_LOGIN_RISK_DETECTED);
        }
    }

    /**
     * Invalidate all refresh tokens for a specific user (e.g., on password reset or account disabled).
     */
    public void invalidateAllForUser(Long userId) {
        String indexKey = USER_REFRESH_TOKEN_INDEX_PREFIX + userId;
        var jtis = redisTemplate.opsForSet().members(indexKey);
        if (jtis != null) {
            for (String jti : jtis) {
                redisTemplate.delete(REFRESH_TOKEN_META_PREFIX + jti);
            }
            redisTemplate.delete(indexKey);
            log.info("Invalidated {} refresh tokens for userId={}", jtis.size(), userId);
        }
    }

    /**
     * Invalidate a specific refresh token by jti.
     */
    public void invalidateByJti(String jti) {
        redisTemplate.delete(REFRESH_TOKEN_META_PREFIX + jti);
    }

    /**
     * DTO for refresh token metadata stored in Redis.
     */
    @Data
    public static class RefreshTokenMetadata {
        private String jti;
        private Long userId;
        private Long tenantId;
        private String deviceFingerprint;
        private String issuedIp;
        private Long issuedAt;
        private boolean used;
    }
}
