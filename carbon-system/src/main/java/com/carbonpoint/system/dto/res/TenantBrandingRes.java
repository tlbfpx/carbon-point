package com.carbonpoint.system.dto.res;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class TenantBrandingRes {
    private Long id;
    private Long tenantId;
    private String logoUrl;
    private String themeType;
    private String presetTheme;
    private String primaryColor;
    private String secondaryColor;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
