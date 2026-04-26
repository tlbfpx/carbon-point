package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

/**
 * 平台商品池实体。
 * 平台管理员维护的全局虚拟商品，企业可从中选购上架到自己的积分商城。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@TableName("platform_mall_products")
public class PlatformMallProductEntity {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 商品名称 */
    private String name;

    /** 商品类型: coupon / recharge / privilege */
    private String type;

    /** 基准价格（分），企业实际积分价格 = priceCents * exchangeRate */
    private Integer priceCents;

    /** 商品描述 */
    private String description;

    /** 商品图片URL */
    private String imageUrl;

    /** 发放配置（JSON） */
    private String fulfillmentConfig;

    /** 状态: 0=下架, 1=上架 */
    private Integer status;

    @TableLogic
    private Integer deleted;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
