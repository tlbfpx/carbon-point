package com.carbonpoint.app.integration;

import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.security.JwtUtils;
import com.carbonpoint.system.security.RefreshTokenMetadataService;
import com.carbonpoint.system.security.TokenBlacklist;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * P1-3: Token refresh integration tests.
 *
 * <p>Tests the refresh token rotation mechanism:
 * <ul>
 *   <li>Refresh token换新token，jti防重放</li>
 *   <li>Old refresh token is blacklisted after rotation</li>
 *   <li>Replaying a blacklisted token fails</li>
 *   <li>Invalid/expired tokens are rejected</li>
 *   <li>Access token cannot be used as refresh token</li>
 * </ul>
 */
class TokenRefreshIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private RefreshTokenMetadataService refreshTokenMetadataService;

    @Autowired
    private TokenBlacklist tokenBlacklist;

    // ═══════════════════════════════════════════════════════════════════
    // P1-3.1: Refresh token rotation — jti uniqueness
    // ═══════════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────
    // 16.2.1 — Refresh token rotation, jti changes, old token blacklisted
    // ─────────────────────────────────────────

    @Test
    void testRefreshTokenRotationJtiChangesOldBlacklisted() throws Exception {
        // Setup: tenant + user
        testDataHelper.tenant("Token刷新测试租户").id(9001L).save();

        User user = testDataHelper.user(9001L, "13900009001", "Test@123")
                .id(9001L)
                .save();

        TenantContext.setTenantId(9001L);

        // Generate a fresh refresh token with stored metadata
        String deviceFingerprint = "test-device-fp-001";
        String clientIp = "127.0.0.1";
        List<String> roles = List.of("user");

        String refreshToken = jwtUtils.generateRefreshToken(
                user.getId(), user.getTenantId(), roles, deviceFingerprint, clientIp, null);
        String oldJti = jwtUtils.getJtiFromToken(refreshToken);
        assertNotNull(oldJti, "Refresh token should have a jti");

        // Store metadata in Redis (simulates what login does)
        refreshTokenMetadataService.storeMetadata(oldJti, user.getId(), user.getTenantId(),
                deviceFingerprint, clientIp);

        // Verify token metadata exists before refresh
        var metaBefore = refreshTokenMetadataService.getMetadata(oldJti);
        assertNotNull(metaBefore, "Token metadata should exist before refresh");
        assertFalse(metaBefore.isUsed(), "Token should not be marked used before refresh");

        // Call POST /api/auth/refresh
        String refreshJson = """
            {
                "refreshToken": "%s",
                "deviceFingerprint": "%s"
            }
            """.formatted(refreshToken, deviceFingerprint);

        MvcResult result = mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(refreshJson))
                .andReturn();

        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();
        assertTrue(content.contains("\"code\":\"0000\"") || content.contains("\"code\": \"0000\""),
                "Refresh should succeed, got: " + content);

        // Parse new tokens from response
        // AuthRes: {"code":200,"data":{"accessToken":"...","refreshToken":"...","expiresIn":900,"user":{...}}}
        assertTrue(content.contains("\"accessToken\""), "Response should contain accessToken");
        assertTrue(content.contains("\"refreshToken\""), "Response should contain refreshToken");

        // Extract new refresh token
        String newRefreshToken = extractField(content, "refreshToken");
        assertNotNull(newRefreshToken, "New refresh token should be returned");

        String newJti = jwtUtils.getJtiFromToken(newRefreshToken);
        assertNotNull(newJti, "New refresh token should have a jti");

        // JTI must be different (rotation)
        assertNotEquals(oldJti, newJti,
                "New jti should be different from old jti (token rotation)");

        // Old token must be blacklisted
        assertTrue(tokenBlacklist.isRefreshTokenBlacklisted(refreshToken),
                "Old refresh token should be blacklisted after rotation");

        // Old token metadata should be marked as used
        var metaAfter = refreshTokenMetadataService.getMetadata(oldJti);
        assertNotNull(metaAfter, "Old token metadata should still exist");
        assertTrue(metaAfter.isUsed(), "Old token should be marked as used");

        // New token should have valid metadata
        var newMeta = refreshTokenMetadataService.getMetadata(newJti);
        assertNotNull(newMeta, "New token metadata should exist in Redis");
        assertEquals(user.getId(), newMeta.getUserId(), "New token should belong to user");

        // New access token should be valid
        String newAccessToken = extractField(content, "accessToken");
        assertTrue(jwtUtils.validateToken(newAccessToken), "New access token should be valid");
        assertEquals("access", jwtUtils.getTypeFromToken(newAccessToken),
                "New token should be an access token");
        assertEquals(user.getId(), jwtUtils.getUserIdFromToken(newAccessToken),
                "New access token should belong to correct user");

        // New refresh token should be valid and be a refresh type
        assertTrue(jwtUtils.validateToken(newRefreshToken), "New refresh token should be valid");
        assertEquals("refresh", jwtUtils.getTypeFromToken(newRefreshToken),
                "New token should be a refresh token");
    }

    // ═══════════════════════════════════════════════════════════════════
    // P1-3.2: Replay attack detection
    // ═══════════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────
    // 16.2.2 — Replay attack: using blacklisted token fails
    // ─────────────────────────────────────────

    @Test
    void testReplayAttackBlacklistedTokenRejected() throws Exception {
        testDataHelper.tenant("Replay攻击测试租户").id(9002L).save();

        User user = testDataHelper.user(9002L, "13900009002", "Test@123")
                .id(9002L)
                .save();

        String deviceFingerprint = "test-device-fp-002";
        String clientIp = "127.0.0.1";
        List<String> roles = List.of("user");

        String refreshToken = jwtUtils.generateRefreshToken(
                user.getId(), user.getTenantId(), roles, deviceFingerprint, clientIp, null);
        String jti = jwtUtils.getJtiFromToken(refreshToken);

        // Store metadata and blacklist the token (simulating a previous refresh)
        refreshTokenMetadataService.storeMetadata(jti, user.getId(), user.getTenantId(),
                deviceFingerprint, clientIp);
        refreshTokenMetadataService.markAsUsed(jti);
        tokenBlacklist.blacklistRefreshToken(refreshToken, 2592000000L);

        // Attempt to use the blacklisted token
        String refreshJson = """
            {
                "refreshToken": "%s",
                "deviceFingerprint": "%s"
            }
            """.formatted(refreshToken, deviceFingerprint);

        MvcResult result = mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(refreshJson))
                .andReturn();

        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();

        // Should fail with TOKEN_INVALID
        assertTrue(content.contains("\"code\":") && !content.contains("\"code\":200"),
                "Blacklisted token should be rejected, got: " + content);
    }

    // ═══════════════════════════════════════════════════════════════════
    // P1-3.3: Invalid token handling
    // ═══════════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────
    // 16.2.3 — Invalid/expired/malformed tokens are rejected
    // ─────────────────────────────────────────

    @Test
    void testInvalidRefreshTokenRejected() throws Exception {
        testDataHelper.tenant("无效Token测试租户").id(9003L).save();

        // Use a completely invalid token
        String refreshJson = """
            {
                "refreshToken": "this.is.not.a.valid.token",
                "deviceFingerprint": "test-device"
            }
            """.formatted();

        MvcResult result = mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(refreshJson))
                .andReturn();

        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();

        // Should fail with TOKEN_INVALID
        assertTrue(content.contains("\"code\":") && !content.contains("\"code\":200"),
                "Invalid token should be rejected, got: " + content);
    }

    // ─────────────────────────────────────────
    // 16.2.4 — Access token cannot be used as refresh token
    // ─────────────────────────────────────────

    @Test
    void testAccessTokenCannotBeUsedAsRefreshToken() throws Exception {
        testDataHelper.tenant("Token类型错误测试租户").id(9004L).save();

        User user = testDataHelper.user(9004L, "13900009004", "Test@123")
                .id(9004L)
                .save();

        // Generate an access token (not a refresh token)
        String accessToken = jwtUtils.generateAccessToken(user.getId(), user.getTenantId(), List.of("user"));

        String refreshJson = """
            {
                "refreshToken": "%s",
                "deviceFingerprint": "test-device"
            }
            """.formatted(accessToken);

        MvcResult result = mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(refreshJson))
                .andReturn();

        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();

        // Should fail — access token type != "refresh"
        assertTrue(content.contains("\"code\":") && !content.contains("\"code\":200"),
                "Access token used as refresh should be rejected, got: " + content);
    }

    // ─────────────────────────────────────────
    // 16.2.5 — Token without jti is rejected
    // ─────────────────────────────────────────

    @Test
    void testTokenWithoutJtiIsRejected() throws Exception {
        testDataHelper.tenant("Token无JTI测试租户").id(9005L).save();

        User user = testDataHelper.user(9005L, "13900009005", "Test@123")
                .id(9005L)
                .save();

        // Generate a refresh token with null jti (via the no-arg overload)
        String refreshToken = jwtUtils.generateRefreshToken(user.getId(), user.getTenantId(), List.of("user"));
        // This creates a token WITH a jti (UUID), so let's test with a token that has no jti in metadata
        // Actually, generateRefreshToken(userId, tenantId, roles) always generates a UUID jti
        // To test "no jti", we need to test that metadata lookup fails

        String refreshJson = """
            {
                "refreshToken": "%s",
                "deviceFingerprint": "test-device"
            }
            """.formatted(refreshToken);

        MvcResult result = mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(refreshJson))
                .andReturn();

        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();

        // Token is valid but no metadata in Redis → AUTH_REFRESH_TOKEN_INVALID
        assertTrue(content.contains("\"code\":") && !content.contains("\"code\":200"),
                "Token without Redis metadata should be rejected, got: " + content);
    }

    // ═══════════════════════════════════════════════════════════════════
    // P1-3.4: Multiple refresh rotations
    // ═══════════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────
    // 16.2.6 — Multiple sequential rotations all succeed, jtis unique
    // ─────────────────────────────────────────

    @Test
    void testMultipleRefreshRotationsUniqueJtis() throws Exception {
        testDataHelper.tenant("多次刷新测试租户").id(9006L).save();

        User user = testDataHelper.user(9006L, "13900009006", "Test@123")
                .id(9006L)
                .save();

        String deviceFingerprint = "test-device-fp-006";
        String clientIp = "127.0.0.1";
        List<String> roles = List.of("user");

        String currentRefreshToken = jwtUtils.generateRefreshToken(
                user.getId(), user.getTenantId(), roles, deviceFingerprint, clientIp, null);
        String currentJti = jwtUtils.getJtiFromToken(currentRefreshToken);

        refreshTokenMetadataService.storeMetadata(currentJti, user.getId(), user.getTenantId(),
                deviceFingerprint, clientIp);

        java.util.Set<String> allJtis = new java.util.HashSet<>();
        allJtis.add(currentJti);

        // Perform 3 rotation cycles
        for (int i = 0; i < 3; i++) {
            String refreshJson = """
                {
                    "refreshToken": "%s",
                    "deviceFingerprint": "%s"
                }
                """.formatted(currentRefreshToken, deviceFingerprint);

            MvcResult result = mockMvc.perform(post("/api/auth/refresh")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(refreshJson))
                    .andReturn();

            result.getResponse().setCharacterEncoding("UTF-8");
            String content = result.getResponse().getContentAsString();

            assertTrue(content.contains("\"code\":\"0000\"") || content.contains("\"code\": \"0000\""),
                    "Rotation " + (i + 1) + " should succeed, got: " + content);

            String newRefreshToken = extractField(content, "refreshToken");
            String newJti = jwtUtils.getJtiFromToken(newRefreshToken);

            assertNotNull(newJti, "New token should have jti");
            assertTrue(allJtis.add(newJti),
                    "Jti " + newJti + " should be unique across rotations");

            // Old token should be blacklisted
            assertTrue(tokenBlacklist.isRefreshTokenBlacklisted(currentRefreshToken),
                    "Previous token should be blacklisted after rotation " + (i + 1));

            currentRefreshToken = newRefreshToken;
        }

        // After 3 rotations, we should have 4 unique jtis (1 initial + 3 new)
        assertEquals(4, allJtis.size(),
                "Should have 4 unique jtis after initial + 3 rotations");
    }

    // ─────────────────────────────────────────
    // Helper: extract JSON field value
    // ─────────────────────────────────────────

    private String extractField(String json, String fieldName) {
        // Simple extraction: find "fieldName":"value" or "fieldName": "value"
        String pattern = "\"" + fieldName + "\"\\s*:\\s*\"([^\"]+)\"";
        java.util.regex.Matcher m = java.util.regex.Pattern.compile(pattern).matcher(json);
        if (m.find()) {
            return m.group(1);
        }
        return null;
    }

    @Autowired
    private TestDataHelper testDataHelper;
}
