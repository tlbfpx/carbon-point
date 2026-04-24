package com.carbonpoint.system.dto.req;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class BasicConfigUpdateReq {
    @NotBlank(message = "basicConfig不能为空")
    private String basicConfig;
}
