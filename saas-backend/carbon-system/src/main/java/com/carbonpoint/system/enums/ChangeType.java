package com.carbonpoint.system.enums;

import lombok.Getter;

/**
 * Package change type enum.
 */
@Getter
public enum ChangeType {
    ASSIGN("ASSIGN", "分配"),
    CHANGE("CHANGE", "变更"),
    UPGRADE("UPGRADE", "升级"),
    DOWNGRADE("DOWNGRADE", "降级"),
    RENEW("RENEW", "续费");

    private final String code;
    private final String description;

    ChangeType(String code, String description) {
        this.code = code;
        this.description = description;
    }

    public static ChangeType fromCode(String code) {
        for (ChangeType type : values()) {
            if (type.code.equals(code)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown change type: " + code);
    }
}
