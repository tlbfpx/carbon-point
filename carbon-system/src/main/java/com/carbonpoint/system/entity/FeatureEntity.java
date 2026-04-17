package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Feature entity - platform-level feature flag/config management.
 */
@Data
@TableName("features")
public class FeatureEntity {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    /** Unique feature code */
    private String code;

    /** Feature display name */
    private String name;

    /** Type: permission or config */
    private String type;

    /** Value type: boolean, number, string, json */
    private String valueType;

    /** System default value */
    private String defaultValue;

    /** Feature description */
    private String description;

    /** Group name for organizing features */
    private String group;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
