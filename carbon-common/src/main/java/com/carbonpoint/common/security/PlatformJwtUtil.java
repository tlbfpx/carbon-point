package com.carbonpoint.common.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * JWT utility for platform admin authentication.
 * Platform admin JWT payload contains: adminId, username, role, type="platform_admin".
 * Does NOT contain tenantId (platform admins are outside tenant system).
 */
@Slf4j
@Component
public class PlatformJwtUtil {

    private static final String CLAIM_ADMIN_ID = "adminId";
    private static final String CLAIM_USERNAME = "username";
    private static final String CLAIM_ROLE = "role";
    private static final String CLAIM_TYPE = "type";
    private static final String TYPE_PLATFORM_ADMIN = "platform_admin";

    private final SecretKey secretKey;
    private final long accessTokenExpiration;
    private final long refreshTokenExpiration;

    public PlatformJwtUtil(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.access-token-expiration-ms:900000}") long accessTokenExpiration,
            @Value("${jwt.refresh-token-expiration-ms:2592000000}") long refreshTokenExpiration) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpiration = accessTokenExpiration;
        this.refreshTokenExpiration = refreshTokenExpiration;
    }

    /**
     * Generate access token for platform admin.
     */
    public String generateAccessToken(Long adminId, String username, String role) {
        Map<String, Object> claims = new HashMap<>();
        claims.put(CLAIM_ADMIN_ID, adminId);
        claims.put(CLAIM_USERNAME, username);
        claims.put(CLAIM_ROLE, role);
        claims.put(CLAIM_TYPE, TYPE_PLATFORM_ADMIN);

        return Jwts.builder()
                .claims(claims)
                .subject(username)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + accessTokenExpiration))
                .signWith(secretKey)
                .compact();
    }

    /**
     * Generate refresh token for platform admin.
     */
    public String generateRefreshToken(Long adminId, String username) {
        Map<String, Object> claims = new HashMap<>();
        claims.put(CLAIM_ADMIN_ID, adminId);
        claims.put(CLAIM_TYPE, TYPE_PLATFORM_ADMIN);

        return Jwts.builder()
                .claims(claims)
                .subject(username)
                .id(UUID.randomUUID().toString())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + refreshTokenExpiration))
                .signWith(secretKey)
                .compact();
    }

    /**
     * Extract jti (JWT ID) from a refresh token.
     */
    public String getJtiFromRefreshToken(String token) {
        Claims claims = parseToken(token);
        if (claims == null) {
            return null;
        }
        return claims.getId();
    }

    /**
     * Parse and validate JWT token.
     * Returns null if token is invalid or expired.
     */
    public Claims parseToken(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (ExpiredJwtException e) {
            log.debug("JWT token expired: {}", e.getMessage());
            return null;
        } catch (JwtException e) {
            log.warn("Invalid JWT token: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Check if token is a platform admin token.
     */
    public boolean isPlatformAdminToken(Claims claims) {
        return TYPE_PLATFORM_ADMIN.equals(claims.get(CLAIM_TYPE));
    }

    /**
     * Extract admin ID from claims.
     */
    public Long getAdminId(Claims claims) {
        return claims.get(CLAIM_ADMIN_ID, Long.class);
    }

    /**
     * Extract username from claims.
     */
    public String getUsername(Claims claims) {
        return claims.get(CLAIM_USERNAME, String.class);
    }

    /**
     * Extract role from claims.
     */
    public String getRole(Claims claims) {
        return claims.get(CLAIM_ROLE, String.class);
    }

    /**
     * Validate token and check if it's a platform admin token.
     */
    public boolean validatePlatformAdminToken(String token) {
        Claims claims = parseToken(token);
        return claims != null && isPlatformAdminToken(claims);
    }
}
