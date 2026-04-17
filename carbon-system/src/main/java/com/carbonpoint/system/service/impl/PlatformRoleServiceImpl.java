package com.carbonpoint.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.carbonpoint.system.entity.PlatformRoleEntity;
import com.carbonpoint.system.mapper.PlatformRoleMapper;
import com.carbonpoint.system.service.PlatformRoleService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PlatformRoleServiceImpl implements PlatformRoleService {

    private final PlatformRoleMapper roleMapper;
    private final ObjectMapper objectMapper;

    @Override
    public List<PlatformRoleEntity> list() {
        return roleMapper.selectList(new LambdaQueryWrapper<>());
    }

    @Override
    public PlatformRoleEntity getById(Long id) {
        return roleMapper.selectById(id);
    }

    @Override
    public PlatformRoleEntity create(PlatformRoleEntity entity) {
        roleMapper.insert(entity);
        return entity;
    }

    @Override
    public PlatformRoleEntity update(Long id, PlatformRoleEntity entity) {
        entity.setId(id);
        roleMapper.updateById(entity);
        return entity;
    }

    @Override
    public void delete(Long id) {
        roleMapper.deleteById(id);
    }

    @Override
    public List<String> getPermissionsById(Long id) {
        PlatformRoleEntity role = roleMapper.selectById(id);
        if (role == null || role.getPermissionCodes() == null) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(role.getPermissionCodes(), new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    @Override
    public void updatePermissions(Long id, List<String> permissionCodes) {
        PlatformRoleEntity role = roleMapper.selectById(id);
        if (role == null) return;
        try {
            role.setPermissionCodes(objectMapper.writeValueAsString(permissionCodes));
        } catch (Exception e) {
            role.setPermissionCodes("[]");
        }
        roleMapper.updateById(role);
    }
}
