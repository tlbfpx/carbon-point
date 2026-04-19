package com.carbonpoint.common.security;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Security strategy configuration properties.
 * All security thresholds are configurable via application.yml.
 */
@Data
@ConfigurationProperties(prefix = "security")
public class SecurityProperties {

    private CaptchaProperties captcha = new CaptchaProperties();
    private PasswordProperties password = new PasswordProperties();
    private RateLimitProperties rateLimit = new RateLimitProperties();
    private LockProperties lock = new LockProperties();

    @Data
    public static class CaptchaProperties {
        /** Whether to enable graphic captcha. Default: true */
        private boolean enabled = true;
        /** Captcha length. Default: 4 */
        private int length = 4;
        /** Captcha expiration in minutes. Default: 5 */
        private int expireMinutes = 5;
        /** Failure count threshold to trigger captcha. Default: 3 */
        private int failureThreshold = 3;
    }

    @Data
    public static class PasswordProperties {
        /** Min password length. Default: 8 */
        private int minLength = 8;
        /** Max password length. Default: 32 */
        private int maxLength = 32;
        /** Min character types required. Default: 3 */
        private int minTypes = 3;
        /** Password history count (cannot reuse). Default: 5 */
        private int historyCount = 5;
        /** Password expiration days (0 = disabled). Default: 0 */
        private int expireDays = 0;
    }

    @Data
    public static class RateLimitProperties {
        /** Max failed attempts per IP within window. Default: 5 */
        private int maxFailPerIp = 5;
        /** Max failed attempts per account within window. Default: 5 */
        private int maxFailPerAccount = 5;
        /** Time window in minutes. Default: 5 */
        private int windowMinutes = 5;
    }

    @Data
    public static class LockProperties {
        /** Lock duration in minutes after max failures. Default: 30 */
        private int durationMinutes = 30;
        /** Whether to enable account locking. Default: true */
        private boolean enabled = true;
    }
}
