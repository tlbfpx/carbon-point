package com.carbonpoint.system.dto.req;

import lombok.Data;

@Data
public class TenantBrandingUpdateReq {
    /**
     * 主题类型：preset（预设主题）、custom（自定义主题）
     */
    private String themeType;
    
    /**
     * 预设主题名称：default-blue、tech-green、vibrant-orange、deep-purple
     */
    private String presetTheme;
    
    /**
     * 自定义主题主色（HEX格式）
     */
    private String primaryColor;
    
    /**
     * 自定义主题辅助色（HEX格式）
     */
    private String secondaryColor;
}
