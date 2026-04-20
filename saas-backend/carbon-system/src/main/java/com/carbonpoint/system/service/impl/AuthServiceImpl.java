package com.carbonpoint.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.service.AccountLockService;
import com.carbonpoint.common.service.LoginRateLimitService;
import com.carbonpoint.common.service.LoginSecurityLogService;
import com.carbonpoint.common.security.AppPasswordEncoder;
import com.carbonpoint.system.dto.req.*;
import com.carbonpoint.system.dto.res.AuthRes;
import com.carbonpoint.system.entity.*;
import com.carbonpoint.system.mapper.*;
import com.carbonpoint.system.security.*;
import com.carbonpoint.system.security.captcha.CaptchaService;
import com.carbonpoint.system.service.InvitationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.Random;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements com.carbonpoint.system.service.AuthService {

    private final UserMapper userMapper;
    private final UserRoleMapper userRoleMapper;
    private final RolePermissionMapper rolePermissionMapper;
    private final JwtUtils jwtUtils;
    private final TokenBlacklist tokenBlacklist;
    private final RefreshTokenMetadataService refreshTokenMetadataService;
    private final AppPasswordEncoder passwordEncoder;
    private final InvitationService invitationService;
    private final TenantInvitationMapper invitationMapper;
    private final LoginRateLimitService loginRateLimitService;
    private final AccountLockService accountLockService;
    private final CaptchaService captchaService;
    private final LoginSecurityLogService loginSecurityLogService;
    private final StringRedisTemplate redisTemplate;

    @Override
    public AuthRes login(LoginReq req, String clientIp) {
        String phone = req.getPhone();

        // Step 1: Check if account is locked
        if (accountLockService.isLocked(phone)) {
            loginSecurityLogService.logFailure(phone, clientIp, null, null, "ACCOUNT_LOCKED");
            log.warn("用户登录失败(账号锁定): phone={}, clientIp={}", phone, clientIp);
            throw new BusinessException(ErrorCode.AUTH_IP_LOCKED);
        }

        // Step 2: Check if captcha is required
        boolean captchaRequired = loginRateLimitService.needCaptcha(clientIp, phone);
        if (captchaRequired) {
            if (req.getCaptchaUuid() == null || req.getCaptchaCode() == null) {
                throw new BusinessException(ErrorCode.AUTH_CAPTCHA_REQUIRED);
            }
            // Verify captcha
            if (!captchaService.verify(req.getCaptchaUuid(), req.getCaptchaCode())) {
                loginRateLimitService.recordFailure(clientIp, phone);
                loginSecurityLogService.logFailure(phone, clientIp, null, null, "CAPTCHA_WRONG");
                log.warn("用户登录失败(验证码错误): phone={}, clientIp={}", phone, clientIp);
                throw new BusinessException(ErrorCode.AUTH_CAPTCHA_WRONG);
            }
        }

        // Step 3: Authenticate credentials.
        // SECURITY: selectByPhone bypasses the MyBatis-Plus tenant isolation interceptor.
        // This is intentional and required: during login, the user's tenant_id is unknown,
        // so TenantContext cannot be set. The TenantLineInnerInterceptor would append
        // "WHERE tenant_id = null" to the query, which MySQL evaluates as always false,
        // preventing any user from logging in. The mapper uses @InterceptorIgnore(tenantLine = "true")
        // to bypass this. After successful authentication, the tenant_id is resolved from the
        // user record and set in TenantContext (see refreshToken method for the pattern).
        // The bypass is safe here because phone-based lookup is not a data-leak vector:
        // an attacker gains nothing by discovering whether a phone exists across tenants,
        // and the password check prevents cross-tenant impersonation.
        User user = userMapper.selectByPhone(phone);

        if (user == null || !passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            loginRateLimitService.recordFailure(clientIp, phone);
            loginSecurityLogService.logFailure(phone, clientIp, null, null, "WRONG_PASSWORD");
            log.warn("用户登录失败(密码错误或用户不存在): phone={}, clientIp={}", phone, clientIp);
            throw new BusinessException(ErrorCode.AUTH_CREDENTIALS_INVALID);
        }

        if (!"active".equals(user.getStatus())) {
            log.warn("用户登录失败(账号禁用): phone={}, clientIp={}", phone, clientIp);
            throw new BusinessException(ErrorCode.USER_DISABLED);
        }

        // Step 4: Clear failure counts on successful login
        loginRateLimitService.clearFailure(clientIp, phone);
        loginSecurityLogService.logSuccess(user.getId(), phone, clientIp, null, null, null, false, false, false);
        log.info("用户登录成功: userId={}, tenantId={}, clientIp={}", user.getId(), user.getTenantId(), clientIp);

        // Step 5: Async upgrade BCrypt password to Argon2id if needed
        if (passwordEncoder.needsUpgrade(user.getPasswordHash())) {
            asyncUpgradePassword(user.getId(), req.getPassword());
        }

        return buildAuthRes(user, req.getDeviceFingerprint(), clientIp);
    }

    @Override
    @Transactional
    public AuthRes register(RegisterReq req) {
        // Verify SMS verification code
        if (req.getSmsCode() == null || !verifySmsCode(req.getPhone(), req.getSmsCode())) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "短信验证码错误");
        }

        // Clear SMS code after successful verification
        clearSmsCode(req.getPhone());

        if (req.getInviteCode() == null || !invitationService.validateCode(req.getInviteCode())) {
            throw new BusinessException(ErrorCode.INVITE_CODE_INVALID);
        }

        // Get tenantId from invitation before inserting user
        TenantInvitation invitation = invitationMapper.selectByInviteCode(req.getInviteCode());
        Long tenantId = invitation.getTenantId();

        // Check phone uniqueness (global check since phone is globally unique)
        User existingUser = userMapper.selectByPhone(req.getPhone());
        if (existingUser != null) {
            throw new BusinessException(ErrorCode.USER_PHONE_DUPLICATE);
        }

        User user = new User();
        user.setPhone(req.getPhone());
        user.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        user.setNickname(req.getNickname() != null ? req.getNickname() : "用户" + req.getPhone().substring(7));
        user.setTenantId(tenantId); // set tenantId from invitation
        user.setStatus("active");
        user.setLevel(1);
        user.setTotalPoints(0);
        user.setAvailablePoints(0);
        user.setFrozenPoints(0);
        user.setConsecutiveDays(0);
        userMapper.insert(user);

        invitationService.bindByInviteCode(user.getId(), req.getInviteCode());
        return buildAuthRes(user, null, null);
    }

    @Override
    public AuthRes refreshToken(String refreshToken, String deviceFingerprint, String clientIp) {
        if (!jwtUtils.validateToken(refreshToken)) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
        if (!"refresh".equals(jwtUtils.getTypeFromToken(refreshToken))) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
        if (tokenBlacklist.isRefreshTokenBlacklisted(refreshToken)) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }

        // Extract jti from old refresh token
        String oldJti = jwtUtils.getJtiFromToken(refreshToken);
        if (oldJti == null) {
            throw new BusinessException(ErrorCode.AUTH_REFRESH_TOKEN_INVALID);
        }

        // Security validation: device fingerprint + IP check
        refreshTokenMetadataService.validateForRotation(oldJti, deviceFingerprint, clientIp);

        Long userId = jwtUtils.getUserIdFromToken(refreshToken);
        Long tenantId = jwtUtils.getTenantIdFromToken(refreshToken);
        // Set TenantContext for all downstream queries (user lookup + role/permission checks).
        // The refresh endpoint bypasses JwtAuthenticationFilter (shouldNotFilter returns true),
        // so TenantContext would otherwise be empty, causing TenantLineInnerInterceptor to
        // generate "tenant_id = null" in SQL — which MySQL evaluates as always false.
        TenantContext.setTenantId(tenantId);
        try {
            User user = userMapper.selectById(userId);
            if (user == null || !"active".equals(user.getStatus())) {
                // User disabled — invalidate all refresh tokens for this user
                refreshTokenMetadataService.invalidateAllForUser(userId);
                throw new BusinessException(ErrorCode.USER_DISABLED);
            }

            // Mark old token as used (rotation)
            refreshTokenMetadataService.markAsUsed(oldJti);

            // Blacklist old refresh token for its remaining lifetime
            long expirationMs = jwtUtils.getRefreshTokenExpirationMs();
            tokenBlacklist.blacklistRefreshToken(refreshToken, expirationMs);

            // Generate new tokens and store new refresh token metadata
            AuthRes res = buildAuthRes(user, deviceFingerprint, clientIp);

            log.info("Refresh token rotated for userId={}, oldJti={}", userId, oldJti);
            return res;
        } finally {
            TenantContext.clear();
        }
    }

    @Override
    public void logout(String refreshToken) {
        if (refreshToken != null && jwtUtils.validateToken(refreshToken)) {
            // Mark as used in Redis metadata
            String jti = jwtUtils.getJtiFromToken(refreshToken);
            if (jti != null) {
                refreshTokenMetadataService.markAsUsed(jti);
            }
            // Blacklist for the refresh token's remaining lifetime (7 days)
            long expirationMs = jwtUtils.getRefreshTokenExpirationMs();
            tokenBlacklist.blacklistRefreshToken(refreshToken, expirationMs);
        }
    }

    private AuthRes buildAuthRes(User user, String deviceFingerprint, String clientIp) {
        List<Long> roleIds = userRoleMapper.selectRoleIdsByUserId(user.getId());
        List<String> permCodes = new ArrayList<>();
        for (Long roleId : roleIds) {
            permCodes.addAll(rolePermissionMapper.selectPermissionCodesByRoleId(roleId));
        }
        List<String> distinctPerms = permCodes.stream().distinct().toList();

        String accessToken = jwtUtils.generateAccessToken(user.getId(), user.getTenantId(), distinctPerms);

        // Generate refresh token with jti
        String newRefreshToken = jwtUtils.generateRefreshToken(
                user.getId(), user.getTenantId(), distinctPerms);

        // Store refresh token metadata in Redis
        String jti = jwtUtils.getJtiFromToken(newRefreshToken);
        refreshTokenMetadataService.storeMetadata(jti, user.getId(), user.getTenantId(),
                deviceFingerprint, clientIp);

        return AuthRes.builder()
                .accessToken(accessToken)
                .refreshToken(newRefreshToken)
                .expiresIn(jwtUtils.getAccessTokenExpirationMs() / 1000)
                .user(AuthRes.UserInfo.builder()
                        .userId(user.getId())
                        .tenantId(user.getTenantId())
                        .phone(maskPhone(user.getPhone()))
                        .nickname(user.getNickname())
                        .avatar(user.getAvatar())
                        .level(user.getLevel())
                        .status(user.getStatus())
                        .build())
                .build();
    }

    /**
     * Mask phone number for privacy: 138****8888
     */
    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) return phone;
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }

    /**
     * Asynchronously upgrade password from BCrypt to Argon2id.
     */
    @Async
    public void asyncUpgradePassword(Long userId, String rawPassword) {
        String newHash = passwordEncoder.encode(rawPassword);
        userMapper.updatePasswordHash(userId, newHash);
        log.info("Upgraded password from BCrypt to Argon2id for userId={}", userId);
    }

    /**
     * Generate and store SMS verification code in Redis.
     */
    public void sendSmsCode(String phone) {
        // Check rate limit: max 3 codes per 5 minutes
        String key = "sms:rate:" + phone;
        String count = redisTemplate.opsForValue().get(key);
        if (count == null) {
            redisTemplate.opsForValue().set(key, "1", 5, TimeUnit.MINUTES);
        } else if (Integer.parseInt(count) >= 3) {
            throw new BusinessException(ErrorCode.SYSTEM_RATE_LIMIT_EXCEEDED, "发送过于频繁，请5分钟后再试");
        } else {
            redisTemplate.opsForValue().increment(key);
        }

        // Generate 6-digit code
        String code = String.format("%06d", new Random().nextInt(1000000));
        String codeKey = "sms:code:" + phone;

        // Store with 5 minute expiration
        redisTemplate.opsForValue().set(codeKey, code, 5, TimeUnit.MINUTES);

        log.info("SMS verification code for {}: {}", phone, code);
        // TODO: Integrate with actual SMS service in production
    }

    /**
     * Verify SMS code.
     */
    private boolean verifySmsCode(String phone, String code) {
        String codeKey = "sms:code:" + phone;
        String storedCode = redisTemplate.opsForValue().get(codeKey);
        return storedCode != null && storedCode.equals(code);
    }

    /**
     * Clear SMS code after use.
     */
    private void clearSmsCode(String phone) {
        String codeKey = "sms:code:" + phone;
        redisTemplate.delete(codeKey);
    }
}
