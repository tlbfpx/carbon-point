package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import com.carbonpoint.common.tenant.InterceptorIgnore;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("platform_products")
@InterceptorIgnore
public class ProductEntity {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    /** Unique product code */
    private String code;

    /** Product display name */
    private String name;

    /** Product category: stairs_climbing / walking */
    private String category;

    /** Product description */
    private String description;

    /** Status: 1 = enabled, 0 = disabled */
    private Integer status;

    /** Display sort order */
    private Integer sortOrder;

    private String triggerType;

    private String ruleChainConfig;

    private String defaultConfig;

    @TableLogic
    private Integer deleted;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
