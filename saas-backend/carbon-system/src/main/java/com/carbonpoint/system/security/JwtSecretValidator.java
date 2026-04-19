package com.carbonpoint.system.security;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * Fails fast at startup if JWT_SECRET is missing or uses an insecure default value.
 * This validator runs before any request is processed, preventing production
 * deployments from starting with a known-weak secret.
 */
@Slf4j
@Component
public class JwtSecretValidator {

    @Value("${jwt.secret}")
    private String jwtSecret;

    private static final Set<String> INSECURE_PATTERNS = Set.of(
            "insecure", "fallback", "default", "placeholder", "changeme", "secret"
    );

    @PostConstruct
    public void validate() {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException(
                    "JWT_SECRET environment variable is not set. " +
                    "Set a secure 256-bit secret via the JWT_SECRET environment variable."
            );
        }

        String lower = jwtSecret.toLowerCase();
        for (String pattern : INSECURE_PATTERNS) {
            if (lower.contains(pattern)) {
                throw new IllegalStateException(
                        "JWT_SECRET contains an insecure pattern '" + pattern + "'. " +
                        "Set a secure 256-bit secret via the JWT_SECRET environment variable."
                );
            }
        }

        if (jwtSecret.length() < 32) {
            throw new IllegalStateException(
                    "JWT_SECRET must be at least 32 characters (256 bits) for HS256. " +
                    "Current length: " + jwtSecret.length()
            );
        }

        log.info("JWT secret validation passed.");
    }
}
