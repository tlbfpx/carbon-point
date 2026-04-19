package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("tenant_branding")
public class TenantBranding {
    @TableId(type = IdType.AUTO)
    private Long id;
    
    @TableField("tenant_id")
    private Long tenantId;
    
    @TableField("logo_url")
    private String logoUrl;
    
    @TableField("theme_type")
    private String themeType;
    
    @TableField("preset_theme")
    private String presetTheme;
    
    @TableField("primary_color")
    private String primaryColor;
    
    @TableField("secondary_color")
    private String secondaryColor;
    
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
