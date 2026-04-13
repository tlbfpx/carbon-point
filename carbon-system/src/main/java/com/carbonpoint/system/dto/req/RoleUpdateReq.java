package com.carbonpoint.system.dto.req;

import lombok.Data;
import java.util.List;

@Data
public class RoleUpdateReq {
    private String name;
    private List<String> permissionCodes;
}
