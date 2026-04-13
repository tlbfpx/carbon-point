package com.carbonpoint.common.service;

import com.carbonpoint.common.security.SecurityProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * Login rate limiting service using Redis.
 *
 * <p>Redis key patterns:
 * <ul>
 *   <li>login:fail:ip:{ip} — failed attempt count per IP</li>
 *   <li>login:fail:account:{username} — failed attempt count per account</li>
 * </ul>
 *
 * <p>Behavior:
 * <ul>
 *   <li>Failure count reaches {@code failureThreshold}: require captcha</li>
 *   <li>Failure count reaches {@code maxFail}: lock IP or account for 30 minutes</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LoginRateLimitService {

    private final StringRedisTemplate redisTemplate;
    private final SecurityProperties securityProperties;

    private static final String IP_FAIL_KEY_PREFIX = "login:fail:ip:";
    private static final String ACCOUNT_FAIL_KEY_PREFIX = "login:fail:account:";

    /**
     * Record a failed login attempt for both IP and account dimensions.
     */
    public void recordFailure(String ip, String username) {
        int windowMinutes = securityProperties.getRateLimit().getWindowMinutes();
        int maxFailPerIp = securityProperties.getRateLimit().getMaxFailPerIp();
        int maxFailPerAccount = securityProperties.getRateLimit().getMaxFailPerAccount();
        int captchaThreshold = securityProperties.getCaptcha().getFailureThreshold();

        Duration window = Duration.ofMinutes(windowMinutes);

        // Increment IP counter
        String ipKey = IP_FAIL_KEY_PREFIX + ip;
        Long ipCount = increment(ipKey, window);
        log.debug("IP {} login failure count: {}", ip, ipCount);

        // Increment account counter
        String accountKey = ACCOUNT_FAIL_KEY_PREFIX + username;
        Long accountCount = increment(accountKey, window);
        log.debug("Account {} login failure count: {}", username, accountCount);

        // Check lock threshold
        if (ipCount >= maxFailPerIp || accountCount >= maxFailPerAccount) {
            log.warn("Login lock triggered: ip={} ({}), account={} ({})",
                    ip, ipCount, username, accountCount);
        }
    }

    /**
     * Clear failure counts for both IP and account on successful login.
     */
    public void clearFailure(String ip, String username) {
        String ipKey = IP_FAIL_KEY_PREFIX + ip;
        String accountKey = ACCOUNT_FAIL_KEY_PREFIX + username;

        redisTemplate.delete(ipKey);
        redisTemplate.delete(accountKey);
        log.debug("Cleared login failure counts: ip={}, account={}", ip, username);
    }

    /**
     * Check if either IP or account is locked.
     */
    public boolean isLocked(String ip, String username) {
        int maxFailPerIp = securityProperties.getRateLimit().getMaxFailPerIp();
        int maxFailPerAccount = securityProperties.getRateLimit().getMaxFailPerAccount();

        Long ipCount = getCount(IP_FAIL_KEY_PREFIX + ip);
        Long accountCount = getCount(ACCOUNT_FAIL_KEY_PREFIX + username);

        return ipCount >= maxFailPerIp || accountCount >= maxFailPerAccount;
    }

    /**
     * Check if captcha is required (failure count reached threshold).
     * Always returns false when captcha is disabled in configuration.
     */
    public boolean needCaptcha(String ip, String username) {
        if (!securityProperties.getCaptcha().isEnabled()) {
            return false;
        }
        int captchaThreshold = securityProperties.getCaptcha().getFailureThreshold();

        Long ipCount = getCount(IP_FAIL_KEY_PREFIX + ip);
        Long accountCount = getCount(ACCOUNT_FAIL_KEY_PREFIX + username);

        return ipCount >= captchaThreshold || accountCount >= captchaThreshold;
    }

    /**
     * Get remaining login attempts before lock for a given account.
     *
     * @return remaining attempts, or -1 if already locked
     */
    public int getRemainingAttempts(String username) {
        int maxFailPerAccount = securityProperties.getRateLimit().getMaxFailPerAccount();
        Long accountCount = getCount(ACCOUNT_FAIL_KEY_PREFIX + username);

        if (accountCount >= maxFailPerAccount) {
            return -1;
        }
        return maxFailPerAccount - accountCount.intValue();
    }

    private Long increment(String key, Duration window) {
        Long count = redisTemplate.opsForValue().increment(key);
        // Set expiry only on first increment (count == 1)
        if (count != null && count == 1) {
            redisTemplate.expire(key, window);
        }
        return count != null ? count : 0L;
    }

    private Long getCount(String key) {
        String value = redisTemplate.opsForValue().get(key);
        return value != null ? Long.parseLong(value) : 0L;
    }
}
