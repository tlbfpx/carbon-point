package com.carbonpoint.common.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for EnhancedPasswordEncoder.
 */
class EnhancedPasswordEncoderTest {

    private EnhancedPasswordEncoder encoder;

    @BeforeEach
    void setUp() {
        encoder = new EnhancedPasswordEncoder();
    }

    @Test
    @DisplayName("Should encode password with Argon2id prefix")
    void shouldEncodeWithArgon2Prefix() {
        String hash = encoder.encode("MyPassword123!");
        assertTrue(hash.startsWith("{argon2}"));
        assertNotEquals("MyPassword123!", hash);
    }

    @Test
    @DisplayName("Should generate different hashes for same password")
    void shouldGenerateDifferentHashes() {
        String hash1 = encoder.encode("MyPassword123!");
        String hash2 = encoder.encode("MyPassword123!");
        assertNotEquals(hash1, hash2, "Salt should produce different hashes");
    }

    @Test
    @DisplayName("Should match correct password")
    void shouldMatchCorrectPassword() {
        String hash = encoder.encode("MyPassword123!");
        assertTrue(encoder.matches("MyPassword123!", hash));
    }

    @Test
    @DisplayName("Should not match wrong password")
    void shouldNotMatchWrongPassword() {
        String hash = encoder.encode("MyPassword123!");
        assertFalse(encoder.matches("WrongPassword123!", hash));
    }

    @Test
    @DisplayName("Should handle BCrypt prefixed hash")
    void shouldHandleBcryptPrefix() {
        String bcryptHash = "{bcrypt}$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.dU.iGQv0Zj0CHi";
        assertFalse(encoder.matches("wrong", bcryptHash));
    }

    @Test
    @DisplayName("Should handle legacy hash without prefix")
    void shouldHandleLegacyHash() {
        // Plain BCrypt hash without prefix
        String legacyHash = "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.dU.iGQv0Zj0CHi";
        assertFalse(encoder.matches("wrong", legacyHash));
    }

    @Test
    @DisplayName("Should handle null inputs")
    void shouldHandleNullInputs() {
        assertFalse(encoder.matches(null, "hash"));
        assertFalse(encoder.matches("password", null));
        assertFalse(encoder.matches(null, null));
    }

    @Test
    @DisplayName("Should correctly identify Argon2 hash")
    void shouldIdentifyArgon2Hash() {
        String argon2Hash = "{argon2}$argon2id$v=19$m=65536,t=3,p=4$...";
        String bcryptHash = "{bcrypt}$2a$...";

        assertTrue(encoder.isArgon2(argon2Hash));
        assertFalse(encoder.isArgon2(bcryptHash));
        assertFalse(encoder.isArgon2(null));
    }
}
