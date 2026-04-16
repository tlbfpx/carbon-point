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
@DisplayName("AccountLockService")
class AccountLockServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    private SecurityProperties securityProperties;
    private AccountLockService accountLockService;

    private static final String TEST_USERNAME = "13800138000";

    @BeforeEach
    void setUp() {
        securityProperties = new SecurityProperties();
        securityProperties.getLock().setEnabled(true);
        securityProperties.getLock().setDurationMinutes(30);

        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        accountLockService = new AccountLockService(redisTemplate, securityProperties);
    }

    @Nested
    @DisplayName("lock")
    class LockTests {

        @Test
        @DisplayName("should lock account for configured duration when lock enabled")
        void shouldLockAccountForConfiguredDuration() {
            accountLockService.lock(TEST_USERNAME);

            verify(valueOperations).set(
                    eq("account:lock:" + TEST_USERNAME),
                    eq("locked"),
                    eq(Duration.ofMinutes(30))
            );
        }

        @Test
        @DisplayName("should not lock when lock is disabled")
        void shouldNotLockWhenDisabled() {
            securityProperties.getLock().setEnabled(false);

            accountLockService.lock(TEST_USERNAME);

            verify(valueOperations, never()).set(anyString(), anyString(), any(Duration.class));
        }

        @Test
        @DisplayName("should lock with custom duration")
        void shouldLockWithCustomDuration() {
            Duration customDuration = Duration.ofHours(1);

            accountLockService.lock(TEST_USERNAME, customDuration);

            verify(valueOperations).set(
                    eq("account:lock:" + TEST_USERNAME),
                    eq("locked"),
                    eq(customDuration)
            );
        }
    }

    @Nested
    @DisplayName("unlock")
    class UnlockTests {

        @Test
        @DisplayName("should delete the lock key")
        void shouldDeleteLockKey() {
            accountLockService.unlock(TEST_USERNAME);

            verify(redisTemplate).delete("account:lock:" + TEST_USERNAME);
        }
    }

    @Nested
    @DisplayName("isLocked")
    class IsLockedTests {

        @Test
        @DisplayName("should return true when key exists")
        void shouldReturnTrueWhenKeyExists() {
            when(redisTemplate.hasKey("account:lock:" + TEST_USERNAME)).thenReturn(true);

            assertTrue(accountLockService.isLocked(TEST_USERNAME));
        }

        @Test
        @DisplayName("should return false when key does not exist")
        void shouldReturnFalseWhenKeyDoesNotExist() {
            when(redisTemplate.hasKey("account:lock:" + TEST_USERNAME)).thenReturn(false);

            assertFalse(accountLockService.isLocked(TEST_USERNAME));
        }
    }

    @Nested
    @DisplayName("getRemainingSeconds")
    class GetRemainingSecondsTests {

        @Test
        @DisplayName("should return TTL when key is locked")
        void shouldReturnTtlWhenLocked() {
            when(redisTemplate.getExpire("account:lock:" + TEST_USERNAME)).thenReturn(1500L);

            assertEquals(1500L, accountLockService.getRemainingSeconds(TEST_USERNAME));
        }

        @Test
        @DisplayName("should return -1 when key does not exist")
        void shouldReturnNegativeOneWhenNotLocked() {
            when(redisTemplate.getExpire("account:lock:" + TEST_USERNAME)).thenReturn(-2L);

            assertEquals(-1L, accountLockService.getRemainingSeconds(TEST_USERNAME));
        }

        @Test
        @DisplayName("should return -1 when TTL is null")
        void shouldReturnNegativeOneWhenTtlIsNull() {
            when(redisTemplate.getExpire("account:lock:" + TEST_USERNAME)).thenReturn(null);

            assertEquals(-1L, accountLockService.getRemainingSeconds(TEST_USERNAME));
        }
    }
}
