package com.carbonpoint.common.security;

import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Enhanced Password Encoder supporting both Argon2id and BCrypt.
 *
 * <p>Strategy:
 * <ul>
 *   <li>New passwords: encode with Argon2id</li>
 *   <li>Existing BCrypt hashes: verify with BCrypt, upgrade to Argon2id on successful login</li>
 * </ul>
 *
 * <p>Hash prefixes: {argon2} for Argon2id, {bcrypt} for BCrypt.
 */
@Slf4j
@Component
public class EnhancedPasswordEncoder {

    private final BCryptPasswordEncoder bcryptEncoder = new BCryptPasswordEncoder(12);

    // Spring Security 6.2+ built-in Argon2id encoder
    // Parameters: saltLength=16, hashLength=32, parallelism=4, memory=64MB, iterations=3
    private final Argon2PasswordEncoder argon2Encoder =
            new Argon2PasswordEncoder(16, 32, 4, 65536, 3);

    private static final String BCRYPT_PREFIX = "{bcrypt}";
    private static final String ARGON2_PREFIX = "{argon2}";

    /**
     * Encode a raw password using Argon2id.
     *
     * @param rawPassword the raw password
     * @return encoded hash with {argon2} prefix
     */
    public String encode(String rawPassword) {
        if (rawPassword == null || rawPassword.isBlank()) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "密码不能为空");
        }
        return ARGON2_PREFIX + argon2Encoder.encode(rawPassword);
    }

    /**
     * Verify a raw password against an encoded hash.
     * Automatically detects hash type and handles BCrypt→Argon2id migration.
     *
     * @param rawPassword     the raw password
     * @param encodedPassword the encoded hash (with prefix)
     * @return true if matches
     */
    public boolean matches(String rawPassword, String encodedPassword) {
        if (rawPassword == null || encodedPassword == null) {
            return false;
        }

        if (encodedPassword.startsWith(ARGON2_PREFIX)) {
            String hash = encodedPassword.substring(ARGON2_PREFIX.length());
            return argon2Encoder.matches(rawPassword, hash);
        } else if (encodedPassword.startsWith(BCRYPT_PREFIX)) {
            String bcryptHash = encodedPassword.substring(BCRYPT_PREFIX.length());
            return bcryptEncoder.matches(rawPassword, bcryptHash);
        } else {
            // Legacy hash without prefix — treat as BCrypt
            return bcryptEncoder.matches(rawPassword, encodedPassword);
        }
    }

    /**
     * Check if the encoded password uses Argon2id.
     *
     * @param encodedPassword the encoded hash
     * @return true if already Argon2id
     */
    public boolean isArgon2(String encodedPassword) {
        return encodedPassword != null && encodedPassword.startsWith(ARGON2_PREFIX);
    }
}
