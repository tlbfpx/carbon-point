package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Platform operation log entity.
 * Column names match Phase 2 schema.sql.
 */
@Data
@TableName("platform_operation_logs")
public class PlatformOperationLogEntity {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** Platform admin ID who performed the operation */
    @TableField("admin_id")
    private Long adminId;

    /** Admin username at time of operation */
    @TableField("admin_name")
    private String adminName;

    /** Admin role at time of operation (not in Phase 2 schema, nullable) */
    @TableField(exist = false)
    private String adminRole;

    /** Operation type, e.g., CREATE_TENANT, UPDATE_ADMIN */
    @TableField("operation_type")
    private String operationType;

    /** Human-readable description of the operated object */
    @TableField("operation_object")
    private String operationObject;

    /** Extended description (captured in operation_object or operation_desc) */
    @TableField(exist = false)
    private String operationDesc;

    /** HTTP method (not in Phase 2 schema, nullable) */
    @TableField(exist = false)
    private String requestMethod;

    /** Request URL (not in Phase 2 schema, nullable) */
    @TableField(exist = false)
    private String requestUrl;

    /** Request parameters JSON (not in Phase 2 schema, nullable) */
    @TableField(exist = false)
    private String requestParams;

    /** HTTP response status code (not in Phase 2 schema, nullable) */
    @TableField(exist = false)
    private Integer responseStatus;

    /** Client IP address */
    @TableField("ip_address")
    private String ipAddress;

    /** User-Agent header (not in Phase 2 schema, nullable) */
    @TableField(exist = false)
    private String userAgent;

    @com.baomidou.mybatisplus.annotation.TableField(fill = com.baomidou.mybatisplus.annotation.FieldFill.INSERT)
    private LocalDateTime createdAt;
}
