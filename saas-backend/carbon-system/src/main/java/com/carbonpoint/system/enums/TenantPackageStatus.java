package com.carbonpoint.system.enums;

import lombok.Getter;

/**
 * Tenant package status enum.
 */
@Getter
public enum TenantPackageStatus {
    ACTIVE("ACTIVE", "正常"),
    EXPIRED("EXPIRED", "已过期"),
    CANCELLED("CANCELLED", "已取消");

    private final String code;
    private final String description;

    TenantPackageStatus(String code, String description) {
        this.code = code;
        this.description = description;
    }

    public static TenantPackageStatus fromCode(String code) {
        for (TenantPackageStatus status : values()) {
            if (status.code.equals(code)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown tenant package status: " + code);
    }
}
