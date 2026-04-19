package com.carbonpoint.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.security.PlatformJwtUtil;
import com.carbonpoint.system.dto.PlatformAdminVO;
import com.carbonpoint.system.dto.PlatformAuthResponse;
import com.carbonpoint.system.entity.PlatformAdminEntity;
import com.carbonpoint.system.mapper.PlatformAdminMapper;
import com.carbonpoint.system.service.PlatformAuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * Platform admin authentication service implementation.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PlatformAuthServiceImpl implements PlatformAuthService {

    private final PlatformAdminMapper adminMapper;
    private final PlatformJwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final StringRedisTemplate redisTemplate;

    @Value("${jwt.access-token-expiration}")
    private long accessTokenExpiration;

    private static final String REFRESH_TOKEN_BLACKLIST_PREFIX = "platform:refresh_token:bl:";
    private static final String REFRESH_TOKEN_META_PREFIX = "platform:refresh_token:meta:";

    @Override
    @Transactional
    public PlatformAuthResponse login(String username, String password, String deviceFingerprint, String clientIp) {
        PlatformAdminEntity admin = adminMapper.selectOne(
                new LambdaQueryWrapper<PlatformAdminEntity>()
                        .eq(PlatformAdminEntity::getUsername, username)
        );

        if (admin == null) {
            log.warn("Platform login failed: username not found: {}", username);
            throw new BusinessException(ErrorCode.AUTH_CREDENTIALS_INVALID);
        }

        if (PlatformAdminEntity.STATUS_DISABLED.equals(admin.getStatus())) {
            log.warn("Platform login failed: admin disabled: {}", username);
            throw new BusinessException(ErrorCode.PLATFORM_ADMIN_DISABLED);
        }

        if (!passwordEncoder.matches(password, admin.getPasswordHash())) {
            log.warn("Platform login failed: wrong password for username: {}", username);
            throw new BusinessException(ErrorCode.AUTH_CREDENTIALS_INVALID);
        }

        // Update last login info
        admin.setLastLoginAt(LocalDateTime.now());
        adminMapper.updateById(admin);

        String accessToken = jwtUtil.generateAccessToken(admin.getId(), admin.getUsername(), admin.getRole());
        String refreshToken = jwtUtil.generateRefreshToken(admin.getId(), admin.getUsername());

        // Store refresh token metadata
        String jti = jwtUtil.getJtiFromRefreshToken(refreshToken);
        storeRefreshTokenMetadata(jti, admin.getId(), deviceFingerprint, clientIp);

        log.info("Platform admin logged in: username={}, role={}", username, admin.getRole());

        return PlatformAuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(accessTokenExpiration / 1000)
                .admin(toVO(admin))
                .build();
    }

    @Override
    public PlatformAuthResponse refreshToken(String refreshToken, String deviceFingerprint, String clientIp) {
        // Check if token is blacklisted
        if (Boolean.TRUE.equals(redisTemplate.hasKey(REFRESH_TOKEN_BLACKLIST_PREFIX + hashToken(refreshToken)))) {
            throw new BusinessException(ErrorCode.AUTH_REFRESH_TOKEN_INVALID);
        }

        var claims = jwtUtil.parseToken(refreshToken);
        if (claims == null) {
            throw new BusinessException(ErrorCode.AUTH_REFRESH_TOKEN_INVALID);
        }

        Long adminId = claims.get("adminId", Long.class);
        String type = claims.get("type", String.class);
        if (!"platform_admin".equals(type) || adminId == null) {
            throw new BusinessException(ErrorCode.AUTH_REFRESH_TOKEN_INVALID);
        }

        String jti = claims.getId();
        // Security validation: device fingerprint + IP check
        validateRefreshTokenMetadata(jti, deviceFingerprint, clientIp);

        PlatformAdminEntity admin = adminMapper.selectById(adminId);
        if (admin == null || PlatformAdminEntity.STATUS_DISABLED.equals(admin.getStatus())) {
            // Admin disabled — invalidate all refresh tokens
            invalidateAllForAdmin(adminId);
            throw new BusinessException(ErrorCode.PLATFORM_ADMIN_DISABLED);
        }

        // Mark old token as used
        markRefreshTokenAsUsed(jti);

        // Blacklist old refresh token
        redisTemplate.opsForValue().set(
                REFRESH_TOKEN_BLACKLIST_PREFIX + hashToken(refreshToken),
                "1",
                Duration.ofMillis(2592000000L)
        );

        String newAccessToken = jwtUtil.generateAccessToken(admin.getId(), admin.getUsername(), admin.getRole());
        String newRefreshToken = jwtUtil.generateRefreshToken(admin.getId(), admin.getUsername());

        // Store metadata for new refresh token
        String newJti = jwtUtil.getJtiFromRefreshToken(newRefreshToken);
        storeRefreshTokenMetadata(newJti, admin.getId(), deviceFingerprint, clientIp);

        log.info("Platform admin refresh token rotated: adminId={}, oldJti={}", adminId, jti);

        return PlatformAuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .expiresIn(accessTokenExpiration / 1000)
                .admin(toVO(admin))
                .build();
    }

    @Override
    public void logout(Long adminId) {
        log.info("Platform admin logged out: adminId={}", adminId);
    }

    private void storeRefreshTokenMetadata(String jti, Long adminId,
                                           String deviceFingerprint, String clientIp) {
        Map<String, String> meta = new HashMap<>();
        meta.put("jti", jti);
        meta.put("adminId", String.valueOf(adminId));
        meta.put("deviceFingerprint", deviceFingerprint != null ? deviceFingerprint : "");
        meta.put("issuedIp", clientIp != null ? clientIp : "");
        meta.put("issuedAt", String.valueOf(Instant.now().toEpochMilli()));
        meta.put("used", "false");
        redisTemplate.opsForHash().putAll(REFRESH_TOKEN_META_PREFIX + jti, meta);
        redisTemplate.expire(REFRESH_TOKEN_META_PREFIX + jti, Duration.ofMillis(2592000000L));
    }

    private Map<Object, Object> getRefreshTokenMetadata(String jti) {
        return redisTemplate.opsForHash().entries(REFRESH_TOKEN_META_PREFIX + jti);
    }

    private void validateRefreshTokenMetadata(String jti, String deviceFingerprint, String clientIp) {
        Map<Object, Object> meta = getRefreshTokenMetadata(jti);
        if (meta == null || meta.isEmpty()) {
            log.warn("Platform refresh token jti not found in Redis: {}", jti);
            throw new BusinessException(ErrorCode.AUTH_REFRESH_TOKEN_INVALID);
        }

        // Check if already used (replay)
        if ("true".equals(meta.get("used"))) {
            log.warn("Platform refresh token already used (replay attack): jti={}", jti);
            throw new BusinessException(ErrorCode.AUTH_REFRESH_TOKEN_INVALID);
        }

        // Device fingerprint check
        String storedFingerprint = (String) meta.get("deviceFingerprint");
        if (storedFingerprint != null && !storedFingerprint.isBlank()
                && deviceFingerprint != null && !deviceFingerprint.equals(storedFingerprint)) {
            log.warn("Platform admin device fingerprint mismatch: adminId={}", meta.get("adminId"));
            throw new BusinessException(ErrorCode.AUTH_LOGIN_RISK_DETECTED);
        }

        // IP address check
        String storedIp = (String) meta.get("issuedIp");
        if (storedIp != null && !storedIp.isBlank()
                && clientIp != null && !clientIp.equals(storedIp)) {
            log.warn("Platform admin IP changed: adminId={}, issued={}, current={}",
                    meta.get("adminId"), storedIp, clientIp);
            throw new BusinessException(ErrorCode.AUTH_LOGIN_RISK_DETECTED);
        }
    }

    private void markRefreshTokenAsUsed(String jti) {
        redisTemplate.opsForHash().put(REFRESH_TOKEN_META_PREFIX + jti, "used", "true");
    }

    private void invalidateAllForAdmin(Long adminId) {
        // Scan all platform refresh token metadata keys and delete those
        // belonging to this admin (plus blacklist the tokens themselves).
        String pattern = REFRESH_TOKEN_META_PREFIX + "*";
        Set<String> keys = redisTemplate.keys(pattern);
        if (keys == null) {
            return;
        }
        int invalidated = 0;
        for (String key : keys) {
            Map<Object, Object> meta = redisTemplate.opsForHash().entries(key);
            if (String.valueOf(adminId).equals(meta.get("adminId"))) {
                String jti = (String) meta.get("jti");
                // Delete metadata
                redisTemplate.delete(key);
                // Blacklist the token by storing its hash with a short TTL
                // (we can't reconstruct the raw token, so we blacklist by jti lookup)
                if (jti != null) {
                    redisTemplate.opsForValue().set(
                            REFRESH_TOKEN_BLACKLIST_PREFIX + "jti:" + jti,
                            "1",
                            Duration.ofMillis(2592000000L)
                    );
                }
                invalidated++;
            }
        }
        log.info("Invalidated {} refresh tokens for platform adminId={}", invalidated, adminId);
    }

    /**
     * SHA-256 hash of token, Base64-encoded, for use as Redis key.
     * Avoids storing raw JWT tokens in Redis keys and provides
     * collision-resistant hashing (unlike String.hashCode()).
     */
    private String hashToken(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (Exception e) {
            throw new RuntimeException("Failed to hash token", e);
        }
    }

    private PlatformAdminVO toVO(PlatformAdminEntity admin) {
        return PlatformAdminVO.builder()
                .id(admin.getId())
                .username(admin.getUsername())
                .displayName(admin.getDisplayName())
                .role(admin.getRole())
                .status(admin.getStatus())
                .lastLoginAt(admin.getLastLoginAt())
                .createdAt(admin.getCreatedAt())
                .build();
    }
}
