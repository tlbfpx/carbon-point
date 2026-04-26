package com.carbonpoint.system.dto.req;

import lombok.Data;

import jakarta.validation.constraints.NotNull;
import java.util.List;

@Data
public class RoleAssignPermissionsReq {
    @NotNull(message = "permissions is required")
    private List<String> permissions;
}
