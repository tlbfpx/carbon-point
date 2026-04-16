package com.carbonpoint.system.security;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("JwtUtils")
class JwtUtilsTest {

    private JwtUtils jwtUtils;

    // 32+ chars for HMAC-SHA key
    private static final String TEST_SECRET = "test-jwt-secret-key-must-be-at-least-32-chars-long";
    private static final long ACCESS_TOKEN_TTL_MS = 900000L; // 15 minutes
    private static final long REFRESH_TOKEN_TTL_MS = 604800000L; // 7 days

    @BeforeEach
    void setUp() {
        jwtUtils = new JwtUtils(TEST_SECRET, ACCESS_TOKEN_TTL_MS, REFRESH_TOKEN_TTL_MS);
    }

    @Nested
    @DisplayName("generateAccessToken")
    class GenerateAccessTokenTests {

        @Test
        @DisplayName("should generate valid access token")
        void shouldGenerateValidAccessToken() {
            Long userId = 123L;
            Long tenantId = 456L;
            List<String> roles = List.of("admin", "user");

            String token = jwtUtils.generateAccessToken(userId, tenantId, roles);

            assertNotNull(token);
            assertTrue(token.length() > 50);
            assertTrue(jwtUtils.validateToken(token));
        }

        @Test
        @DisplayName("should include correct claims in access token")
        void shouldIncludeCorrectClaims() {
            Long userId = 123L;
            Long tenantId = 456L;
            List<String> roles = List.of("admin");

            String token = jwtUtils.generateAccessToken(userId, tenantId, roles);
            Claims claims = jwtUtils.parseToken(token);

            assertEquals("123", claims.getSubject());
            assertEquals(tenantId, claims.get("tenantId", Long.class));
            assertEquals("access", claims.get("type", String.class));
            assertEquals(roles, claims.get("roles", List.class));
            assertNotNull(claims.getExpiration());
        }
    }

    @Nested
    @DisplayName("generateRefreshToken")
    class GenerateRefreshTokenTests {

        @Test
        @DisplayName("should generate refresh token with jti")
        void shouldGenerateRefreshTokenWithJti() {
            String token = jwtUtils.generateRefreshToken(123L, 456L, List.of("admin"));

            assertNotNull(token);
            assertTrue(jwtUtils.validateToken(token));
            assertEquals("refresh", jwtUtils.getTypeFromToken(token));
            assertNotNull(jwtUtils.getJtiFromToken(token));
        }

        @Test
        @DisplayName("should generate different jti for each call")
        void shouldGenerateDifferentJtiForEachCall() {
            String token1 = jwtUtils.generateRefreshToken(123L, 456L, List.of("admin"));
            String token2 = jwtUtils.generateRefreshToken(123L, 456L, List.of("admin"));

            assertNotEquals(jwtUtils.getJtiFromToken(token1), jwtUtils.getJtiFromToken(token2));
        }

        @Test
        @DisplayName("should include correct claims in refresh token")
        void shouldIncludeCorrectClaimsInRefreshToken() {
            String token = jwtUtils.generateRefreshToken(123L, 456L, List.of("admin"));
            Claims claims = jwtUtils.parseToken(token);

            assertEquals("123", claims.getSubject());
            assertEquals(456L, claims.get("tenantId", Long.class));
            assertEquals("refresh", claims.get("type", String.class));
            assertNotNull(claims.getId());
        }
    }

    @Nested
    @DisplayName("parseToken")
    class ParseTokenTests {

        @Test
        @DisplayName("should return claims for valid token")
        void shouldReturnClaimsForValidToken() {
            String token = jwtUtils.generateAccessToken(123L, 456L, List.of("admin"));

            Claims claims = jwtUtils.parseToken(token);

            assertNotNull(claims);
            assertEquals("123", claims.getSubject());
        }

        @Test
        @DisplayName("should throw exception for invalid token")
        void shouldThrowForInvalidToken() {
            assertThrows(Exception.class, () -> jwtUtils.parseToken("invalid.token.here"));
        }
    }

    @Nested
    @DisplayName("validateToken")
    class ValidateTokenTests {

        @Test
        @DisplayName("should return true for valid token")
        void shouldReturnTrueForValidToken() {
            String token = jwtUtils.generateAccessToken(123L, 456L, List.of("admin"));

            assertTrue(jwtUtils.validateToken(token));
        }

        @Test
        @DisplayName("should return false for invalid token")
        void shouldReturnFalseForInvalidToken() {
            assertFalse(jwtUtils.validateToken("invalid.token.here"));
        }

        @Test
        @DisplayName("should return false for null token")
        void shouldReturnFalseForNullToken() {
            assertFalse(jwtUtils.validateToken(null));
        }

        @Test
        @DisplayName("should return false for empty token")
        void shouldReturnFalseForEmptyToken() {
            assertFalse(jwtUtils.validateToken(""));
        }
    }

    @Nested
    @DisplayName("getUserIdFromToken")
    class GetUserIdFromTokenTests {

        @Test
        @DisplayName("should extract userId from access token")
        void shouldExtractUserIdFromAccessToken() {
            String token = jwtUtils.generateAccessToken(999L, 1L, List.of("user"));

            assertEquals(999L, jwtUtils.getUserIdFromToken(token));
        }

        @Test
        @DisplayName("should extract userId from refresh token")
        void shouldExtractUserIdFromRefreshToken() {
            String token = jwtUtils.generateRefreshToken(888L, 2L, List.of("admin"));

            assertEquals(888L, jwtUtils.getUserIdFromToken(token));
        }
    }

    @Nested
    @DisplayName("getTenantIdFromToken")
    class GetTenantIdFromTokenTests {

        @Test
        @DisplayName("should extract tenantId from access token")
        void shouldExtractTenantIdFromAccessToken() {
            String token = jwtUtils.generateAccessToken(123L, 789L, List.of("user"));

            assertEquals(789L, jwtUtils.getTenantIdFromToken(token));
        }

        @Test
        @DisplayName("should extract tenantId from refresh token")
        void shouldExtractTenantIdFromRefreshToken() {
            String token = jwtUtils.generateRefreshToken(123L, 789L, List.of("user"));

            assertEquals(789L, jwtUtils.getTenantIdFromToken(token));
        }
    }

    @Nested
    @DisplayName("getRolesFromToken")
    class GetRolesFromTokenTests {

        @Test
        @DisplayName("should extract roles from access token")
        void shouldExtractRolesFromAccessToken() {
            List<String> roles = List.of("admin", "super_admin", "user");
            String token = jwtUtils.generateAccessToken(123L, 456L, roles);

            List<String> extractedRoles = jwtUtils.getRolesFromToken(token);

            assertEquals(roles, extractedRoles);
        }

        @Test
        @DisplayName("should extract roles from refresh token")
        void shouldExtractRolesFromRefreshToken() {
            List<String> roles = List.of("admin");
            String token = jwtUtils.generateRefreshToken(123L, 456L, roles);

            List<String> extractedRoles = jwtUtils.getRolesFromToken(token);

            assertEquals(roles, extractedRoles);
        }
    }

    @Nested
    @DisplayName("getTypeFromToken")
    class GetTypeFromTokenTests {

        @Test
        @DisplayName("should return access for access token")
        void shouldReturnAccessForAccessToken() {
            String token = jwtUtils.generateAccessToken(123L, 456L, List.of("user"));

            assertEquals("access", jwtUtils.getTypeFromToken(token));
        }

        @Test
        @DisplayName("should return refresh for refresh token")
        void shouldReturnRefreshForRefreshToken() {
            String token = jwtUtils.generateRefreshToken(123L, 456L, List.of("user"));

            assertEquals("refresh", jwtUtils.getTypeFromToken(token));
        }
    }

    @Nested
    @DisplayName("getJtiFromToken")
    class GetJtiFromTokenTests {

        @Test
        @DisplayName("should return null for access token")
        void shouldReturnNullForAccessToken() {
            String token = jwtUtils.generateAccessToken(123L, 456L, List.of("user"));

            assertNull(jwtUtils.getJtiFromToken(token));
        }

        @Test
        @DisplayName("should return jti for refresh token")
        void shouldReturnJtiForRefreshToken() {
            String token = jwtUtils.generateRefreshToken(123L, 456L, List.of("user"));

            assertNotNull(jwtUtils.getJtiFromToken(token));
            assertTrue(jwtUtils.getJtiFromToken(token).length() > 10);
        }
    }

    @Nested
    @DisplayName("expiration methods")
    class ExpirationTests {

        @Test
        @DisplayName("getAccessTokenExpirationMs returns correct value")
        void getAccessTokenExpirationMsReturnsCorrectValue() {
            assertEquals(ACCESS_TOKEN_TTL_MS, jwtUtils.getAccessTokenExpirationMs());
        }

        @Test
        @DisplayName("getRefreshTokenExpirationMs returns correct value")
        void getRefreshTokenExpirationMsReturnsCorrectValue() {
            assertEquals(REFRESH_TOKEN_TTL_MS, jwtUtils.getRefreshTokenExpirationMs());
        }
    }

    @Nested
    @DisplayName("generateInviteCode")
    class GenerateInviteCodeTests {

        @Test
        @DisplayName("should generate 16 character code")
        void shouldGenerate16CharacterCode() {
            String code = jwtUtils.generateInviteCode();

            assertNotNull(code);
            assertEquals(16, code.length());
        }

        @Test
        @DisplayName("should generate unique codes")
        void shouldGenerateUniqueCodes() {
            String code1 = jwtUtils.generateInviteCode();
            String code2 = jwtUtils.generateInviteCode();

            assertNotEquals(code1, code2);
        }

        @Test
        @DisplayName("should only contain alphanumeric characters")
        void shouldOnlyContainAlphanumericCharacters() {
            String code = jwtUtils.generateInviteCode();

            assertTrue(code.matches("[a-f0-9]+"));
        }
    }
}
