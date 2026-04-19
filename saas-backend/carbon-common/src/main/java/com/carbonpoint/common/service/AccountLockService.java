package com.carbonpoint.common.service;

import com.carbonpoint.common.security.SecurityProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * Account lock service using Redis.
 * Manually locks/unlocks user accounts for administrative or security reasons.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AccountLockService {

    private final StringRedisTemplate redisTemplate;
    private final SecurityProperties securityProperties;

    private static final String LOCK_KEY_PREFIX = "account:lock:";

    /**
     * Lock an account for the configured duration.
     *
     * @param username the account to lock
     */
    public void lock(String username) {
        if (!securityProperties.getLock().isEnabled()) {
            return;
        }
        String key = LOCK_KEY_PREFIX + username;
        int durationMinutes = securityProperties.getLock().getDurationMinutes();
        redisTemplate.opsForValue().set(key, "locked", Duration.ofMinutes(durationMinutes));
        log.info("Account locked: username={}, duration={}min", username, durationMinutes);
    }

    /**
     * Lock an account for a custom duration.
     *
     * @param username the account to lock
     * @param duration custom lock duration
     */
    public void lock(String username, Duration duration) {
        if (!securityProperties.getLock().isEnabled()) {
            return;
        }
        String key = LOCK_KEY_PREFIX + username;
        redisTemplate.opsForValue().set(key, "locked", duration);
        log.info("Account locked: username={}, duration={}", username, duration);
    }

    /**
     * Unlock an account.
     *
     * @param username the account to unlock
     */
    public void unlock(String username) {
        String key = LOCK_KEY_PREFIX + username;
        redisTemplate.delete(key);
        log.info("Account unlocked: username={}", username);
    }

    /**
     * Check if an account is currently locked.
     *
     * @param username the account to check
     * @return true if locked
     */
    public boolean isLocked(String username) {
        String key = LOCK_KEY_PREFIX + username;
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }

    /**
     * Get remaining lock time in seconds, or -1 if not locked.
     */
    public long getRemainingSeconds(String username) {
        String key = LOCK_KEY_PREFIX + username;
        Long ttl = redisTemplate.getExpire(key);
        return ttl != null && ttl > 0 ? ttl : -1;
    }
}
