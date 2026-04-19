package com.carbonpoint.system.security.forgot;

import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.security.AppPasswordEncoder;
import com.carbonpoint.common.security.PasswordValidator;
// import com.carbonpoint.common.service.PasswordHistoryService;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.mapper.UserMapper;
import com.carbonpoint.system.security.RefreshTokenMetadataService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Forgot password service.
 * Handles password reset via SMS or email verification.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ForgotPasswordService {

    private final StringRedisTemplate redisTemplate;
    private final UserMapper userMapper;
    private final AppPasswordEncoder passwordEncoder;
    private final PasswordValidator passwordValidator;
    // private final PasswordHistoryService passwordHistoryService;
    private final RefreshTokenMetadataService refreshTokenMetadataService;
    private final SecureRandom random = new SecureRandom();

    private static final String RESET_CODE_KEY_PREFIX = "reset:code:";
    private static final String RESET_TOKEN_KEY_PREFIX = "reset:token:";
    private static final int CODE_EXPIRE_MINUTES = 10;
    private static final int TOKEN_EXPIRE_MINUTES = 15;

    /**
     * Generate and send a reset code.
     * In production, this integrates with SMS/email provider.
     *
     * @param phoneOrEmail the user's phone number or email
     * @return the channel used for sending (sms/email)
     */
    public String sendResetCode(String phoneOrEmail) {
        if (phoneOrEmail == null || phoneOrEmail.isBlank()) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "手机号或邮箱不能为空");
        }

        String code = generateCode();
        String key = RESET_CODE_KEY_PREFIX + phoneOrEmail;

        // Store code in Redis
        redisTemplate.opsForValue().set(key, code, CODE_EXPIRE_MINUTES, TimeUnit.MINUTES);

        // In production: send via SMS or email based on input format
        String channel = phoneOrEmail.contains("@") ? "email" : "sms";

        // Mock sending (in production, call SMS/email service)
        log.info("Reset code for {} ({}): {}", phoneOrEmail, channel, code);

        return channel;
    }

    /**
     * Validate a reset code and generate a reset token.
     *
     * @param phoneOrEmail the user's phone or email
     * @param code         the verification code
     * @return reset token for password reset
     */
    public String validateCode(String phoneOrEmail, String code) {
        if (phoneOrEmail == null || code == null) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "参数不完整");
        }

        String key = RESET_CODE_KEY_PREFIX + phoneOrEmail;
        String storedCode = redisTemplate.opsForValue().get(key);

        if (storedCode == null || !storedCode.equals(code)) {
            throw new BusinessException(ErrorCode.AUTH_CREDENTIALS_INVALID);
        }

        // Delete the code after successful validation
        redisTemplate.delete(key);

        // Generate reset token (UUID-based for simplicity)
        String resetToken = UUID.randomUUID().toString().replace("-", "");

        // Store token in Redis
        String tokenKey = RESET_TOKEN_KEY_PREFIX + resetToken;
        redisTemplate.opsForValue().set(tokenKey, phoneOrEmail, TOKEN_EXPIRE_MINUTES, TimeUnit.MINUTES);

        log.info("Reset token generated for: {}", phoneOrEmail);
        return resetToken;
    }

    /**
     * Reset password using a valid reset token.
     *
     * @param resetToken  the reset token from validateCode
     * @param newPassword the new password
     */
    @Transactional
    public void resetPassword(String resetToken, String newPassword) {
        if (resetToken == null || newPassword == null) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "参数不完整");
        }

        String tokenKey = RESET_TOKEN_KEY_PREFIX + resetToken;
        String phoneOrEmail = redisTemplate.opsForValue().get(tokenKey);

        if (phoneOrEmail == null) {
            throw new BusinessException(ErrorCode.AUTH_CREDENTIALS_INVALID, "重置链接已过期，请重新申请");
        }

        // Delete the token immediately (one-time use)
        redisTemplate.delete(tokenKey);

        // 1. Find user by phoneOrEmail
        User user = userMapper.selectByPhone(phoneOrEmail);
        if (user == null) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND, "用户不存在");
        }

        // 2. Validate password strength
        passwordValidator.validate(newPassword);

        // 3. Check password history (prevent reuse of recent passwords) - temporarily disabled
        // int historyCount = passwordValidator.getSecurityProperties()
        //         .getPassword().getHistoryCount();
        // if (passwordHistoryService.isRecentlyUsed(user.getId(), newPassword, historyCount)) {
        //     throw new BusinessException(ErrorCode.AUTH_PASSWORD_HISTORY_REUSE);
        // }

        // 4. Encode and update password
        String newHash = passwordEncoder.encode(newPassword);
        userMapper.updatePasswordHash(user.getId(), newHash);

        // 5. Save to password history - temporarily disabled
        // passwordHistoryService.addHistory(user.getId(), newHash);

        // 6. Invalidate all refresh tokens for this user
        refreshTokenMetadataService.invalidateAllForUser(user.getId());

        log.info("Password reset completed for userId={}", user.getId());
    }

    private String generateCode() {
        int code = 100000 + random.nextInt(900000); // 6-digit code
        return String.valueOf(code);
    }
}
