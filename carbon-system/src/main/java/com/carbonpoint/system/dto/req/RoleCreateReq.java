package com.carbonpoint.system.dto.req;

import lombok.Data;
import java.util.List;

@Data
public class RoleCreateReq {
    private String name;
    private List<String> permissionCodes;
    /**
     * Role type: 'operator' or 'custom'. 'super_admin' cannot be created via this endpoint.
     */
    private String roleType;
}
