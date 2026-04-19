package com.carbonpoint.system.dto.res;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PackageRes {
    private Long id;
    private String code;
    private String name;
    private String description;
    private Boolean status;
    private Integer permissionCount;
    private Long tenantCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<String> permissionCodes;
}
