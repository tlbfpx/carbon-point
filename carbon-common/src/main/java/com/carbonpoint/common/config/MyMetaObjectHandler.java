package com.carbonpoint.common.config;

import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;
import com.carbonpoint.common.tenant.TenantContext;
import org.apache.ibatis.reflection.MetaObject;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * MyBatis-Plus 自动填充处理器。
 * <ul>
 *   <li>insert 时自动填充 createdAt、updatedAt、tenantId</li>
 *   <li>update 时自动填充 updatedAt</li>
 * </ul>
 * <p>
 * tenantId 仅在 TenantContext 中有值时才填充，适用于需要多租户隔离的表。
 * 对于 tenants、platform_admins、permissions 等无 tenant_id 列的表，
 * TenantLineHandler.ignoreTable() 会直接跳过，不会尝试填充。
 * </p>
 */
@Component
public class MyMetaObjectHandler implements MetaObjectHandler {

    @Override
    public void insertFill(MetaObject metaObject) {
        // 填充 createdAt
        strictInsertFill(metaObject, "createdAt", LocalDateTime::now, LocalDateTime.class);
        // 填充 updatedAt
        strictInsertFill(metaObject, "updatedAt", LocalDateTime::now, LocalDateTime.class);

        // 尝试填充 tenantId（如果实体中有该字段且 TenantContext 已设置）
        Long tenantId = TenantContext.getTenantId();
        if (tenantId != null && hasGetter(metaObject, "tenantId")) {
            strictInsertFill(metaObject, "tenantId", () -> tenantId, Long.class);
        }
    }

    @Override
    public void updateFill(MetaObject metaObject) {
        // 填充 updatedAt
        strictUpdateFill(metaObject, "updatedAt", LocalDateTime::now, LocalDateTime.class);
    }

    /**
     * 检查实体中是否存在指定的 getter 属性。
     */
    private boolean hasGetter(MetaObject metaObject, String fieldName) {
        // 尝试驼峰形式和下划线形式
        return metaObject.hasGetter(fieldName)
                || metaObject.hasGetter(toCamelCase(fieldName));
    }

    private String toCamelCase(String fieldName) {
        if (fieldName == null || fieldName.isEmpty()) {
            return fieldName;
        }
        // 如果是驼峰直接返回
        if (Character.isLowerCase(fieldName.charAt(0))) {
            return fieldName;
        }
        // 如果是 PascalCase 转 camelCase
        return Character.toLowerCase(fieldName.charAt(0)) + fieldName.substring(1);
    }
}
