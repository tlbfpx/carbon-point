package com.carbonpoint.common.security;

import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Adapter that wraps EnhancedPasswordEncoder to implement Spring Security's PasswordEncoder interface.
 * Allows Argon2id encoding through Spring Security's abstraction layer.
 */
public class SpringSecurityPasswordEncoderAdapter implements PasswordEncoder {

    private final EnhancedPasswordEncoder delegate;

    public SpringSecurityPasswordEncoderAdapter(EnhancedPasswordEncoder delegate) {
        this.delegate = delegate;
    }

    @Override
    public String encode(CharSequence rawPassword) {
        return delegate.encode(rawPassword.toString());
    }

    @Override
    public boolean matches(CharSequence rawPassword, String encodedPassword) {
        return delegate.matches(rawPassword.toString(), encodedPassword);
    }

    @Override
    public boolean upgradeEncoding(String encodedPassword) {
        // Upgrade BCrypt hashes to Argon2id when user next authenticates
        return !delegate.isArgon2(encodedPassword);
    }
}
