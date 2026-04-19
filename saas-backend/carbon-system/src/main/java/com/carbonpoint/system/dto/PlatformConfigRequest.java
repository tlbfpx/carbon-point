package com.carbonpoint.system.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Platform config request DTO.
 */
@Data
public class PlatformConfigRequest {

    @NotBlank(message = "配置值不能为空")
    private String configValue;

    private String description;
}
