package com.carbonpoint.walking;

import com.carbonpoint.common.security.JwtUtil;
import com.carbonpoint.common.security.AppPasswordEncoder;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.system.entity.Tenant;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.mapper.TenantMapper;
import com.carbonpoint.system.mapper.UserMapper;
import com.carbonpoint.walking.client.StubHealthApiClient;
import com.carbonpoint.walking.mapper.StepDailyRecordMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = TestApplication.class)
@ActiveProfiles("test")
@AutoConfigureMockMvc
class WalkingIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private TenantMapper tenantMapper;

    @Autowired
    private AppPasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private StubHealthApiClient stubHealthApiClient;

    @Autowired
    private StepDailyRecordMapper stepDailyRecordMapper;

    private Long tenantId;
    private Long userId;
    private String authToken;

    @BeforeEach
    void setUp() {
        TenantContext.clear();

        // Create tenant
        Tenant tenant = new Tenant();
        tenant.setName("WalkingIntegTenant_" + System.nanoTime());
        tenant.setPackageType("pro");
        tenant.setMaxUsers(100);
        tenant.setStatus("active");
        TenantContext.setTenantId(1L);
        tenantMapper.insert(tenant);
        tenantId = tenant.getId();

        // Create user
        TenantContext.setTenantId(tenantId);
        User user = new User();
        user.setTenantId(tenantId);
        user.setPhone("walk_integ_" + System.nanoTime());
        user.setPasswordHash(passwordEncoder.encode("test123"));
        user.setNickname("WalkingIntegUser");
        user.setStatus("active");
        user.setLevel(1);
        user.setTotalPoints(0);
        user.setAvailablePoints(0);
        user.setFrozenPoints(0);
        user.setConsecutiveDays(0);
        userMapper.insert(user);
        userId = user.getId();

        // Generate JWT token
        authToken = jwtUtil.generateAccessToken(userId, tenantId, List.of("user"));

        // Reset stub to default
        stubHealthApiClient.setFixedStepCount(8000);
        stubHealthApiClient.setOverrideStepCount(null);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void testClaimSuccess() throws Exception {
        String body = "{\"source\":\"werun\"}";

        MvcResult result = mockMvc.perform(post("/api/walking/claim")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + authToken)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn();

        String content = result.getResponse().getContentAsString();
        assertTrue(content.contains("\"code\":\"0000\"") || content.contains("\"code\": \"0000\""),
                "Expected success but got: " + content);
        assertTrue(content.contains("pointsAwarded"), "Response should contain pointsAwarded");
    }

    @Test
    void testClaimDuplicate() throws Exception {
        String body = "{\"source\":\"werun\"}";

        // First claim succeeds
        mockMvc.perform(post("/api/walking/claim")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + authToken)
                        .content(body))
                .andExpect(status().isOk());

        // Second claim same day -> error
        MvcResult result = mockMvc.perform(post("/api/walking/claim")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + authToken)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn();

        String content = result.getResponse().getContentAsString();
        assertTrue(content.contains("WALKING001"),
                "Expected WALKING001 error code but got: " + content);
    }

    @Test
    void testGetTodayStatus() throws Exception {
        // First claim
        mockMvc.perform(post("/api/walking/claim")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + authToken)
                        .content("{\"source\":\"werun\"}"))
                .andExpect(status().isOk());

        // Then get status
        MvcResult result = mockMvc.perform(get("/api/walking/today")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andReturn();

        String content = result.getResponse().getContentAsString();
        assertTrue(content.contains("\"code\":\"0000\"") || content.contains("\"code\": \"0000\""),
                "Expected success but got: " + content);
        assertTrue(content.contains("todaySteps"), "Response should contain todaySteps");
        assertTrue(content.contains("claimed"), "Response should contain claimed");
    }

    @Test
    void testGetRecords() throws Exception {
        // Claim first to create a record
        mockMvc.perform(post("/api/walking/claim")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + authToken)
                        .content("{\"source\":\"werun\"}"))
                .andExpect(status().isOk());

        // Get records
        MvcResult result = mockMvc.perform(get("/api/walking/records")
                        .header("Authorization", "Bearer " + authToken)
                        .param("page", "1")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andReturn();

        String content = result.getResponse().getContentAsString();
        assertTrue(content.contains("\"code\":\"0000\"") || content.contains("\"code\": \"0000\""),
                "Expected success but got: " + content);
    }
}
