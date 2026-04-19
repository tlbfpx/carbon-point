package com.carbonpoint.system.service;

import com.carbonpoint.system.dto.res.*;

import java.util.List;

public interface PermissionQueryService {
    List<PermissionTreeRes> getPermissionTree();
    List<String> getMyPermissions(Long userId);
}
