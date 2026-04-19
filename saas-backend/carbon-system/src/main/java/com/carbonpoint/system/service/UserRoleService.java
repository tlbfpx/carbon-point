package com.carbonpoint.system.service;

import com.carbonpoint.system.dto.res.RoleDetailRes;

import java.util.List;

public interface UserRoleService {
    List<RoleDetailRes> getUserRoles(Long userId);
    void assignRoles(Long userId, List<Long> roleIds);
}
