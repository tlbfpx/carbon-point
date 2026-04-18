package com.carbonpoint.mall;

import com.carbonpoint.common.mapper.PointTransactionMapper;
import com.carbonpoint.common.security.AppPasswordEncoder;
import com.carbonpoint.common.security.JwtUtil;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.mall.entity.ExchangeOrder;
import com.carbonpoint.mall.entity.Product;
import com.carbonpoint.mall.mapper.ExchangeOrderMapper;
import com.carbonpoint.mall.mapper.MallProductMapper;
import com.carbonpoint.system.entity.Permission;
import com.carbonpoint.system.entity.Role;
import com.carbonpoint.system.entity.RolePermission;
import com.carbonpoint.system.entity.Tenant;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.entity.UserRole;
import com.carbonpoint.system.mapper.PermissionMapper;
import com.carbonpoint.system.mapper.RoleMapper;
import com.carbonpoint.system.mapper.RolePermissionMapper;
import com.carbonpoint.system.mapper.TenantMapper;
import com.carbonpoint.system.mapper.UserMapper;
import com.carbonpoint.system.mapper.UserRoleMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

/**
 * Base class for all integration tests.
 * Provides common setup, authentication helpers, and utility methods.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, classes = TestApplication.class)
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
    protected MallProductMapper productMapper;

    @Autowired
    protected ExchangeOrderMapper exchangeOrderMapper;

    // RBAC mappers
    @Autowired
    protected RoleMapper roleMapper;

    @Autowired
    protected PermissionMapper permissionMapper;

    @Autowired
    protected RolePermissionMapper rolePermissionMapper;

    @Autowired
    protected UserRoleMapper userRoleMapper;

    @Autowired
    protected JdbcTemplate jdbcTemplate;

    private boolean permissionsSeeded = false;

    @PostConstruct
    public void seedPermissions() {
        if (permissionsSeeded) return;
        permissionsSeeded = true;

        // Seed enterprise permissions (permissions table is in IGNORE_TABLES, not tenant-filtered)
        seedPermission("enterprise:product:create");
        seedPermission("enterprise:product:edit");
        seedPermission("enterprise:product:delete");
        seedPermission("enterprise:product:toggle");
        seedPermission("enterprise:product:stock");
        seedPermission("enterprise:product:list");
        seedPermission("enterprise:exchange:create");
        seedPermission("enterprise:exchange:cancel");
        seedPermission("enterprise:exchange:list");
        seedPermission("enterprise:exchange:fulfill");
        seedPermission("enterprise:exchange:redeem");

        // Seed admin roles for all test tenant IDs used in tests.
        // These IDs must match what the tests use.
        long[] testTenantIds = new long[]{
                9100L, 9101L, 9110L, 9111L, 9120L, 9121L,
                9130L, 9131L, 9140L, 9141L, 9142L,
                9150L, 9151L, 9152L, 9160L, 9161L,
                9999L
        };
        for (long tid : testTenantIds) {
            final long tenantId = tid;
            Role existing = roleMapper.selectList(null).stream()
                    .filter(r -> "企业管理员".equals(r.getName())
                            && Boolean.TRUE.equals(r.getIsPreset())
                            && r.getTenantId() != null && r.getTenantId().equals(tenantId))
                    .findFirst()
                    .orElse(null);
            if (existing == null) {
                Role adminRole = new Role();
                adminRole.setTenantId(tenantId);
                adminRole.setName("企业管理员");
                adminRole.setIsPreset(true);
                adminRole.setRoleType("enterprise_admin");
                adminRole.setIsEditable(false);
                roleMapper.insert(adminRole);
                long roleId = adminRole.getId();

                // Link admin role to all mall permissions
                List<Permission> perms = permissionMapper.selectList(null);
                for (Permission p : perms) {
                    if (p.getCode().startsWith("enterprise:")) {
                        RolePermission rp = new RolePermission();
                        rp.setRoleId(roleId);
                        rp.setPermissionCode(p.getCode());
                        rolePermissionMapper.insert(rp);
                    }
                }
            }
        }
    }

    private void seedPermission(String code) {
        Permission existing = permissionMapper.selectById(code);
        if (existing == null) {
            Permission p = new Permission();
            p.setCode(code);
            p.setModule(code.split(":")[1]);
            p.setOperation(code.split(":")[2]);
            p.setDescription(code);
            p.setSortOrder(0);
            permissionMapper.insert(p);
        }
    }

    /**
     * Grant the test admin role to a user. Idempotent - skips if already granted.
     */
    protected void grantAdminRole(Long userId, Long tenantId) {
        // Find the admin role for this specific tenant
        Role role = roleMapper.selectList(null).stream()
                .filter(r -> "企业管理员".equals(r.getName())
                        && Boolean.TRUE.equals(r.getIsPreset())
                        && r.getTenantId() != null && r.getTenantId().equals(tenantId))
                .findFirst()
                .orElse(null);
        if (role != null) {
            // Check if already granted (idempotent - user_roles has (user_id, role_id) PK)
            boolean alreadyHas = userRoleMapper.selectList(null).stream()
                    .anyMatch(ur -> ur.getUserId().equals(userId) && ur.getRoleId().equals(role.getId()));
            if (!alreadyHas) {
                UserRole ur = new UserRole();
                ur.setUserId(userId);
                ur.setRoleId(role.getId());
                userRoleMapper.insert(ur);
            }
        }
    }

    @org.junit.jupiter.api.AfterEach
    public void tearDown() {
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
        if (roles.length > 0 && "admin".equals(roles[0])) {
            grantAdminRole(user.getId(), tenantId);
        }
        return user;
    }

    /**
     * Create a test admin user (with full mall permissions).
     */
    protected User createAdminUser(Long tenantId, String phone, String password) {
        User user = new User();
        user.setTenantId(tenantId);
        user.setPhone(phone);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setNickname("AdminUser_" + phone);
        user.setStatus("active");
        user.setLevel(1);
        user.setTotalPoints(0);
        user.setAvailablePoints(0);
        user.setFrozenPoints(0);
        user.setConsecutiveDays(0);
        userMapper.insert(user);
        grantAdminRole(user.getId(), tenantId);
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

    /**
     * Perform a PUT request with JSON body and Bearer token.
     */
    protected MvcResult putJson(String url, String jsonBody, String token) throws Exception {
        return mockMvc.perform(put(url)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + token)
                        .content(jsonBody))
                .andReturn();
    }

    // ─────────────────────────────────────────
    // Result assertions
    // ─────────────────────────────────────────

    /**
     * Assert that the response was successful (code "0000" string).
     */
    protected void assertSuccess(MvcResult result) throws Exception {
        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertTrue(
                content.contains("\"code\":\"0000\"") || content.contains("\"code\": \"0000\""),
                "Expected success response with code \"0000\" but got: " + content
        );
    }

    /**
     * Assert that the response contains the given error code.
     */
    protected void assertErrorCode(MvcResult result, String errorCode) throws Exception {
        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertTrue(
                content.contains("\"code\":\"" + errorCode + "\"") || content.contains("\"code\": \"" + errorCode + "\""),
                "Expected error code " + errorCode + " but got: " + content
        );
    }

    /**
     * Assert that the response contains a numeric error code.
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
