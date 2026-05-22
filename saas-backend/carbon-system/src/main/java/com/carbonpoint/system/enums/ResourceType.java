package com.carbonpoint.system.enums;

import lombok.Getter;

/**
 * Platform resource type enum.
 */
@Getter
public enum ResourceType {
    FUNCTION_PRODUCT("FUNCTION_PRODUCT", "功能产品"),
    MALL_PRODUCT("MALL_PRODUCT", "商城商品"),
    FEATURE("FEATURE", "功能点"),
    PERMISSION_GROUP("PERMISSION_GROUP", "权限组");

    private final String code;
    private final String description;

    ResourceType(String code, String description) {
        this.code = code;
        this.description = description;
    }

    public static ResourceType fromCode(String code) {
        for (ResourceType type : values()) {
            if (type.code.equals(code)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown resource type: " + code);
    }
}
