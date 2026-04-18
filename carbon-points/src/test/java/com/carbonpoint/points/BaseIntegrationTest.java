package com.carbonpoint.points;

import com.carbonpoint.common.security.AppPasswordEncoder;
import com.carbonpoint.common.security.JwtUtil;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.common.mapper.PointTransactionMapper;
import com.carbonpoint.points.mapper.PointRuleMapper;
import com.carbonpoint.points.mapper.PointsUserMapper;
import com.carbonpoint.system.entity.Tenant;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.mapper.TenantMapper;
import com.carbonpoint.system.mapper.UserMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;

/**
 * Base class for all carbon-points integration tests.
 */
@SpringBootTest(classes = TestApplication.class)
@ActiveProfiles("test")
@AutoConfigureMockMvc
public abstract class BaseIntegrationTest {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected UserMapper userMapper;

    @Autowired
    protected TenantMapper tenantMapper;

    @Autowired
    protected AppPasswordEncoder passwordEncoder;

    @Autowired
    protected JwtUtil jwtUtil;

    @Autowired
    protected StringRedisTemplate redisTemplate;

    @Autowired
    protected PointTransactionMapper pointTransactionMapper;

    @Autowired
    protected PointRuleMapper pointRuleMapper;

    @Autowired
    protected PointsUserMapper pointsUserMapper;

    // ─────────────────────────────────────────
    // Explicit ID generators (compatible with IdType.ASSIGN_ID)
    // ─────────────────────────────────────────

    private static final AtomicLong idCounter = new AtomicLong(1_000_000_000L);

    /** Generate a unique tenant ID */
    protected static Long nextTenantId() {
        return idCounter.getAndAdd(100_000);
    }

    /** Generate a unique user ID */
    protected static Long nextUserId() {
        return idCounter.getAndIncrement();
    }

    /** Generate a unique rule ID */
    protected static Long nextRuleId() {
        return idCounter.getAndAdd(10_000);
    }

    // ─────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────

    @BeforeEach
    protected void baseSetUp() {
        TenantContext.clear();
    }

    @AfterEach
    protected void tearDown() {
        TenantContext.clear();
        try {
            redisTemplate.getConnectionFactory().getConnection().flushAll();
        } catch (Exception e) {
            // Redis may not be available
        }
    }

    // ─────────────────────────────────────────
    // Tenant & User helpers
    // ─────────────────────────────────────────

    /**
     * Create a test tenant with an explicit ID and set it as the current tenant context.
     */
    protected Tenant createTestTenant(String name) {
        Tenant tenant = new Tenant();
        tenant.setId(nextTenantId());
        tenant.setName(name);
        tenant.setPackageType("pro");
        tenant.setMaxUsers(100);
        tenant.setStatus("active");
        tenant.setLevelMode("strict");
        tenantMapper.insert(tenant);
        TenantContext.setTenantId(tenant.getId());
        return tenant;
    }

    /**
     * Create a test user with an explicit ID.
     * The tenant must already exist and tenant context must be set.
     */
    protected User createTestUser(Long tenantId, String phone, String password) {
        User user = new User();
        user.setId(nextUserId());
        user.setTenantId(tenantId);
        user.setPhone(phone);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setNickname("TestUser_" + phone);
        user.setStatus("active");
        user.setLevel(1);
        user.setTotalPoints(0);
        user.setAvailablePoints(0);
        user.setFrozenPoints(0);
        user.setConsecutiveDays(0);
        userMapper.insert(user);
        return user;
    }

    protected String generateToken(Long userId, Long tenantId, List<String> roles) {
        return jwtUtil.generateAccessToken(userId, tenantId, roles);
    }

    protected void setTenantContext(Long tenantId) {
        TenantContext.setTenantId(tenantId);
    }

    // ─────────────────────────────────────────
    // HTTP request helpers
    // ─────────────────────────────────────────

    protected MvcResult postJson(String url, String jsonBody) throws Exception {
        return mockMvc.perform(post(url)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonBody))
                .andReturn();
    }

    protected MvcResult postJson(String url, String jsonBody, String token) throws Exception {
        return mockMvc.perform(post(url)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + token)
                        .content(jsonBody))
                .andReturn();
    }

    protected MvcResult getWithToken(String url, String token) throws Exception {
        return mockMvc.perform(get(url)
                        .header("Authorization", "Bearer " + token))
                .andReturn();
    }

    protected MvcResult putJson(String url, String jsonBody, String token) throws Exception {
        return mockMvc.perform(put(url)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + token)
                        .content(jsonBody))
                .andReturn();
    }

    protected MvcResult deleteWithToken(String url, String token) throws Exception {
        return mockMvc.perform(delete(url)
                        .header("Authorization", "Bearer " + token))
                .andReturn();
    }

    /**
     * POST with query parameters (no body) and optional token.
     */
    protected MvcResult postWithParams(String url, String token) throws Exception {
        return mockMvc.perform(post(url)
                        .header("Authorization", "Bearer " + token))
                .andReturn();
    }

    // ─────────────────────────────────────────
    // Result assertions — check "code":"0000" STRING (not numeric 200)
    // ─────────────────────────────────────────

    protected void assertSuccess(MvcResult result) throws Exception {
        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertTrue(
                content.contains("\"code\":\"0000\"") || content.contains("\"code\": \"0000\""),
                "Expected success response (code:0000) but got: " + content
        );
    }

    protected void assertErrorCode(MvcResult result, String errorCode) throws Exception {
        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertTrue(
                content.contains("\"code\":\"" + errorCode + "\"") || content.contains("\"code\": \"" + errorCode + "\""),
                "Expected error code " + errorCode + " but got: " + content
        );
    }
}
