package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

/**
 * 企业商品货架实体。
 * 记录企业从平台商品池中选择上架的商品。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@TableName("tenant_product_shelf")
public class TenantProductShelfEntity {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 租户ID */
    private Long tenantId;

    /** 平台商品池中的商品ID */
    private Long platformMallProductId;

    /** 货架状态: 0=下架, 1=上架 */
    private Integer shelfStatus;

    /** 上架时间 */
    private LocalDateTime shelfAt;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
