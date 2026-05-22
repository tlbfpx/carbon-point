package com.carbonpoint.system.enums;

import lombok.Getter;

/**
 * Package status enum.
 */
@Getter
public enum PackageStatus {
    ACTIVE("ACTIVE", "启用"),
    INACTIVE("INACTIVE", "停用"),
    DEPRECATED("DEPRECATED", "废弃");

    private final String code;
    private final String description;

    PackageStatus(String code, String description) {
        this.code = code;
        this.description = description;
    }

    public static PackageStatus fromCode(String code) {
        for (PackageStatus status : values()) {
            if (status.code.equals(code)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown package status: " + code);
    }

    public static PackageStatus fromBoolean(Boolean bool) {
        return Boolean.TRUE.equals(bool) ? ACTIVE : INACTIVE;
    }

    public Boolean toBoolean() {
        return this == ACTIVE;
    }
}
