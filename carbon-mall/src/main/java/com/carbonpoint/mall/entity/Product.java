package com.carbonpoint.mall.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

/**
 * 虚拟商品实体。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@TableName("products")
public class Product {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long tenantId;

    private String name;

    private String description;

    private String image;

    /** 商品类型: coupon / recharge / privilege */
    private String type;

    /** 兑换所需积分 */
    private Integer pointsPrice;

    /** 库存（-1 = 无限） */
    private Integer stock;

    /** 每人限兑数量 */
    private Integer maxPerUser;

    /** 有效期天数 */
    private Integer validityDays;

    /** 发放配置（JSON） */
    private String fulfillmentConfig;

    /** 状态: inactive / active / sold_out */
    private String status;

    private Integer sortOrder;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    /** Optimistic locking version for concurrent stock updates */
    @Version
    private Integer version;
}
