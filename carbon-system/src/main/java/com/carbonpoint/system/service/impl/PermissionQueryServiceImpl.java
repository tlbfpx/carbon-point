package com.carbonpoint.system.service.impl;

import com.carbonpoint.system.dto.res.PermissionTreeRes;
import com.carbonpoint.system.entity.Permission;
import com.carbonpoint.system.mapper.PermissionMapper;
import com.carbonpoint.system.security.PermissionService;
import com.carbonpoint.system.service.PermissionQueryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class PermissionQueryServiceImpl implements PermissionQueryService {

    @Autowired
    private PermissionMapper permissionMapper;

    @Autowired
    private PermissionService permissionService;

    @Override
    public List<PermissionTreeRes> getPermissionTree() {
        List<Permission> all = permissionMapper.selectList(null);

        // Group by module (DDL column: module)
        Map<String, List<Permission>> byModule = all.stream()
                .collect(Collectors.groupingBy(Permission::getModule));

        return byModule.entrySet().stream()
                .sorted(Comparator.comparing(e -> e.getValue().get(0).getSortOrder()))
                .map(entry -> {
                    String moduleCode = entry.getKey();
                    List<Permission> perms = entry.getValue();
                    Permission first = perms.get(0);

                    // Module-level node
                    PermissionTreeRes moduleNode = PermissionTreeRes.builder()
                            .code(moduleCode)
                            .name(first.getDescription())
                            .type("module")
                            .sortOrder(first.getSortOrder())
                            .children(new ArrayList<>())
                            .build();

                    List<PermissionTreeRes> children = perms.stream()
                            .sorted(Comparator.comparing(Permission::getSortOrder))
                            .map(p -> PermissionTreeRes.builder()
                                    .code(p.getCode())
                                    .name(p.getDescription())
                                    .type(p.getOperation())
                                    .sortOrder(p.getSortOrder())
                                    .children(Collections.emptyList())
                                    .build())
                            .toList();

                    moduleNode.setChildren(children);
                    return moduleNode;
                }).toList();
    }

    @Override
    public List<String> getMyPermissions(Long userId) {
        return permissionService.getUserPermissions(userId);
    }
}
