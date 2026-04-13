package com.carbonpoint.system.dto.req;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class TenantCreateReq {
    private String name;
    private String logoUrl;
    private String packageType;
    private Integer maxUsers;
    private LocalDateTime expireTime;
}
