package com.carbonpoint.system.dto.req;

import lombok.Data;
import java.util.List;

@Data
public class PackagePermissionsUpdateReq {
    private List<String> permissionCodes;
}
