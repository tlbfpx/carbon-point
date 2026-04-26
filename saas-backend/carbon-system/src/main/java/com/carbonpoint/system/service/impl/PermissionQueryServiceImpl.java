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

        if (all == null || all.isEmpty()) {
            return Collections.emptyList();
        }

        // Group by module (DDL column: module)
        Map<String, List<Permission>> byModule = all.stream()
                .collect(Collectors.groupingBy(Permission::getModule));

        return byModule.entrySet().stream()
                .sorted(Comparator.comparing(e -> e.getValue().get(0).getSortOrder()))
                .map(entry -> {
                    String moduleCode = entry.getKey();
                    List<Permission> perms = entry.getValue();
                    Permission first = perms.get(0);

                    // Module-level node - explicitly set both code/name and key/label
                    PermissionTreeRes moduleNode = new PermissionTreeRes();
                    moduleNode.setCode(moduleCode);
                    moduleNode.setName(first.getDescription());
                    moduleNode.setKey(moduleCode);
                    moduleNode.setLabel(first.getDescription());
                    moduleNode.setType("module");
                    moduleNode.setSortOrder(first.getSortOrder());
                    moduleNode.setChildren(new ArrayList<>());

                    List<PermissionTreeRes> children = perms.stream()
                            .sorted(Comparator.comparing(Permission::getSortOrder))
                            .map(p -> {
                                PermissionTreeRes child = new PermissionTreeRes();
                                child.setCode(p.getCode());
                                child.setName(p.getDescription());
                                child.setKey(p.getCode());
                                child.setLabel(p.getDescription());
                                child.setType(p.getOperation());
                                child.setSortOrder(p.getSortOrder());
                                child.setChildren(Collections.emptyList());
                                return child;
                            })
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
