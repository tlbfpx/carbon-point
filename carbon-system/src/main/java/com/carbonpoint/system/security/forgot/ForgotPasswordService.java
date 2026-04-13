package com.carbonpoint.system.security.forgot;

import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

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
            throw new BusinessException(3001, "验证码错误或已过期");
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
    public void resetPassword(String resetToken, String newPassword) {
        if (resetToken == null || newPassword == null) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "参数不完整");
        }

        String tokenKey = RESET_TOKEN_KEY_PREFIX + resetToken;
        String phoneOrEmail = redisTemplate.opsForValue().get(tokenKey);

        if (phoneOrEmail == null) {
            throw new BusinessException(3001, "重置链接已过期，请重新申请");
        }

        // Delete the token immediately (one-time use)
        redisTemplate.delete(tokenKey);

        // In production:
        // 1. Find user by phoneOrEmail
        // 2. Validate password strength
        // 3. Check password history
        // 4. Update password
        // 5. Save password history
        // 6. Invalidate all sessions

        log.info("Password reset completed for: {}", phoneOrEmail);
    }

    private String generateCode() {
        int code = 100000 + random.nextInt(900000); // 6-digit code
        return String.valueOf(code);
    }
}
