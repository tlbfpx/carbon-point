package com.carbonpoint.mall.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ProductCreateDTO {
    @NotBlank(message = "商品名称不能为空")
    private String name;
    private String description;
    private String image;

    @NotBlank(message = "商品类型不能为空")
    private String type; // coupon/recharge/privilege

    @NotNull(message = "积分价格不能为空")
    @Min(value = 1, message = "积分价格必须大于0")
    private Integer pointsPrice;

    private Integer stock; // null = unlimited
    private Integer maxPerUser;
    private Integer validityDays;
    private String fulfillmentConfig;
    private Integer sortOrder;
}
