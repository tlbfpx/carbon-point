package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Platform configuration entity.
 */
@Data
@TableName("platform_configs")
public class PlatformConfigEntity {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** Unique config key */
    private String configKey;

    /** Config value (usually JSON string) */
    private String configValue;

    /** Description of the config */
    private String description;

    @com.baomidou.mybatisplus.annotation.TableField(fill = com.baomidou.mybatisplus.annotation.FieldFill.INSERT)
    private LocalDateTime createdAt;

    @com.baomidou.mybatisplus.annotation.TableField(fill = com.baomidou.mybatisplus.annotation.FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    /** Config key constants */
    public static final String KEY_DEFAULT_POINT_RULES_TEMPLATE = "default_point_rules_template";
    public static final String KEY_FEATURE_FLAGS = "feature_flags";
}
