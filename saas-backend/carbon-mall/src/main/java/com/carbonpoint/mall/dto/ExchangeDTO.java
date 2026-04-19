package com.carbonpoint.mall.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ExchangeDTO {
    @NotNull(message = "商品ID不能为空")
    private Long productId;

    private String rechargePhone; // for recharge type
}
