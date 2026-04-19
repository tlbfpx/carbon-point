package com.carbonpoint.system.security;

import lombok.RequiredArgsConstructor;
import org.redisson.api.RSet;
import org.redisson.api.RedissonClient;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

/**
 * Redis-based token blacklist for logout / forced expiry.
 */
@Component
@RequiredArgsConstructor
public class TokenBlacklist {

    private static final String BLACKLIST_PREFIX = "token:blacklist:";

    private final RedissonClient redissonClient;

    /**
     * Add a refresh token to the blacklist (for logout).
     */
    public void blacklistRefreshToken(String token, long expirationMs) {
        RSet<String> set = redissonClient.getSet(BLACKLIST_PREFIX + "refresh");
        set.add(token);
        set.expire(expirationMs, TimeUnit.MILLISECONDS);
    }

    /**
     * Check if a refresh token is blacklisted.
     */
    public boolean isRefreshTokenBlacklisted(String token) {
        return redissonClient.getSet(BLACKLIST_PREFIX + "refresh").contains(token);
    }
}
