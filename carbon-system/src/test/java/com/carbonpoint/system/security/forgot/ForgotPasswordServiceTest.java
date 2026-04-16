package com.carbonpoint.system.security.forgot;

import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.security.AppPasswordEncoder;
import com.carbonpoint.common.security.PasswordValidator;
import com.carbonpoint.common.security.SecurityProperties;
import com.carbonpoint.system.service.PasswordHistoryService;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.mapper.UserMapper;
import com.carbonpoint.system.security.RefreshTokenMetadataService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.Map;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ForgotPasswordService")
class ForgotPasswordServiceTest {

    @Mock private StringRedisTemplate redisTemplate;
    @Mock private ValueOperations<String, String> valueOperations;
    @Mock private UserMapper userMapper;
    @Mock private AppPasswordEncoder passwordEncoder;
    @Mock private PasswordValidator passwordValidator;
    @Mock private PasswordHistoryService passwordHistoryService;
    @Mock private RefreshTokenMetadataService refreshTokenMetadataService;

    private ForgotPasswordService service;

    private static final String TEST_PHONE = "13800138000";
    private static final Long USER_ID = 1L;
    private static final Long TENANT_ID = 10L;

    @BeforeEach
    void setUp() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        service = new ForgotPasswordService(
                redisTemplate, userMapper, passwordEncoder,
                passwordValidator, passwordHistoryService, refreshTokenMetadataService);
    }

    // ===== sendResetCode tests =====

    @Nested
    @DisplayName("sendResetCode")
    class SendResetCodeTests {

        @Test
        @DisplayName("should reject null phoneOrEmail")
        void shouldRejectNullInput() {
            assertThrows(BusinessException.class, () -> service.sendResetCode(null));
            verify(valueOperations, never()).set(anyString(), anyString(), anyLong(), any());
        }

        @Test
        @DisplayName("should reject blank phoneOrEmail")
        void shouldRejectBlankInput() {
            assertThrows(BusinessException.class, () -> service.sendResetCode("  "));
            verify(valueOperations, never()).set(anyString(), anyString(), anyLong(), any());
        }

        @Test
        @DisplayName("should store 6-digit code in Redis for phone")
        void shouldStoreCodeForPhone() {
            String channel = service.sendResetCode(TEST_PHONE);

            assertEquals("sms", channel);
            ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
            ArgumentCaptor<String> codeCaptor = ArgumentCaptor.forClass(String.class);

            verify(valueOperations).set(
                    keyCaptor.capture(),
                    codeCaptor.capture(),
                    eq(10L),
                    eq(TimeUnit.MINUTES)
            );

            assertEquals("reset:code:" + TEST_PHONE, keyCaptor.getValue());
            String code = codeCaptor.getValue();
            assertEquals(6, code.length());
            assertTrue(code.matches("\\d{6}"));
        }

        @Test
        @DisplayName("should store 6-digit code in Redis for email")
        void shouldStoreCodeForEmail() {
            String channel = service.sendResetCode("user@example.com");

            assertEquals("email", channel);
            ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);

            verify(valueOperations).set(
                    keyCaptor.capture(),
                    anyString(),
                    eq(10L),
                    eq(TimeUnit.MINUTES)
            );

            assertEquals("reset:code:user@example.com", keyCaptor.getValue());
        }

        @Test
        @DisplayName("should return channel sms for phone number")
        void shouldReturnSmsChannelForPhone() {
            String channel = service.sendResetCode("13912345678");
            assertEquals("sms", channel);
        }

        @Test
        @DisplayName("should return channel email for email address")
        void shouldReturnEmailChannelForEmail() {
            String channel = service.sendResetCode("test@domain.com");
            assertEquals("email", channel);
        }
    }

    // ===== validateCode tests =====

    @Nested
    @DisplayName("validateCode")
    class ValidateCodeTests {

        @Test
        @DisplayName("should reject null phoneOrEmail")
        void shouldRejectNullPhone() {
            assertThrows(BusinessException.class,
                    () -> service.validateCode(null, "123456"));
        }

        @Test
        @DisplayName("should reject null code")
        void shouldRejectNullCode() {
            assertThrows(BusinessException.class,
                    () -> service.validateCode(TEST_PHONE, null));
        }

        @Test
        @DisplayName("should throw when code not found in Redis")
        void shouldThrowWhenCodeNotFound() {
            when(valueOperations.get("reset:code:" + TEST_PHONE)).thenReturn(null);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> service.validateCode(TEST_PHONE, "123456"));
            assertEquals(ErrorCode.AUTH_CREDENTIALS_INVALID.getCode(), ex.getCode());
        }

        @Test
        @DisplayName("should throw when code does not match")
        void shouldThrowWhenCodeMismatch() {
            when(valueOperations.get("reset:code:" + TEST_PHONE)).thenReturn("123456");

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> service.validateCode(TEST_PHONE, "654321"));
            assertEquals(ErrorCode.AUTH_CREDENTIALS_INVALID.getCode(), ex.getCode());
        }

        @Test
        @DisplayName("should delete code after successful validation")
        void shouldDeleteCodeAfterSuccess() {
            when(valueOperations.get("reset:code:" + TEST_PHONE)).thenReturn("123456");

            service.validateCode(TEST_PHONE, "123456");

            verify(redisTemplate).delete("reset:code:" + TEST_PHONE);
        }

        @Test
        @DisplayName("should generate UUID reset token and store in Redis")
        void shouldGenerateAndStoreToken() {
            when(valueOperations.get("reset:code:" + TEST_PHONE)).thenReturn("123456");

            String token = service.validateCode(TEST_PHONE, "123456");

            assertNotNull(token);
            assertEquals(32, token.length()); // UUID without dashes
            assertTrue(token.matches("[a-f0-9]{32}"));

            verify(valueOperations).set(
                    eq("reset:token:" + token),
                    eq(TEST_PHONE),
                    eq(15L),
                    eq(TimeUnit.MINUTES)
            );
        }

        @Test
        @DisplayName("should use AUTH_CREDENTIALS_INVALID error code")
        void shouldUseCorrectErrorCode() {
            when(valueOperations.get("reset:code:" + TEST_PHONE)).thenReturn(null);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> service.validateCode(TEST_PHONE, "123456"));
            assertEquals(ErrorCode.AUTH_CREDENTIALS_INVALID.getCode(), ex.getCode());
        }
    }

    // ===== resetPassword tests =====

    @Nested
    @DisplayName("resetPassword")
    class ResetPasswordTests {

        @Test
        @DisplayName("should reject null token")
        void shouldRejectNullToken() {
            assertThrows(BusinessException.class,
                    () -> service.resetPassword(null, "NewPass123!"));
        }

        @Test
        @DisplayName("should reject null password")
        void shouldRejectNullPassword() {
            assertThrows(BusinessException.class,
                    () -> service.resetPassword("token123", null));
        }

        @Test
        @DisplayName("should throw when token not found (expired)")
        void shouldThrowWhenTokenExpired() {
            when(valueOperations.get("reset:token:token123")).thenReturn(null);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> service.resetPassword("token123", "NewPass123!"));
            assertEquals(ErrorCode.AUTH_CREDENTIALS_INVALID.getCode(), ex.getCode());
            assertTrue(ex.getMessage().contains("过期"));
        }

        @Test
        @DisplayName("should throw when user not found")
        void shouldThrowWhenUserNotFound() {
            when(valueOperations.get("reset:token:token123")).thenReturn(TEST_PHONE);
            when(userMapper.selectByPhone(TEST_PHONE)).thenReturn(null);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> service.resetPassword("token123", "NewPass123!"));
            assertEquals(ErrorCode.USER_NOT_FOUND.getCode(), ex.getCode());
        }

        @Test
        @DisplayName("should validate password strength")
        void shouldValidatePasswordStrength() {
            User user = createTestUser();
            when(valueOperations.get("reset:token:token123")).thenReturn(TEST_PHONE);
            when(userMapper.selectByPhone(TEST_PHONE)).thenReturn(user);
            doThrow(new BusinessException(ErrorCode.USER_PASSWORD_WEAK))
                    .when(passwordValidator).validate("weak");

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> service.resetPassword("token123", "weak"));
            assertEquals(ErrorCode.USER_PASSWORD_WEAK.getCode(), ex.getCode());
        }

        @Test
        @DisplayName("should reject recently used password")
        void shouldRejectRecentlyUsedPassword() {
            User user = createTestUser();
            when(valueOperations.get("reset:token:token123")).thenReturn(TEST_PHONE);
            when(userMapper.selectByPhone(TEST_PHONE)).thenReturn(user);

            SecurityProperties.PasswordProperties props = new SecurityProperties.PasswordProperties();
            props.setHistoryCount(5);
            SecurityProperties secProps = new SecurityProperties();
            secProps.setPassword(props);
            when(passwordValidator.getSecurityProperties()).thenReturn(secProps);
            doThrow(new BusinessException(ErrorCode.AUTH_PASSWORD_HISTORY_REUSE))
                    .when(passwordHistoryService).checkAndRecord(eq(USER_ID), eq(TENANT_ID), eq("ReusedPass1!"));

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> service.resetPassword("token123", "ReusedPass1!"));
            assertEquals(ErrorCode.AUTH_PASSWORD_HISTORY_REUSE.getCode(), ex.getCode());
        }

        @Test
        @DisplayName("should successfully reset password and invalidate all tokens")
        void shouldSuccessfullyResetPassword() {
            User user = createTestUser();
            when(valueOperations.get("reset:token:token123")).thenReturn(TEST_PHONE);
            when(userMapper.selectByPhone(TEST_PHONE)).thenReturn(user);

            SecurityProperties.PasswordProperties props = new SecurityProperties.PasswordProperties();
            props.setHistoryCount(5);
            SecurityProperties secProps = new SecurityProperties();
            secProps.setPassword(props);
            when(passwordValidator.getSecurityProperties()).thenReturn(secProps);
            when(passwordEncoder.encode("NewPass123!")).thenReturn("{argon2}$hashed");

            service.resetPassword("token123", "NewPass123!");

            // Verify: token deleted (one-time use)
            verify(redisTemplate).delete("reset:token:token123");

            // Verify: password updated
            verify(userMapper).updatePasswordHash(USER_ID, "{argon2}$hashed");

            // Verify: history checked and recorded
            verify(passwordHistoryService).checkAndRecord(eq(USER_ID), eq(TENANT_ID), eq("NewPass123!"));

            // Verify: all refresh tokens invalidated
            verify(refreshTokenMetadataService).invalidateAllForUser(USER_ID);
        }

        @Test
        @DisplayName("should delete token before user lookup (one-time use)")
        void shouldDeleteTokenBeforeUserLookup() {
            User user = createTestUser();
            when(valueOperations.get("reset:token:token123")).thenReturn(TEST_PHONE);
            when(userMapper.selectByPhone(TEST_PHONE)).thenReturn(user);

            SecurityProperties.PasswordProperties props = new SecurityProperties.PasswordProperties();
            props.setHistoryCount(5);
            SecurityProperties secProps = new SecurityProperties();
            secProps.setPassword(props);
            when(passwordValidator.getSecurityProperties()).thenReturn(secProps);
            when(passwordEncoder.encode(anyString())).thenReturn("{argon2}$hashed");

            service.resetPassword("token123", "NewPass123!");

            var inOrder = inOrder(redisTemplate, userMapper);
            inOrder.verify(redisTemplate).delete("reset:token:token123");
            inOrder.verify(userMapper).updatePasswordHash(eq(USER_ID), anyString());
        }
    }

    private User createTestUser() {
        User user = new User();
        user.setId(USER_ID);
        user.setTenantId(TENANT_ID);
        user.setPhone(TEST_PHONE);
        user.setPasswordHash("{argon2}$old");
        user.setStatus("active");
        return user;
    }
}
