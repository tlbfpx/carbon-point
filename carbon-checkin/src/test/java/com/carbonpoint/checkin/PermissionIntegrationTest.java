package com.carbonpoint.checkin;

import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.entity.Role;
import com.carbonpoint.system.mapper.RoleMapper;
import com.carbonpoint.system.mapper.UserRoleMapper;
import com.carbonpoint.system.mapper.RolePermissionMapper;
import com.carbonpoint.common.tenant.TenantContext;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;

/**
 * Integration tests for permission / RBAC enforcement.
 *
 * <p>Tests the @RequirePerm annotation and service-level permission checks.
 *
 * <p>Scenarios:
 * <ul>
 *   <li>User without permission calling a protected API → 403</li>
 *   <li>User with permission calling a protected API → 200</li>
 *   <li>Anonymous user calling a protected API → 401</li>
 * </ul>
 */
class PermissionIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private RoleMapper roleMapper;

    @Autowired
    private UserRoleMapper userRoleMapper;

    @Autowired
    private RolePermissionMapper rolePermissionMapper;

    // ─────────────────────────────────────────
    // 15.1.3 — Unauthorized access rejection
    // ─────────────────────────────────────────

    @Test
    void testUnauthorizedAccessRejected() throws Exception {
        // Create tenant and regular user (without admin permissions)
        testDataHelper.tenant("权限测试租户").id(801L).save();
        User user = testDataHelper.user(801L, "13800000801", "Test@123")
                .id(801L)
                .save();

        String token = generateToken(user.getId(), 801L, List.of("regular_user"));

        // Try to call admin-only endpoint (user creation)
        String createUserJson = """
            {
                "phone": "13900000901",
                "password": "Test@123",
                "nickname": "新用户"
            }
            """;

        setTenantContext(801L);
        MvcResult result = postJson("/api/users", createUserJson, token);

        // Should return 403 Forbidden or 401 Unauthorized
        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();
        int status = result.getResponse().getStatus();

        assertTrue(
                status == 403 || status == 401 || content.contains("\"code\":403") || content.contains("\"code\":4005") || content.contains("\"code\":3004"),
                "Should return 403/401 for unauthorized access, got status=" + status + ", content=" + content
        );
    }

    // ─────────────────────────────────────────
    // 15.1.3b — Permission-based access control
    // ─────────────────────────────────────────

    @Test
    void testPermissionBasedAccessControl() throws Exception {
        // Create tenant
        testDataHelper.tenant("权限测试租户B").id(802L).save();

        // Create admin role with permissions
        Role adminRole = new Role();
        adminRole.setId(802L);
        adminRole.setTenantId(802L);
        adminRole.setName("管理员");
        adminRole.setIsPreset(false);
        roleMapper.insert(adminRole);

        // Create regular role without permissions
        Role regularRole = new Role();
        regularRole.setId(803L);
        regularRole.setTenantId(802L);
        regularRole.setName("普通用户");
        regularRole.setIsPreset(false);
        roleMapper.insert(regularRole);

        // Admin user
        User adminUser = testDataHelper.user(802L, "13800000802", "Test@123")
                .id(802L)
                .save();

        // Regular user
        User regularUser = testDataHelper.user(802L, "13800000803", "Test@123")
                .id(803L)
                .save();

        // Assign roles
        com.carbonpoint.system.entity.UserRole adminUr = new com.carbonpoint.system.entity.UserRole();
        adminUr.setUserId(adminUser.getId());
        adminUr.setRoleId(adminRole.getId());
        TenantContext.setTenantId(802L);
        userRoleMapper.insert(adminUr);

        com.carbonpoint.system.entity.UserRole regularUr = new com.carbonpoint.system.entity.UserRole();
        regularUr.setUserId(regularUser.getId());
        regularUr.setRoleId(regularRole.getId());
        TenantContext.setTenantId(802L);
        userRoleMapper.insert(regularUr);

        // Admin tries to create a user → should succeed
        setTenantContext(802L);
        String adminToken = generateToken(adminUser.getId(), 802L, List.of("admin"));
        String createUserJson = """
            {
                "phone": "13900000911",
                "password": "Test@123",
                "nickname": "Admin创建的用户"
            }
            """;

        MvcResult adminResult = postJson("/api/users", createUserJson, adminToken);
        adminResult.getResponse().setCharacterEncoding("UTF-8");
        String adminContent = adminResult.getResponse().getContentAsString();

        // Admin should succeed (not a permission-denied error)
        assertFalse(adminContent.contains("\"code\":403"),
                "Admin with proper role should not be rejected for permissions");

        // Regular user tries to create a different user → should be rejected (403)
        setTenantContext(802L);
        String regularToken = generateToken(regularUser.getId(), 802L, List.of("regular_user"));
        String regularCreateJson = """
            {
                "phone": "13900000912",
                "password": "Test@123",
                "nickname": "普通用户尝试创建"
            }
            """;
        MvcResult regularResult = postJson("/api/users", regularCreateJson, regularToken);
        regularResult.getResponse().setCharacterEncoding("UTF-8");
        String regularContent = regularResult.getResponse().getContentAsString();

        // Should be rejected with permission error
        assertTrue(
                regularContent.contains("\"code\":403") || regularContent.contains("\"code\":4005") || regularContent.contains("\"code\":3004"),
                "Regular user should be rejected for permission, got: " + regularContent
        );
    }

    // ─────────────────────────────────────────
    // 15.1.3c — Super admin protection
    // ─────────────────────────────────────────

    @Test
    void testSuperAdminCannotBeDeleted() throws Exception {
        // Create tenant with preset admin role
        testDataHelper.tenant("预设角色测试租户").id(804L).save();
        Role presetAdmin = new Role();
        presetAdmin.setId(804L);
        presetAdmin.setTenantId(804L);
        presetAdmin.setName("超级管理员");
        presetAdmin.setIsPreset(true);
        roleMapper.insert(presetAdmin);

        User admin = testDataHelper.user(804L, "13800000930", "Test@123")
                .id(804L)
                .save();

        // Assign preset admin role
        com.carbonpoint.system.entity.UserRole ur = new com.carbonpoint.system.entity.UserRole();
        ur.setUserId(admin.getId());
        ur.setRoleId(presetAdmin.getId());
        ur.setTenantId(804L);
        TenantContext.setTenantId(804L);
        userRoleMapper.insert(ur);

        String token = generateToken(admin.getId(), 804L, List.of("super_admin"));

        // Try to delete the preset admin role
        setTenantContext(804L);
        MvcResult result = mockMvc.perform(
                delete("/api/roles/" + presetAdmin.getId())
                        .header("Authorization", "Bearer " + token)
        ).andReturn();

        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();

        // Should be rejected with ROLE_CANNOT_DELETE (4003)
        assertTrue(
                content.contains("\"code\":4003"),
                "Preset role deletion should be rejected with code 4003, got: " + content
        );
    }

    @Autowired
    private TestDataHelper testDataHelper;
}
