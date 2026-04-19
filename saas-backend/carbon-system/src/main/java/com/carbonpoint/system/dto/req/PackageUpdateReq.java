package com.carbonpoint.system.dto.req;

import lombok.Data;
import java.util.List;

@Data
public class PackageUpdateReq {
    private String code;
    private String name;
    private String description;
    private Boolean status;
}
