package com.carbonpoint.system.dto.req;

import lombok.Data;

@Data
public class TenantPackageChangeReq {
    private Long packageId;
    private String reason;
}
