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
public class TenantPackageRes {
    private Long tenantId;
    private Long packageId;
    private String packageName;
    private String packageCode;
    private String packageDescription;
    private Boolean packageStatus;
    private List<String> permissionCodes;
    private Long operatorId;
    private String operatorType;
    private String reason;
    private LocalDateTime changedAt;
}
