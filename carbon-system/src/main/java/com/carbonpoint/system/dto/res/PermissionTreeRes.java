package com.carbonpoint.system.dto.res;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PermissionTreeRes {
    private String code;
    private String name;
    private String type;
    private String path;
    private Integer sortOrder;
    private List<PermissionTreeRes> children;
}
