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
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

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

    @Override
    public AuthRes login(LoginReq req, String clientIp) {
        String phone = req.getPhone();

        // Step 1: Check if account is locked
        if (accountLockService.isLocked(phone)) {
            loginSecurityLogService.logFailure(phone, clientIp, null, null, "ACCOUNT_LOCKED");
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
                throw new BusinessException(ErrorCode.AUTH_CAPTCHA_WRONG);
            }
        }

        // Step 3: Authenticate credentials (uses selectByPhone to bypass tenant filter for login)
        User user = userMapper.selectByPhone(phone);

        if (user == null || !passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            loginRateLimitService.recordFailure(clientIp, phone);
            loginSecurityLogService.logFailure(phone, clientIp, null, null, "WRONG_PASSWORD");
            throw new BusinessException(ErrorCode.AUTH_CREDENTIALS_INVALID);
        }

        if (!"active".equals(user.getStatus())) {
            throw new BusinessException(ErrorCode.USER_DISABLED);
        }

        // Step 4: Clear failure counts on successful login
        loginRateLimitService.clearFailure(clientIp, phone);
        loginSecurityLogService.logSuccess(user.getId(), phone, clientIp, null, null, null, false, false, false);

        // Step 5: Async upgrade BCrypt password to Argon2id if needed
        if (passwordEncoder.needsUpgrade(user.getPasswordHash())) {
            asyncUpgradePassword(user.getId(), req.getPassword());
        }

        return buildAuthRes(user, req.getDeviceFingerprint(), clientIp);
    }

    @Override
    @Transactional
    public AuthRes register(RegisterReq req) {
        if (req.getInviteCode() == null || !invitationService.validateCode(req.getInviteCode())) {
            throw new BusinessException(ErrorCode.INVITE_CODE_INVALID);
        }

        // Get tenantId from invitation before inserting user
        TenantInvitation invitation = invitationMapper.selectByInviteCode(req.getInviteCode());
        Long tenantId = invitation.getTenantId();

        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getPhone, req.getPhone());
        if (userMapper.selectCount(wrapper) > 0) {
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
                        .phone(user.getPhone())
                        .nickname(user.getNickname())
                        .avatar(user.getAvatar())
                        .level(user.getLevel())
                        .status(user.getStatus())
                        .build())
                .build();
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
}
