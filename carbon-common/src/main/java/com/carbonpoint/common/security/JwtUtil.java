package com.carbonpoint.common.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;

/**
 * JWT token utility: generate and parse access tokens.
 */
@Slf4j
@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.access-token-expiration}")
    private long accessTokenExpiration;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Generate an access token.
     *
     * @param userId   the user ID
     * @param tenantId the tenant ID
     * @param roles    the user's roles
     * @return the signed JWT token string
     */
    public String generateAccessToken(Long userId, Long tenantId, List<String> roles) {
        Date now = new Date();
        Date expiration = new Date(now.getTime() + accessTokenExpiration);

        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("userId", userId)
                .claim("tenantId", tenantId)
                .claim("roles", roles)
                .issuedAt(now)
                .expiration(expiration)
                .signWith(getSigningKey())
                .compact();
    }

    /**
     * Returns the configured access token expiration in milliseconds (15 minutes).
     */
    public long getAccessTokenExpiration() {
        return accessTokenExpiration;
    }

    /**
     * Parse and validate a JWT token.
     *
     * @param token the JWT token string
     * @return the claims if valid, null if invalid/expired
     */
    public Claims parseToken(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (JwtException e) {
            log.warn("JWT parse failed: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Extract user ID from token.
     */
    public Long getUserId(String token) {
        Claims claims = parseToken(token);
        if (claims == null) {
            return null;
        }
        Object userId = claims.get("userId");
        if (userId instanceof Number) {
            return ((Number) userId).longValue();
        }
        return Long.parseLong(claims.getSubject());
    }

    /**
     * Extract tenant ID from token.
     */
    public Long getTenantId(String token) {
        Claims claims = parseToken(token);
        if (claims == null) {
            return null;
        }
        Object tenantId = claims.get("tenantId");
        if (tenantId == null) {
            return null;
        }
        if (tenantId instanceof Number) {
            return ((Number) tenantId).longValue();
        }
        return Long.parseLong(tenantId.toString());
    }

    /**
     * Extract roles from token.
     */
    @SuppressWarnings("unchecked")
    public List<String> getRoles(String token) {
        Claims claims = parseToken(token);
        if (claims == null) {
            return List.of();
        }
        return (List<String>) claims.get("roles", List.class);
    }

    /**
     * Check if a token is valid (not expired, properly signed).
     */
    public boolean isTokenValid(String token) {
        return parseToken(token) != null;
    }
}
