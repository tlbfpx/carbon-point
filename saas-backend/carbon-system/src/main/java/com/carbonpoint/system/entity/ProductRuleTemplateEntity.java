package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.carbonpoint.common.tenant.InterceptorIgnore;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("product_rule_templates")
@InterceptorIgnore
public class ProductRuleTemplateEntity {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    private String productId;
    private String ruleType;
    private String name;
    private String config;
    private Integer enabled;
    private Integer sortOrder;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
