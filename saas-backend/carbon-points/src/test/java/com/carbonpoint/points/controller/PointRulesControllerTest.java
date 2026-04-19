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
import jakarta.annotation.PostConstruct;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for PointRulesController.
 */
@Transactional
class PointRulesControllerTest extends BaseIntegrationTest {

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

    private boolean permissionsSeeded = false;

    @PostConstruct
    public void seedPermissions() {
        if (permissionsSeeded) return;
        permissionsSeeded = true;

        // Seed rule permissions
        for (String code : new String[]{
                "enterprise:rule:create", "enterprise:rule:edit",
                "enterprise:rule:delete", "enterprise:rule:view"}) {
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

        // Seed admin roles for test tenants
        for (long tid : new long[]{9900L, 9910L, 9920L, 9930L, 9940L, 9950L, 9951L, 9960L, 9970L, 9971L}) {
            final long tenantId = tid;
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

                // Link all rule permissions
                List<Permission> perms = permissionMapper.selectList(null);
                for (Permission p : perms) {
                    if (p.getCode().startsWith("enterprise:rule:")) {
                        RolePermission rp = new RolePermission();
                        rp.setRoleId(roleId);
                        rp.setPermissionCode(p.getCode());
                        rolePermissionMapper.insert(rp);
                    }
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
        if (role == null) {
            // Create admin role for this tenant
            role = new Role();
            role.setTenantId(tenantId);
            role.setName("企业管理员");
            role.setIsPreset(true);
            role.setRoleType("enterprise_admin");
            role.setIsEditable(false);
            roleMapper.insert(role);

            // Link all rule permissions to this role
            List<Permission> perms = permissionMapper.selectList(null);
            for (Permission p : perms) {
                if (p.getCode().startsWith("enterprise:rule:")) {
                    RolePermission rp = new RolePermission();
                    rp.setRoleId(role.getId());
                    rp.setPermissionCode(p.getCode());
                    rolePermissionMapper.insert(rp);
                }
            }
        }
        final Long roleId = role.getId();
        boolean alreadyHas = userRoleMapper.selectList(null).stream()
                .anyMatch(ur -> ur.getUserId().equals(userId) && ur.getRoleId().equals(roleId));
        if (!alreadyHas) {
            UserRole ur = new UserRole();
            ur.setUserId(userId);
            ur.setRoleId(role.getId());
            ur.setTenantId(tenantId);
            userRoleMapper.insert(ur);
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

    private void createTenant(Long tenantId, String name) {
        com.carbonpoint.system.entity.Tenant tenant = new com.carbonpoint.system.entity.Tenant();
        tenant.setId(tenantId);
        tenant.setName(name);
        tenant.setPackageType("pro");
        tenant.setMaxUsers(100);
        tenant.setStatus("active");
        tenantMapper.insert(tenant);
    }

    // ─────────────────────────────────────────
    // 1. Create rule
    // ─────────────────────────────────────────

    @Test
    void testCreateRule() throws Exception {
        long tenantId = 9900L;
        createTenant(tenantId, "规则创建测试");
        User admin = createAdminUser(tenantId, "13900990011");

        String token = generateToken(admin.getId(), tenantId, List.of("admin"));
        setTenantContext(tenantId);

        String createJson = """
            {
                "name": "早间打卡规则",
                "type": "time_slot",
                "config": "{\\"startTime\\":\\"07:00\\",\\"endTime\\":\\"09:00\\",\\"minPoints\\":5,\\"maxPoints\\":15}",
                "enabled": true,
                "sortOrder": 1
            }
            """;

        MvcResult result = postJson("/api/point-rules", createJson, token);
        assertSuccess(result);

        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();
        assertTrue(content.contains("早间打卡规则"), "Should contain rule name");
        assertTrue(content.contains("\"type\":\"time_slot\""), "Should contain rule type");
    }

    @Test
    void testCreateRuleValidation() throws Exception {
        long tenantId = 9910L;
        createTenant(tenantId, "规则创建校验测试");
        User admin = createAdminUser(tenantId, "13900991011");

        String token = generateToken(admin.getId(), tenantId, List.of("admin"));
        setTenantContext(tenantId);

        // Missing required fields
        String invalidJson = """
            {
                "enabled": true
            }
            """;

        MvcResult result = postJson("/api/point-rules", invalidJson, token);
        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();

        assertTrue(
                content.contains("\"code\":\"SYSTEM002\"") || content.contains("\"code\":400") ||
                content.contains("规则名称") || content.contains("规则类型") || content.contains("规则配置"),
                "Validation error expected, got: " + content
        );
    }

    @Test
    void testCreateRuleRequiresAuth() throws Exception {
        String createJson = """
            {
                "name": "测试规则",
                "type": "time_slot",
                "config": "{\\"startTime\\":\\"08:00\\",\\"endTime\\":\\"10:00\\",\\"minPoints\\":5,\\"maxPoints\\":15}"
            }
            """;

        MvcResult result = postJson("/api/point-rules", createJson);
        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();

        assertTrue(
                content.contains("\"code\":401") || content.contains("未登录") || content.contains("Unauthorized"),
                "Should return 401 for unauthenticated request, got: " + content
        );
    }

    // ─────────────────────────────────────────
    // 2. Update rule
    // ─────────────────────────────────────────

    @Test
    void testUpdateRule() throws Exception {
        long tenantId = 9920L;
        createTenant(tenantId, "规则更新测试");
        User admin = createAdminUser(tenantId, "13900992011");

        // First create a rule
        String createJson = """
            {
                "name": "原规则名称",
                "type": "time_slot",
                "config": "{\\"startTime\\":\\"07:00\\",\\"endTime\\":\\"09:00\\",\\"minPoints\\":5,\\"maxPoints\\":15}",
                "enabled": true,
                "sortOrder": 1
            }
            """;

        String token = generateToken(admin.getId(), tenantId, List.of("admin"));
        setTenantContext(tenantId);

        MvcResult createResult = postJson("/api/point-rules", createJson, token);
        assertSuccess(createResult);

        // Parse rule ID from response
        createResult.getResponse().setCharacterEncoding("UTF-8");
        String createContent = createResult.getResponse().getContentAsString();

        // Extract rule ID using substring search
        int idStart = createContent.indexOf("\"id\":");
        assertTrue(idStart >= 0, "Response should contain rule ID, got: " + createContent);
        long ruleId = Long.parseLong(createContent.substring(idStart + 5,
                createContent.indexOf(",", idStart)).trim());

        // Update the rule
        String updateJson = """
            {
                "id": %d,
                "name": "更新后规则名称",
                "enabled": false
            }
            """.formatted(ruleId);

        MvcResult result = putJson("/api/point-rules", updateJson, token);
        assertSuccess(result);

        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();
        assertTrue(content.contains("更新后规则名称"), "Should contain updated name");
    }

    // ─────────────────────────────────────────
    // 3. Delete rule
    // ─────────────────────────────────────────

    @Test
    void testDeleteRule() throws Exception {
        long tenantId = 9930L;
        createTenant(tenantId, "规则删除测试");
        User admin = createAdminUser(tenantId, "13900993011");

        // First create a rule
        String createJson = """
            {
                "name": "待删除规则",
                "type": "daily_cap",
                "config": "{\\"dailyLimit\\":100}",
                "enabled": true,
                "sortOrder": 0
            }
            """;

        String token = generateToken(admin.getId(), tenantId, List.of("admin"));
        setTenantContext(tenantId);

        MvcResult createResult = postJson("/api/point-rules", createJson, token);
        assertSuccess(createResult);

        createResult.getResponse().setCharacterEncoding("UTF-8");
        String createContent = createResult.getResponse().getContentAsString();
        int idStart = createContent.indexOf("\"id\":");
        long ruleId = Long.parseLong(createContent.substring(idStart + 5,
                createContent.indexOf(",", idStart)).trim());

        // Delete the rule
        MvcResult result = deleteWithToken("/api/point-rules/" + ruleId, token);
        assertSuccess(result);

        // Verify deleted
        TenantContext.setTenantId(tenantId);
        var deleted = pointRuleMapper.selectById(ruleId);
        assertNull(deleted, "Rule should be deleted");
    }

    // ─────────────────────────────────────────
    // 4. Get rule by ID
    // ─────────────────────────────────────────

    @Test
    void testGetRule() throws Exception {
        long tenantId = 9940L;
        createTenant(tenantId, "规则详情测试");
        User admin = createAdminUser(tenantId, "13900994011");

        // Create a rule first
        String createJson = """
            {
                "name": "详情测试规则",
                "type": "streak",
                "config": "{\\"days\\":7,\\"bonusPoints\\":50}",
                "enabled": true,
                "sortOrder": 2
            }
            """;

        String token = generateToken(admin.getId(), tenantId, List.of("admin"));
        setTenantContext(tenantId);

        MvcResult createResult = postJson("/api/point-rules", createJson, token);
        assertSuccess(createResult);

        createResult.getResponse().setCharacterEncoding("UTF-8");
        String createContent = createResult.getResponse().getContentAsString();
        int idStart = createContent.indexOf("\"id\":");
        long ruleId = Long.parseLong(createContent.substring(idStart + 5,
                createContent.indexOf(",", idStart)).trim());

        // Get the rule
        MvcResult result = getWithToken("/api/point-rules/" + ruleId, token);
        assertSuccess(result);

        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();
        assertTrue(content.contains("详情测试规则"), "Should contain rule name");
        assertTrue(content.contains("\"type\":\"streak\""), "Should contain rule type");
    }

    // ─────────────────────────────────────────
    // 5. List rules
    // ─────────────────────────────────────────

    @Test
    void testListRules() throws Exception {
        long tenantId = 9950L;
        createTenant(tenantId, "规则列表测试");
        User admin = createAdminUser(tenantId, "13900995011");

        String token = generateToken(admin.getId(), tenantId, List.of("admin"));
        setTenantContext(tenantId);

        // Create multiple rules
        for (String name : new String[]{"规则A", "规则B"}) {
            String createJson = """
                {
                    "name": "%s",
                    "type": "time_slot",
                    "config": "{\\"startTime\\":\\"08:00\\",\\"endTime\\":\\"10:00\\",\\"minPoints\\":5,\\"maxPoints\\":20}",
                    "enabled": true,
                    "sortOrder": 0
                }
                """.formatted(name);
            postJson("/api/point-rules", createJson, token);
        }

        MvcResult result = getWithToken("/api/point-rules/list", token);
        assertSuccess(result);

        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();
        assertTrue(content.contains("规则A"), "Should contain rule A");
        assertTrue(content.contains("规则B"), "Should contain rule B");
        assertTrue(content.contains("\"total\""), "Should contain pagination");
    }

    @Test
    void testListRulesWithTypeFilter() throws Exception {
        long tenantId = 9951L;
        createTenant(tenantId, "规则类型过滤测试");
        User admin = createAdminUser(tenantId, "13900995111");

        String token = generateToken(admin.getId(), tenantId, List.of("admin"));
        setTenantContext(tenantId);

        // Create rules of different types
        String json1 = """
            {
                "name": "时间段规则",
                "type": "time_slot",
                "config": "{\\"startTime\\":\\"08:00\\",\\"endTime\\":\\"10:00\\",\\"minPoints\\":5,\\"maxPoints\\":20}",
                "enabled": true,
                "sortOrder": 0
            }
            """;
        postJson("/api/point-rules", json1, token);

        String json2 = """
            {
                "name": "连续规则",
                "type": "streak",
                "config": "{\\"days\\":3,\\"bonusPoints\\":30}",
                "enabled": true,
                "sortOrder": 0
            }
            """;
        postJson("/api/point-rules", json2, token);

        // Filter by type
        MvcResult result = getWithToken("/api/point-rules/list?type=time_slot", token);
        assertSuccess(result);

        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();
        assertTrue(content.contains("时间段规则"), "Should contain time_slot rule");
    }

    // ─────────────────────────────────────────
    // 6. Get enabled rules (no auth required)
    // ─────────────────────────────────────────

    @Test
    void testGetEnabledRules() throws Exception {
        long tenantId = 9960L;
        createTenant(tenantId, "启用规则测试");
        User admin = createAdminUser(tenantId, "13900996011");

        String token = generateToken(admin.getId(), tenantId, List.of("admin"));
        setTenantContext(tenantId);

        // Create enabled and disabled rules
        String enabledJson = """
            {
                "name": "启用规则",
                "type": "daily_cap",
                "config": "{\\"dailyLimit\\":100}",
                "enabled": true,
                "sortOrder": 1
            }
            """;
        postJson("/api/point-rules", enabledJson, token);

        String disabledJson = """
            {
                "name": "禁用规则",
                "type": "daily_cap",
                "config": "{\\"dailyLimit\\":200}",
                "enabled": false,
                "sortOrder": 2
            }
            """;
        postJson("/api/point-rules", disabledJson, token);

        // Get enabled rules (no auth required)
        setTenantContext(tenantId);
        MvcResult result = getWithToken("/api/point-rules/enabled", token);
        assertSuccess(result);

        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();
        assertTrue(content.contains("启用规则"), "Should contain enabled rule");
        // Disabled rule should not appear in enabled list
    }

    // ─────────────────────────────────────────
    // 7. Validate overlap
    // ─────────────────────────────────────────

    @Test
    void testValidateOverlapNoConflict() throws Exception {
        long tenantId = 9970L;
        createTenant(tenantId, "重叠校验测试");
        User admin = createAdminUser(tenantId, "13900997011");

        String token = generateToken(admin.getId(), tenantId, List.of("admin"));
        setTenantContext(tenantId);

        MvcResult result = postWithParams(
                "/api/point-rules/validate-overlap?startTime=07:00&endTime=09:00", token);
        assertSuccess(result);
    }

    @Test
    void testValidateOverlapWithConflict() throws Exception {
        long tenantId = 9971L;
        createTenant(tenantId, "重叠冲突测试");
        User admin = createAdminUser(tenantId, "13900997111");

        String token = generateToken(admin.getId(), tenantId, List.of("admin"));
        setTenantContext(tenantId);

        // Create a time_slot rule
        String createJson = """
            {
                "name": "已有规则",
                "type": "time_slot",
                "config": "{\\"startTime\\":\\"07:00\\",\\"endTime\\":\\"09:00\\",\\"minPoints\\":5,\\"maxPoints\\":15}",
                "enabled": true,
                "sortOrder": 1
            }
            """;
        MvcResult createResult = postJson("/api/point-rules", createJson, token);
        assertSuccess(createResult);

        createResult.getResponse().setCharacterEncoding("UTF-8");
        String createContent = createResult.getResponse().getContentAsString();
        int idStart = createContent.indexOf("\"id\":");
        long ruleId = Long.parseLong(createContent.substring(idStart + 5,
                createContent.indexOf(",", idStart)).trim());

        // Try to validate overlap with same time range (excluding the existing rule)
        MvcResult result = postWithParams(
                "/api/point-rules/validate-overlap?startTime=07:30&endTime=08:30&excludeRuleId=" + ruleId, token);
        assertSuccess(result);
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
