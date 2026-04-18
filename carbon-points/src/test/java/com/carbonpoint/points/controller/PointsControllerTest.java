package com.carbonpoint.points.controller;

import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.points.BaseIntegrationTest;
import com.carbonpoint.points.mapper.PointRuleMapper;
import com.carbonpoint.points.mapper.PointsUserMapper;
import com.carbonpoint.system.entity.Permission;
import com.carbonpoint.system.entity.Role;
import com.carbonpoint.system.entity.RolePermission;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.entity.UserRole;
import com.carbonpoint.system.mapper.PermissionMapper;
import com.carbonpoint.system.mapper.RoleMapper;
import com.carbonpoint.system.mapper.RolePermissionMapper;
import com.carbonpoint.system.mapper.UserMapper;
import com.carbonpoint.system.mapper.UserRoleMapper;
import com.carbonpoint.common.entity.PointTransactionEntity;
import com.carbonpoint.common.mapper.PointTransactionMapper;
import jakarta.annotation.PostConstruct;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for PointsController.
 */
@Transactional
class PointsControllerTest extends BaseIntegrationTest {

    @Autowired
    private PermissionMapper permissionMapper;

    @Autowired
    private RoleMapper roleMapper;

    @Autowired
    private RolePermissionMapper rolePermissionMapper;

    @Autowired
    private UserRoleMapper userRoleMapper;

    @Autowired
    private PointRuleMapper pointRuleMapper;

    @Autowired
    private PointTransactionMapper pointTransactionMapper;

    private boolean permissionsSeeded = false;

    @PostConstruct
    public void seedPermissions() {
        if (permissionsSeeded) return;
        permissionsSeeded = true;

        // Seed point permissions (if not already seeded by schema)
        for (String code : new String[]{
                "enterprise:point:query", "enterprise:point:add", "enterprise:point:deduct"}) {
            Permission existing = permissionMapper.selectById(code);
            if (existing == null) {
                Permission p = new Permission();
                p.setCode(code);
                p.setModule(code.split(":")[1]);
                p.setOperation(code.split(":")[2]);
                p.setSortOrder(0);
                permissionMapper.insert(p);
            }
        }

        // Seed admin role for each test tenant
        for (long tid : new long[]{9900L, 9910L, 9920L, 9921L, 9930L, 9931L, 9940L, 9941L}) {
            final long tenantId = tid;
            // Check if role already exists for this tenant
            Role existing = roleMapper.selectList(null).stream()
                    .filter(r -> "企业管理员".equals(r.getName())
                            && Boolean.TRUE.equals(r.getIsPreset())
                            && r.getTenantId() != null && r.getTenantId().equals(tenantId)
                            && r.getRoleType() != null && r.getRoleType().equals("enterprise_admin"))
                    .findFirst()
                    .orElse(null);
            if (existing == null) {
                Role adminRole = new Role();
                adminRole.setId(nextRuleId());
                adminRole.setTenantId(tenantId);
                adminRole.setName("企业管理员");
                adminRole.setIsPreset(true);
                adminRole.setRoleType("enterprise_admin");
                adminRole.setIsEditable(false);
                roleMapper.insert(adminRole);
                long roleId = adminRole.getId();

                // Link all point permissions
                for (String code : new String[]{
                        "enterprise:point:query", "enterprise:point:add", "enterprise:point:deduct"}) {
                    RolePermission rp = new RolePermission();
                    rp.setRoleId(roleId);
                    rp.setPermissionCode(code);
                    rolePermissionMapper.insert(rp);
                }
            }
        }
    }

    private void grantAdminRole(Long userId, Long tenantId) {
        Role role = roleMapper.selectList(null).stream()
                .filter(r -> "企业管理员".equals(r.getName())
                        && Boolean.TRUE.equals(r.getIsPreset())
                        && r.getTenantId() != null && r.getTenantId().equals(tenantId)
                        && r.getRoleType() != null && r.getRoleType().equals("enterprise_admin"))
                .findFirst()
                .orElse(null);
        if (role != null) {
            boolean alreadyHas = userRoleMapper.selectList(null).stream()
                    .anyMatch(ur -> ur.getUserId().equals(userId) && ur.getRoleId().equals(role.getId()));
            if (!alreadyHas) {
                UserRole ur = new UserRole();
                ur.setUserId(userId);
                ur.setRoleId(role.getId());
                ur.setTenantId(tenantId);
                userRoleMapper.insert(ur);
            }
        }
    }

    private User createAdminUser(Long tenantId, String phone) {
        User user = new User();
        user.setId(nextUserId());
        user.setTenantId(tenantId);
        user.setPhone(phone);
        user.setPasswordHash(passwordEncoder.encode("Test@123"));
        user.setNickname("Admin_" + phone);
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

    // ─────────────────────────────────────────
    // 1. User account endpoint
    // ─────────────────────────────────────────

    @Test
    void testGetMyAccount() throws Exception {
        long tenantId = 9900L;
        TenantContext.setTenantId(tenantId);

        com.carbonpoint.system.entity.Tenant tenant = new com.carbonpoint.system.entity.Tenant();
        tenant.setId(tenantId);
        tenant.setName("积分账户测试");
        tenant.setPackageType("pro");
        tenant.setMaxUsers(100);
        tenant.setStatus("active");
        tenantMapper.insert(tenant);

        User user = new User();
        user.setId(nextUserId());
        user.setTenantId(tenantId);
        user.setPhone("13900990001");
        user.setPasswordHash(passwordEncoder.encode("Test@123"));
        user.setNickname("账户测试用户");
        user.setStatus("active");
        user.setLevel(2);
        user.setTotalPoints(500);
        user.setAvailablePoints(400);
        user.setFrozenPoints(100);
        user.setConsecutiveDays(5);
        userMapper.insert(user);

        String token = generateToken(user.getId(), tenantId, List.of("user"));
        setTenantContext(tenantId);

        MvcResult result = getWithToken("/api/points/account", token);
        assertSuccess(result);

        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();
        assertTrue(content.contains("\"totalPoints\":500"), "Should contain total points");
        assertTrue(content.contains("\"availablePoints\":400"), "Should contain available points");
        assertTrue(content.contains("\"level\":2"), "Should contain user level");
    }

    @Test
    void testGetMyAccountRequiresAuth() throws Exception {
        MvcResult result = getWithToken("/api/points/account", "");
        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();
        assertTrue(
                content.contains("\"code\":401") || content.contains("未登录") || content.contains("Unauthorized"),
                "Should return 401 for unauthenticated request, got: " + content
        );
    }

    // ─────────────────────────────────────────
    // 2. User transactions endpoint
    // ─────────────────────────────────────────

    @Test
    void testGetMyTransactions() throws Exception {
        long tenantId = 9910L;
        TenantContext.setTenantId(tenantId);

        com.carbonpoint.system.entity.Tenant tenant = new com.carbonpoint.system.entity.Tenant();
        tenant.setId(tenantId);
        tenant.setName("交易列表测试");
        tenant.setPackageType("pro");
        tenant.setMaxUsers(100);
        tenant.setStatus("active");
        tenantMapper.insert(tenant);

        User user = new User();
        user.setId(nextUserId());
        user.setTenantId(tenantId);
        user.setPhone("13900991001");
        user.setPasswordHash(passwordEncoder.encode("Test@123"));
        user.setNickname("交易用户");
        user.setStatus("active");
        user.setLevel(1);
        user.setTotalPoints(100);
        user.setAvailablePoints(100);
        user.setFrozenPoints(0);
        user.setConsecutiveDays(0);
        userMapper.insert(user);

        // Seed a transaction
        PointTransactionEntity tx = new PointTransactionEntity();
        tx.setId(nextRuleId());
        tx.setUserId(user.getId());
        tx.setTenantId(tenantId);
        tx.setAmount(100);
        tx.setType("manual_add");
        tx.setBalanceAfter(100);
        tx.setFrozenAfter(0);
        tx.setRemark("测试积分");
        tx.setReferenceId("TEST_REF_001");
        pointTransactionMapper.insert(tx);

        String token = generateToken(user.getId(), tenantId, List.of("user"));
        setTenantContext(tenantId);

        MvcResult result = getWithToken("/api/points/transactions", token);
        assertSuccess(result);

        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();
        assertTrue(content.contains("\"total\""), "Should contain pagination info");
    }

    // ─────────────────────────────────────────
    // 3. Admin balance/statistics endpoints
    // ─────────────────────────────────────────

    @Test
    void testGetBalance() throws Exception {
        long tenantId = 9920L;
        TenantContext.setTenantId(tenantId);

        com.carbonpoint.system.entity.Tenant tenant = new com.carbonpoint.system.entity.Tenant();
        tenant.setId(tenantId);
        tenant.setName("余额查询测试");
        tenant.setPackageType("pro");
        tenant.setMaxUsers(100);
        tenant.setStatus("active");
        tenantMapper.insert(tenant);

        User user = new User();
        user.setId(nextUserId());
        user.setTenantId(tenantId);
        user.setPhone("13900992001");
        user.setPasswordHash(passwordEncoder.encode("Test@123"));
        user.setNickname("余额用户");
        user.setStatus("active");
        user.setLevel(1);
        user.setTotalPoints(300);
        user.setAvailablePoints(250);
        user.setFrozenPoints(50);
        user.setConsecutiveDays(0);
        userMapper.insert(user);

        User admin = createAdminUser(tenantId, "13900992002");
        String token = generateToken(admin.getId(), tenantId, List.of("admin"));
        setTenantContext(tenantId);

        MvcResult result = getWithToken("/api/points/balance?userId=" + user.getId(), token);
        assertSuccess(result);

        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();
        assertTrue(content.contains("\"totalPoints\":300"), "Should contain total points");
    }

    @Test
    void testGetStatistics() throws Exception {
        long tenantId = 9921L;
        TenantContext.setTenantId(tenantId);

        com.carbonpoint.system.entity.Tenant tenant = new com.carbonpoint.system.entity.Tenant();
        tenant.setId(tenantId);
        tenant.setName("统计查询测试");
        tenant.setPackageType("pro");
        tenant.setMaxUsers(100);
        tenant.setStatus("active");
        tenantMapper.insert(tenant);

        User user = new User();
        user.setId(nextUserId());
        user.setTenantId(tenantId);
        user.setPhone("13900992101");
        user.setPasswordHash(passwordEncoder.encode("Test@123"));
        user.setNickname("统计用户");
        user.setStatus("active");
        user.setLevel(3);
        user.setTotalPoints(6000);
        user.setAvailablePoints(5500);
        user.setFrozenPoints(500);
        user.setConsecutiveDays(10);
        userMapper.insert(user);

        User admin = createAdminUser(tenantId, "13900992102");
        String token = generateToken(admin.getId(), tenantId, List.of("admin"));
        setTenantContext(tenantId);

        MvcResult result = getWithToken("/api/points/statistics?userId=" + user.getId(), token);
        assertSuccess(result);

        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();
        assertTrue(content.contains("\"level\":3"), "Should contain user level");
        assertTrue(content.contains("\"totalPoints\":6000"), "Should contain total points");
    }

    // ─────────────────────────────────────────
    // 4. Admin award points
    // ─────────────────────────────────────────

    @Test
    void testAwardPoints() throws Exception {
        long tenantId = 9930L;
        TenantContext.setTenantId(tenantId);

        com.carbonpoint.system.entity.Tenant tenant = new com.carbonpoint.system.entity.Tenant();
        tenant.setId(tenantId);
        tenant.setName("积分发放测试");
        tenant.setPackageType("pro");
        tenant.setMaxUsers(100);
        tenant.setStatus("active");
        tenantMapper.insert(tenant);

        User user = new User();
        user.setId(nextUserId());
        user.setTenantId(tenantId);
        user.setPhone("13900993001");
        user.setPasswordHash(passwordEncoder.encode("Test@123"));
        user.setNickname("发放目标用户");
        user.setStatus("active");
        user.setLevel(1);
        user.setTotalPoints(0);
        user.setAvailablePoints(0);
        user.setFrozenPoints(0);
        user.setConsecutiveDays(0);
        userMapper.insert(user);

        User admin = createAdminUser(tenantId, "13900993002");
        String token = generateToken(admin.getId(), tenantId, List.of("admin"));
        setTenantContext(tenantId);

        String awardJson = """
            {
                "userId": %d,
                "amount": 200,
                "remark": "测试积分发放"
            }
            """.formatted(user.getId());

        MvcResult result = postJson("/api/points/award", awardJson, token);
        assertSuccess(result);

        // Verify points were awarded
        TenantContext.setTenantId(tenantId);
        User updated = userMapper.selectById(user.getId());
        assertNotNull(updated, "User should be found after award");
        assertEquals(200, updated.getTotalPoints(), "Total points should be 200");
        assertEquals(200, updated.getAvailablePoints(), "Available points should be 200");
    }

    @Test
    void testAwardPointsValidation() throws Exception {
        long tenantId = 9931L;
        TenantContext.setTenantId(tenantId);

        com.carbonpoint.system.entity.Tenant tenant = new com.carbonpoint.system.entity.Tenant();
        tenant.setId(tenantId);
        tenant.setName("积分发放校验测试");
        tenant.setPackageType("pro");
        tenant.setMaxUsers(100);
        tenant.setStatus("active");
        tenantMapper.insert(tenant);

        User admin = createAdminUser(tenantId, "13900993101");
        String token = generateToken(admin.getId(), tenantId, List.of("admin"));
        setTenantContext(tenantId);

        // Missing required fields
        String invalidJson = """
            {
                "amount": -5
            }
            """;

        MvcResult result = postJson("/api/points/award", invalidJson, token);
        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();

        // Should return validation error
        assertTrue(
                content.contains("\"code\":\"SYSTEM002\"") || content.contains("\"code\":400") ||
                content.contains("用户ID") || content.contains("积分数量"),
                "Validation error expected for missing/invalid fields, got: " + content
        );
    }

    // ─────────────────────────────────────────
    // 5. Admin deduct points
    // ─────────────────────────────────────────

    @Test
    void testDeductPoints() throws Exception {
        long tenantId = 9940L;
        TenantContext.setTenantId(tenantId);

        com.carbonpoint.system.entity.Tenant tenant = new com.carbonpoint.system.entity.Tenant();
        tenant.setId(tenantId);
        tenant.setName("积分扣减测试");
        tenant.setPackageType("pro");
        tenant.setMaxUsers(100);
        tenant.setStatus("active");
        tenantMapper.insert(tenant);

        User user = new User();
        user.setId(nextUserId());
        user.setTenantId(tenantId);
        user.setPhone("13900994001");
        user.setPasswordHash(passwordEncoder.encode("Test@123"));
        user.setNickname("扣减目标用户");
        user.setStatus("active");
        user.setLevel(1);
        user.setTotalPoints(500);
        user.setAvailablePoints(500);
        user.setFrozenPoints(0);
        user.setConsecutiveDays(0);
        userMapper.insert(user);

        User admin = createAdminUser(tenantId, "13900994002");
        String token = generateToken(admin.getId(), tenantId, List.of("admin"));
        setTenantContext(tenantId);

        String deductJson = """
            {
                "userId": %d,
                "amount": 100,
                "remark": "测试积分扣减"
            }
            """.formatted(user.getId());

        MvcResult result = postJson("/api/points/deduct", deductJson, token);
        assertSuccess(result);

        // Verify points were deducted
        TenantContext.setTenantId(tenantId);
        User updated = userMapper.selectById(user.getId());
        assertNotNull(updated, "User should be found after deduction");
        assertEquals(400, updated.getTotalPoints(), "Total points should be 400");
        assertEquals(400, updated.getAvailablePoints(), "Available points should be 400");
    }

    @Test
    void testDeductPointsInsufficient() throws Exception {
        long tenantId = 9941L;
        TenantContext.setTenantId(tenantId);

        com.carbonpoint.system.entity.Tenant tenant = new com.carbonpoint.system.entity.Tenant();
        tenant.setId(tenantId);
        tenant.setName("积分不足扣减测试");
        tenant.setPackageType("pro");
        tenant.setMaxUsers(100);
        tenant.setStatus("active");
        tenantMapper.insert(tenant);

        User user = new User();
        user.setId(nextUserId());
        user.setTenantId(tenantId);
        user.setPhone("13900994101");
        user.setPasswordHash(passwordEncoder.encode("Test@123"));
        user.setNickname("不足用户");
        user.setStatus("active");
        user.setLevel(1);
        user.setTotalPoints(50);
        user.setAvailablePoints(50);
        user.setFrozenPoints(0);
        user.setConsecutiveDays(0);
        userMapper.insert(user);

        User admin = createAdminUser(tenantId, "13900994102");
        String token = generateToken(admin.getId(), tenantId, List.of("admin"));
        setTenantContext(tenantId);

        // Try to deduct more than available
        String deductJson = """
            {
                "userId": %d,
                "amount": 100,
                "remark": "超额扣减"
            }
            """.formatted(user.getId());

        MvcResult result = postJson("/api/points/deduct", deductJson, token);
        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();

        // Should return error
        assertTrue(
                content.contains("\"code\":\"POINT") || content.contains("不足"),
                "Insufficient points should return error, got: " + content
        );
    }

    @AfterEach
    public void cleanUp() {
        TenantContext.clear();
        try {
            redisTemplate.getConnectionFactory().getConnection().flushAll();
        } catch (Exception e) {
            // Redis may not be available
        }
    }
}
