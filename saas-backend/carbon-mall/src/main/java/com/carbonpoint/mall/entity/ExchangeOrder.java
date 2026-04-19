package com.carbonpoint.mall.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

/**
 * 兑换订单实体。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@TableName("exchange_orders")
public class ExchangeOrder {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long tenantId;

    private Long userId;

    private Long productId;

    /** 商品名称（冗余存储） */
    private String productName;

    /** 商品类型（冗余） */
    private String productType;

    /** 消耗积分 */
    private Integer pointsSpent;

    /** 券码（coupon 类型） */
    private String couponCode;

    /** 订单状态: pending / fulfilled / used / expired / cancelled */
    private String orderStatus;

    /** 卡券过期时间 */
    private LocalDateTime expiresAt;

    /** 发放时间 */
    private LocalDateTime fulfilledAt;

    /** 核销时间 */
    private LocalDateTime usedAt;

    /** 核销方式: admin / self */
    private String usedBy;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    @TableLogic
    private Integer deleted;
}
