package com.carbonpoint.system.dto.req;

import lombok.Data;

import jakarta.validation.constraints.NotNull;
import java.util.List;

@Data
public class PlatformRoleUpdatePermissionsReq {
    @NotNull(message = "permissionCodes is required")
    private List<String> permissionCodes;
}
