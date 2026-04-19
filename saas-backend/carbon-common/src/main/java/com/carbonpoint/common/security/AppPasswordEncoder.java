package com.carbonpoint.common.security;

import org.springframework.stereotype.Component;

/**
 * Password encoder for service-layer usage.
 * Delegates to EnhancedPasswordEncoder for actual encoding logic.
 * Note: @Component beans are constructor-injected by Spring.
 */
@Component
public class AppPasswordEncoder {

    private final EnhancedPasswordEncoder delegate;

    public AppPasswordEncoder(EnhancedPasswordEncoder delegate) {
        this.delegate = delegate;
    }

    public String encode(String rawPassword) {
        return delegate.encode(rawPassword);
    }

    public boolean matches(String rawPassword, String encodedPassword) {
        return delegate.matches(rawPassword, encodedPassword);
    }

    /**
     * Check if the encoded password needs to be upgraded to Argon2id.
     *
     * @param encodedPassword the current encoded password
     * @return true if upgrade is needed
     */
    public boolean needsUpgrade(String encodedPassword) {
        return !delegate.isArgon2(encodedPassword);
    }
}
