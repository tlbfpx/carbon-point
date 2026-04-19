package com.carbonpoint.system.service;

import com.carbonpoint.system.entity.PlatformRoleEntity;
import java.util.List;

public interface PlatformRoleService {
    List<PlatformRoleEntity> list();
    PlatformRoleEntity getById(Long id);
    PlatformRoleEntity create(PlatformRoleEntity entity);
    PlatformRoleEntity update(Long id, PlatformRoleEntity entity);
    void delete(Long id);
    List<String> getPermissionsById(Long id);
    void updatePermissions(Long id, List<String> permissionCodes);
}
