package com.carbonpoint.system.dto.res;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Feature response DTO.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeatureRes {

    private String id;
    private String code;
    private String name;
    private String type;
    private String valueType;
    private String defaultValue;
    private String description;
    private String group;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
