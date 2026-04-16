package com.carbonpoint.common.config;

import com.baomidou.mybatisplus.extension.plugins.handler.TenantLineHandler;
import net.sf.jsqlparser.expression.Expression;
import net.sf.jsqlparser.expression.LongValue;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * MyBatis-Plus TenantLineHandler implementation.
 * Tables without tenant_id column are in the ignore set.
 * Tables in the ignore set are not filtered by tenant_id.
 */
public class CustomTenantLineHandler implements TenantLineHandler {

    /**
     * Tables that do NOT have a tenant_id column.
     * These tables are shared globally and should never be filtered by tenant.
     */
    private static final Set<String> IGNORE_TABLES = new HashSet<>(Arrays.asList(
            "platform_admins",
            "platform_configs",
            "platform_operation_logs",
            "permissions",
            "badge_definitions",
            "sys_dict",
            "notification_templates",
            "tenants",
            "role_permissions",
            "user_roles",
            "login_security_logs",
            "password_history",
            "user_notification_preferences",
            "permission_packages",
            "package_permissions",
            "package_change_logs"
    ));
            "permission_packages",
            "package_permissions",

    @Override
    public Expression getTenantId() {
        Long tenantId = getTenantIdFromContext();
        if (tenantId == null) {
            return null;
        }
        return new LongValue(tenantId);
    }

    @Override
    public String getTenantIdColumn() {
        return "tenant_id";
    }

    @Override
    public boolean ignoreTable(String tableName) {
        return IGNORE_TABLES.contains(tableName.toLowerCase());
    }

    private Long getTenantIdFromContext() {
        return com.carbonpoint.common.tenant.TenantContext.getTenantId();
    }
}
