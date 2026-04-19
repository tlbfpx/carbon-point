package com.carbonpoint.common.service;

import com.carbonpoint.common.security.SecurityProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("LoginRateLimitService")
class LoginRateLimitServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    private SecurityProperties securityProperties;
    private LoginRateLimitService loginRateLimitService;

    private static final String TEST_IP = "192.168.1.100";
    private static final String TEST_USERNAME = "13800138000";

    @BeforeEach
    void setUp() {
        securityProperties = new SecurityProperties();
        securityProperties.getCaptcha().setEnabled(true);
        securityProperties.getCaptcha().setFailureThreshold(3);
        securityProperties.getRateLimit().setMaxFailPerIp(5);
        securityProperties.getRateLimit().setMaxFailPerAccount(5);
        securityProperties.getRateLimit().setWindowMinutes(5);

        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        loginRateLimitService = new LoginRateLimitService(redisTemplate, securityProperties);
    }

    @Nested
    @DisplayName("recordFailure")
    class RecordFailureTests {

        @Test
        @DisplayName("should increment both IP and account counters")
        void shouldIncrementBothCounters() {
            when(valueOperations.increment("login:fail:ip:" + TEST_IP)).thenReturn(1L);
            when(valueOperations.increment("login:fail:account:" + TEST_USERNAME)).thenReturn(1L);

            loginRateLimitService.recordFailure(TEST_IP, TEST_USERNAME);

            verify(valueOperations).increment("login:fail:ip:" + TEST_IP);
            verify(valueOperations).increment("login:fail:account:" + TEST_USERNAME);
        }

        @Test
        @DisplayName("should set expiry on first increment")
        void shouldSetExpiryOnFirstIncrement() {
            when(valueOperations.increment(anyString())).thenReturn(1L);

            loginRateLimitService.recordFailure(TEST_IP, TEST_USERNAME);

            verify(redisTemplate).expire(eq("login:fail:ip:" + TEST_IP), eq(Duration.ofMinutes(5)));
            verify(redisTemplate).expire(eq("login:fail:account:" + TEST_USERNAME), eq(Duration.ofMinutes(5)));
        }

        @Test
        @DisplayName("should not set expiry on subsequent increments")
        void shouldNotSetExpiryOnSubsequentIncrements() {
            when(valueOperations.increment(anyString())).thenReturn(2L);

            loginRateLimitService.recordFailure(TEST_IP, TEST_USERNAME);

            verify(redisTemplate, never()).expire(anyString(), any(Duration.class));
        }
    }

    @Nested
    @DisplayName("clearFailure")
    class ClearFailureTests {

        @Test
        @DisplayName("should delete both IP and account keys")
        void shouldDeleteBothKeys() {
            loginRateLimitService.clearFailure(TEST_IP, TEST_USERNAME);

            verify(redisTemplate).delete("login:fail:ip:" + TEST_IP);
            verify(redisTemplate).delete("login:fail:account:" + TEST_USERNAME);
        }
    }

    @Nested
    @DisplayName("isLocked")
    class IsLockedTests {

        @Test
        @DisplayName("should return true when IP count exceeds threshold")
        void shouldReturnTrueWhenIpCountExceedsThreshold() {
            when(valueOperations.get("login:fail:ip:" + TEST_IP)).thenReturn("5");
            when(valueOperations.get("login:fail:account:" + TEST_USERNAME)).thenReturn("1");

            assertTrue(loginRateLimitService.isLocked(TEST_IP, TEST_USERNAME));
        }

        @Test
        @DisplayName("should return true when account count exceeds threshold")
        void shouldReturnTrueWhenAccountCountExceedsThreshold() {
            when(valueOperations.get("login:fail:ip:" + TEST_IP)).thenReturn("1");
            when(valueOperations.get("login:fail:account:" + TEST_USERNAME)).thenReturn("5");

            assertTrue(loginRateLimitService.isLocked(TEST_IP, TEST_USERNAME));
        }

        @Test
        @DisplayName("should return false when both counts below threshold")
        void shouldReturnFalseWhenBothBelowThreshold() {
            when(valueOperations.get("login:fail:ip:" + TEST_IP)).thenReturn("2");
            when(valueOperations.get("login:fail:account:" + TEST_USERNAME)).thenReturn("2");

            assertFalse(loginRateLimitService.isLocked(TEST_IP, TEST_USERNAME));
        }

        @Test
        @DisplayName("should return false when keys do not exist")
        void shouldReturnFalseWhenKeysDoNotExist() {
            when(valueOperations.get(anyString())).thenReturn(null);

            assertFalse(loginRateLimitService.isLocked(TEST_IP, TEST_USERNAME));
        }
    }

    @Nested
    @DisplayName("needCaptcha")
    class NeedCaptchaTests {

        @Test
        @DisplayName("should return true when captcha enabled and IP count meets threshold")
        void shouldReturnTrueWhenCaptchaEnabledAndIpCountMeetsThreshold() {
            when(valueOperations.get("login:fail:ip:" + TEST_IP)).thenReturn("3");
            when(valueOperations.get("login:fail:account:" + TEST_USERNAME)).thenReturn("1");

            assertTrue(loginRateLimitService.needCaptcha(TEST_IP, TEST_USERNAME));
        }

        @Test
        @DisplayName("should return true when captcha enabled and account count meets threshold")
        void shouldReturnTrueWhenCaptchaEnabledAndAccountCountMeetsThreshold() {
            when(valueOperations.get("login:fail:ip:" + TEST_IP)).thenReturn("1");
            when(valueOperations.get("login:fail:account:" + TEST_USERNAME)).thenReturn("3");

            assertTrue(loginRateLimitService.needCaptcha(TEST_IP, TEST_USERNAME));
        }

        @Test
        @DisplayName("should return false when captcha disabled")
        void shouldReturnFalseWhenCaptchaDisabled() {
            securityProperties.getCaptcha().setEnabled(false);

            assertFalse(loginRateLimitService.needCaptcha(TEST_IP, TEST_USERNAME));
        }

        @Test
        @DisplayName("should return false when both counts below threshold")
        void shouldReturnFalseWhenBothBelowThreshold() {
            when(valueOperations.get("login:fail:ip:" + TEST_IP)).thenReturn("2");
            when(valueOperations.get("login:fail:account:" + TEST_USERNAME)).thenReturn("2");

            assertFalse(loginRateLimitService.needCaptcha(TEST_IP, TEST_USERNAME));
        }
    }

    @Nested
    @DisplayName("getRemainingAttempts")
    class GetRemainingAttemptsTests {

        @Test
        @DisplayName("should return remaining attempts when account not locked")
        void shouldReturnRemainingAttempts() {
            when(valueOperations.get("login:fail:account:" + TEST_USERNAME)).thenReturn("2");

            assertEquals(3, loginRateLimitService.getRemainingAttempts(TEST_USERNAME));
        }

        @Test
        @DisplayName("should return -1 when account is locked")
        void shouldReturnNegativeOneWhenLocked() {
            when(valueOperations.get("login:fail:account:" + TEST_USERNAME)).thenReturn("5");

            assertEquals(-1, loginRateLimitService.getRemainingAttempts(TEST_USERNAME));
        }

        @Test
        @DisplayName("should return max attempts when no failures recorded")
        void shouldReturnMaxAttemptsWhenNoFailures() {
            when(valueOperations.get("login:fail:account:" + TEST_USERNAME)).thenReturn(null);

            assertEquals(5, loginRateLimitService.getRemainingAttempts(TEST_USERNAME));
        }
    }
}
