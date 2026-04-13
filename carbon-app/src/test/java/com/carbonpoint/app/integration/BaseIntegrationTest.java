package com.carbonpoint.app.integration;

import com.carbonpoint.app.Application;
import com.carbonpoint.common.security.JwtUtil;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.system.entity.Tenant;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.mapper.TenantMapper;
import com.carbonpoint.system.mapper.UserMapper;
import com.carbonpoint.common.security.AppPasswordEncoder;
import com.carbonpoint.checkin.entity.CheckInRecordEntity;
import com.carbonpoint.checkin.mapper.CheckInRecordMapper;
import com.carbonpoint.common.mapper.PointTransactionMapper;
import com.carbonpoint.mall.mapper.ExchangeOrderMapper;
import com.carbonpoint.mall.mapper.ProductMapper;
import org.junit.jupiter.api.AfterEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/**
 * Base class for all integration tests.
 * Provides common setup, authentication helpers, and utility methods.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, classes = Application.class)
@ActiveProfiles("test")
@AutoConfigureMockMvc
public abstract class BaseIntegrationTest {

    @LocalServerPort
    protected int port;

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
    protected CheckInRecordMapper checkInRecordMapper;

    @Autowired
    protected ProductMapper productMapper;

    @Autowired
    protected ExchangeOrderMapper exchangeOrderMapper;

    @AfterEach
    protected void tearDown() {
        TenantContext.clear();
        try {
            redisTemplate.getConnectionFactory().getConnection().flushAll();
        } catch (Exception e) {
            // Redis may not be available in test environment
        }
    }

    // ─────────────────────────────────────────
    // Tenant setup helpers
    // ─────────────────────────────────────────

    /**
     * Create a test tenant.
     */
    protected Tenant createTestTenant(String name) {
        Tenant tenant = new Tenant();
        tenant.setName(name);
        tenant.setPackageType("pro");
        tenant.setMaxUsers(100);
        tenant.setStatus("active");
        tenantMapper.insert(tenant);
        return tenant;
    }

    /**
     * Create a test user with the given tenant.
     */
    protected User createTestUser(Long tenantId, String phone, String password, String... roles) {
        User user = new User();
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

    /**
     * Generate a JWT access token for the given user.
     */
    protected String generateToken(User user, List<String> roles) {
        return jwtUtil.generateAccessToken(user.getId(), user.getTenantId(), roles);
    }

    /**
     * Generate a JWT access token for the given user with roles.
     */
    protected String generateToken(Long userId, Long tenantId, List<String> roles) {
        return jwtUtil.generateAccessToken(userId, tenantId, roles);
    }

    /**
     * Set the current tenant context.
     */
    protected void setTenantContext(Long tenantId) {
        TenantContext.setTenantId(tenantId);
    }

    // ─────────────────────────────────────────
    // HTTP request helpers
    // ─────────────────────────────────────────

    /**
     * Perform a POST request with JSON body.
     */
    protected MvcResult postJson(String url, String jsonBody) throws Exception {
        return mockMvc.perform(post(url)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonBody))
                .andReturn();
    }

    /**
     * Perform a POST request with JSON body and Bearer token.
     */
    protected MvcResult postJson(String url, String jsonBody, String token) throws Exception {
        return mockMvc.perform(post(url)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + token)
                        .content(jsonBody))
                .andReturn();
    }

    /**
     * Perform a GET request with Bearer token.
     */
    protected MvcResult getWithToken(String url, String token) throws Exception {
        return mockMvc.perform(get(url)
                        .header("Authorization", "Bearer " + token))
                .andReturn();
    }

    // ─────────────────────────────────────────
    // Result assertions
    // ─────────────────────────────────────────

    /**
     * Assert that the response was successful (code 200).
     */
    protected void assertSuccess(MvcResult result) throws Exception {
        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertTrue(
                content.contains("\"code\":200") || content.contains("\"code\": 200"),
                "Expected success response but got: " + content
        );
    }

    /**
     * Assert that the response contains the given error code.
     */
    protected void assertErrorCode(MvcResult result, int errorCode) throws Exception {
        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertTrue(
                content.contains("\"code\":" + errorCode) || content.contains("\"code\": " + errorCode),
                "Expected error code " + errorCode + " but got: " + content
        );
    }
}
