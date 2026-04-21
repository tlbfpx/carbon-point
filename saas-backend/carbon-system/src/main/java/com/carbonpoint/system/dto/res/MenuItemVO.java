package com.carbonpoint.system.dto.res;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Menu item VO for dynamic menu generation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MenuItemVO {
    private String key;
    private String label;
    private String icon;
    private String path;
    private Integer sortOrder;
    private List<MenuItemVO> children;
    private boolean disabled;
}
