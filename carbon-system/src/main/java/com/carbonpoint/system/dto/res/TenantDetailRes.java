package com.carbonpoint.system.dto.res;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TenantDetailRes {
    private Long id;
    private String name;
    private String logoUrl;
    private String packageType;
    private Integer maxUsers;
    private String status;
    private LocalDateTime expireTime;
    private Integer userCount;
    private LocalDateTime createdAt;
}
