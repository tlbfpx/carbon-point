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
public class RoleDetailRes {
    private Long id;
    private Long tenantId;
    private String name;
    private Boolean isPreset;
    private String roleType;
    private Boolean isEditable;
    private List<String> permissionCodes;
    private LocalDateTime createdAt;
}
