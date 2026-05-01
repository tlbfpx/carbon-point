package com.carbonpoint.system.dto.res;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Menu node DTO for resource-driven menu generation.
 * <p>
 * This is a new DTO for the unified resource architecture -
 * it doesn't affect existing MenuItemVO usage.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MenuNode {
    private String key;
    private String label;
    private String icon;
    private String path;
    private Integer sortOrder;
    private List<MenuNode> children;
    private boolean disabled;
    private String resourceCode;
    private String resourceType;
}
