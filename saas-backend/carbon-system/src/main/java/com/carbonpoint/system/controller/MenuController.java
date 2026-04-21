package com.carbonpoint.system.controller;

import com.carbonpoint.common.result.Result;
import com.carbonpoint.system.dto.res.MenuItemVO;
import com.carbonpoint.system.service.MenuService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Dynamic menu controller for enterprise admin.
 * Menu is generated based on tenant's package and enabled products/features.
 */
@RestController
@RequestMapping("/api/menus")
@RequiredArgsConstructor
@Tag(name = "动态菜单", description = "企业管理后台动态菜单接口")
public class MenuController {

    private final MenuService menuService;

    /**
     * Get dynamic menu for current tenant.
     * GET /api/menus
     */
    @GetMapping
    @Operation(summary = "获取当前租户的动态菜单")
    public Result<List<MenuItemVO>> getMenus() {
        return Result.success(menuService.getTenantMenu());
    }
}
