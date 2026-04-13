package com.carbonpoint.system.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Component
public class JwtUtils {

    private final SecretKey secretKey;
    private final long accessTokenExpirationMs;
    private final long refreshTokenExpirationMs;

    public JwtUtils(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.access-token-expiration-ms:900000}") long accessTokenExpirationMs,
            @Value("${jwt.refresh-token-expiration-ms:604800000}") long refreshTokenExpirationMs) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpirationMs = accessTokenExpirationMs;
        this.refreshTokenExpirationMs = refreshTokenExpirationMs;
    }

    public String generateAccessToken(Long userId, Long tenantId, List<String> roles) {
        return generateToken(userId, tenantId, roles, accessTokenExpirationMs, "access", null);
    }

    public String generateRefreshToken(Long userId, Long tenantId, List<String> roles) {
        return generateRefreshToken(userId, tenantId, roles, null, null, null);
    }

    /**
     * Generate a refresh token with security metadata for Redis storage.
     */
    public String generateRefreshToken(Long userId, Long tenantId, List<String> roles,
                                        String deviceFingerprint, String issuedIp, String jti) {
        return generateToken(userId, tenantId, roles, refreshTokenExpirationMs, "refresh", jti);
    }

    /**
     * Extract jti from a refresh token.
     */
    public String getJtiFromToken(String token) {
        Claims claims = parseToken(token);
        String type = claims.get("type", String.class);
        if (!"refresh".equals(type)) {
            return null;
        }
        return claims.getId();
    }

    private String generateToken(Long userId, Long tenantId, List<String> roles,
                                  long expirationMs, String type, String jti) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);

        JwtBuilder builder = Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("tenantId", tenantId)
                .claim("roles", roles)
                .claim("type", type)
                .issuedAt(now)
                .expiration(expiry);

        if ("refresh".equals(type) && jti != null) {
            builder.id(jti);
        } else if ("refresh".equals(type)) {
            builder.id(UUID.randomUUID().toString());
        }

        return builder.signWith(secretKey).compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean validateToken(String token) {
        try {
            parseToken(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public Long getUserIdFromToken(String token) {
        return Long.valueOf(parseToken(token).getSubject());
    }

    public Long getTenantIdFromToken(String token) {
        return parseToken(token).get("tenantId", Long.class);
    }

    @SuppressWarnings("unchecked")
    public List<String> getRolesFromToken(String token) {
        return parseToken(token).get("roles", List.class);
    }

    public String getTypeFromToken(String token) {
        return parseToken(token).get("type", String.class);
    }

    public long getAccessTokenExpirationMs() {
        return accessTokenExpirationMs;
    }

    public long getRefreshTokenExpirationMs() {
        return refreshTokenExpirationMs;
    }

    public String generateInviteCode() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }
}
