package com.carbonpoint.system.service.impl;

import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.service.AccountLockService;
import com.carbonpoint.common.service.LoginRateLimitService;
import com.carbonpoint.common.service.LoginSecurityLogService;
import com.carbonpoint.common.security.AppPasswordEncoder;
import com.carbonpoint.system.dto.req.LoginReq;
import com.carbonpoint.system.dto.req.RegisterReq;
import com.carbonpoint.system.dto.res.AuthRes;
import com.carbonpoint.system.entity.TenantInvitation;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.mapper.TenantInvitationMapper;
import com.carbonpoint.system.mapper.UserRoleMapper;
import com.carbonpoint.system.mapper.UserMapper;
import com.carbonpoint.system.mapper.RolePermissionMapper;
import com.carbonpoint.system.security.JwtUtils;
import com.carbonpoint.system.security.TokenBlacklist;
import com.carbonpoint.system.security.RefreshTokenMetadataService;
import com.carbonpoint.system.security.captcha.CaptchaService;
import com.carbonpoint.system.service.InvitationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * AuthServiceImpl unit tests.
 *
 * Note: AuthServiceImpl does not have a passwordReset method — password reset
 * is handled by ForgotPasswordService. The invitation code validation tests
 * are adapted to cover the register() path, which validates invitation codes.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserMapper userMapper;

    @Mock
    private UserRoleMapper userRoleMapper;

    @Mock
    private RolePermissionMapper rolePermissionMapper;

    @Mock
    private JwtUtils jwtUtils;

    @Mock
    private TokenBlacklist tokenBlacklist;

    @Mock
    private RefreshTokenMetadataService refreshTokenMetadataService;

    @Mock
    private AppPasswordEncoder passwordEncoder;

    @Mock
    private InvitationService invitationService;

    @Mock
    private TenantInvitationMapper invitationMapper;

    @Mock
    private LoginRateLimitService loginRateLimitService;

    @Mock
    private AccountLockService accountLockService;

    @Mock
    private CaptchaService captchaService;

    @Mock
    private LoginSecurityLogService loginSecurityLogService;

    @InjectMocks
    private AuthServiceImpl authService;

    @Nested
    @DisplayName("login")
    class LoginTests {

        @Test
        @DisplayName("登录成功应返回认证响应")
        void shouldReturnAuthResponseOnValidLogin() {
            // Given
            LoginReq req = new LoginReq();
            req.setPhone("13800138000");
            req.setPassword("correctPassword");

            User user = new User();
            user.setId(1L);
            user.setTenantId(10L);
            user.setPhone("13800138000");
            user.setNickname("测试用户");
            user.setStatus("active");
            user.setLevel(1);
            user.setPasswordHash("$argon2id$v=19$m=65536,t=3,p=1$fakeHash");

            when(accountLockService.isLocked(anyString())).thenReturn(false);
            when(loginRateLimitService.needCaptcha(anyString(), anyString())).thenReturn(false);
            when(userMapper.selectByPhone("13800138000")).thenReturn(user);
            when(passwordEncoder.matches("correctPassword", user.getPasswordHash())).thenReturn(true);
            when(userRoleMapper.selectRoleIdsByUserId(1L)).thenReturn(List.of(1L));
            when(rolePermissionMapper.selectPermissionCodesByRoleId(1L)).thenReturn(List.of("enterprise:dashboard:view"));
            when(jwtUtils.generateAccessToken(eq(1L), eq(10L), anyList())).thenReturn("accessToken");
            when(jwtUtils.generateRefreshToken(eq(1L), eq(10L), anyList())).thenReturn("refreshToken");
            when(jwtUtils.getJtiFromToken("refreshToken")).thenReturn("jti-123");
            when(jwtUtils.getAccessTokenExpirationMs()).thenReturn(3600000L);

            // When
            AuthRes result = authService.login(req, "192.168.1.1");

            // Then
            assertNotNull(result);
            assertEquals("accessToken", result.getAccessToken());
            assertEquals("refreshToken", result.getRefreshToken());
            assertEquals(3600L, result.getExpiresIn());
            assertEquals(1L, result.getUser().getUserId());
            assertEquals(10L, result.getUser().getTenantId());
            assertEquals("active", result.getUser().getStatus());
        }

        @Test
        @DisplayName("手机号不存在应抛出 AUTH_CREDENTIALS_INVALID")
        void shouldThrowWhenPhoneNotFound() {
            // Given
            LoginReq req = new LoginReq();
            req.setPhone("13800138000");
            req.setPassword("anyPassword");

            when(accountLockService.isLocked(anyString())).thenReturn(false);
            when(loginRateLimitService.needCaptcha(anyString(), anyString())).thenReturn(false);
            when(userMapper.selectByPhone("13800138000")).thenReturn(null);

            // When / Then
            BusinessException ex = assertThrows(
                    BusinessException.class,
                    () -> authService.login(req, "192.168.1.1")
            );
            assertEquals(ErrorCode.AUTH_CREDENTIALS_INVALID.getCode(), ex.getCode());
        }

        @Test
        @DisplayName("密码错误应抛出 AUTH_CREDENTIALS_INVALID")
        void shouldThrowWhenPasswordWrong() {
            // Given
            LoginReq req = new LoginReq();
            req.setPhone("13800138000");
            req.setPassword("wrongPassword");

            User user = new User();
            user.setId(1L);
            user.setTenantId(10L);
            user.setPasswordHash("$argon2id$v=19$m=65536,t=3,p=1$fakeHash");

            when(accountLockService.isLocked(anyString())).thenReturn(false);
            when(loginRateLimitService.needCaptcha(anyString(), anyString())).thenReturn(false);
            when(userMapper.selectByPhone("13800138000")).thenReturn(user);
            when(passwordEncoder.matches("wrongPassword", user.getPasswordHash())).thenReturn(false);

            // When / Then
            BusinessException ex = assertThrows(
                    BusinessException.class,
                    () -> authService.login(req, "192.168.1.1")
            );
            assertEquals(ErrorCode.AUTH_CREDENTIALS_INVALID.getCode(), ex.getCode());
        }

        @Test
        @DisplayName("已禁用账号应抛出 USER_DISABLED")
        void shouldThrowWhenAccountDisabled() {
            // Given
            LoginReq req = new LoginReq();
            req.setPhone("13800138000");
            req.setPassword("correctPassword");

            User user = new User();
            user.setId(1L);
            user.setTenantId(10L);
            user.setPasswordHash("$argon2id$v=19$m=65536,t=3,p=1$fakeHash");
            user.setStatus("disabled");

            when(accountLockService.isLocked(anyString())).thenReturn(false);
            when(loginRateLimitService.needCaptcha(anyString(), anyString())).thenReturn(false);
            when(userMapper.selectByPhone("13800138000")).thenReturn(user);
            when(passwordEncoder.matches("correctPassword", user.getPasswordHash())).thenReturn(true);

            // When / Then
            BusinessException ex = assertThrows(
                    BusinessException.class,
                    () -> authService.login(req, "192.168.1.1")
            );
            assertEquals(ErrorCode.USER_DISABLED.getCode(), ex.getCode());
        }
    }

    @Nested
    @DisplayName("register")
    class RegisterTests {

        @Test
        @DisplayName("邀请码无效应抛出 INVITE_CODE_INVALID")
        void shouldThrowWhenInvitationCodeInvalid() {
            // Given
            RegisterReq req = new RegisterReq();
            req.setPhone("13800138000");
            req.setPassword("newPassword");
            req.setNickname("新用户");
            req.setInviteCode("INVALID_CODE");

            when(invitationService.validateCode("INVALID_CODE")).thenReturn(false);

            // When / Then
            BusinessException ex = assertThrows(
                    BusinessException.class,
                    () -> authService.register(req)
            );
            assertEquals(ErrorCode.INVITE_CODE_INVALID.getCode(), ex.getCode());
        }

        @Test
        @DisplayName("邀请码为 null 应抛出 INVITE_CODE_INVALID")
        void shouldThrowWhenInvitationCodeNull() {
            // Given
            RegisterReq req = new RegisterReq();
            req.setPhone("13800138000");
            req.setPassword("newPassword");
            req.setInviteCode(null);

            // When / Then
            BusinessException ex = assertThrows(
                    BusinessException.class,
                    () -> authService.register(req)
            );
            assertEquals(ErrorCode.INVITE_CODE_INVALID.getCode(), ex.getCode());
        }
    }
}
