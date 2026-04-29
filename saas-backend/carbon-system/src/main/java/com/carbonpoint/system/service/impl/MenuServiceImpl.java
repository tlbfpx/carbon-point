package com.carbonpoint.system.service.impl;

import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.system.dto.res.MenuItemVO;
import com.carbonpoint.system.entity.*;
import com.carbonpoint.system.mapper.*;
import com.carbonpoint.system.service.MenuService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Implementation of MenuService for dynamic menu generation.
 */
@Service
@RequiredArgsConstructor
public class MenuServiceImpl implements MenuService {

    private final TenantMapper tenantMapper;
    private final ProductMapper productMapper;
    private final ProductFeatureMapper productFeatureMapper;
    private final PackageProductMapper packageProductMapper;
    private final PackageProductFeatureMapper packageProductFeatureMapper;
    private final FeatureMapper featureMapper;

    @Override
    public List<MenuItemVO> getTenantMenu() {
        Long tenantId = TenantContext.getTenantId();
        return getTenantMenu(tenantId);
    }

    @Override
    public List<MenuItemVO> getTenantMenu(Long tenantId) {
        List<MenuItemVO> menu = new ArrayList<>();

        // Add dashboard
        menu.add(buildMenuItem("dashboard", "数据看板", "DashboardOutlined", "/dashboard", 1));

        // Add members menu
        menu.add(buildMenuItem("members", "员工管理", "TeamOutlined", "/members", 2));

        // Get tenant's package and enabled products
        Tenant tenant = tenantMapper.selectById(tenantId);
        if (tenant != null && tenant.getPackageId() != null) {
            // Add product menus based on package
            List<PackageProductEntity> packageProducts = packageProductMapper.selectByPackageId(tenant.getPackageId());
            int sortOrder = 10;
            for (PackageProductEntity pp : packageProducts) {
                ProductEntity product = productMapper.selectById(pp.getProductId());
                if (product != null && product.getStatus() == 1) {
                    menu.add(buildProductMenu(product, pp, sortOrder++));
                }
            }
        }

        // Add operations menus
        menu.add(buildMenuItem("points", "积分运营", "TrophyOutlined", "/points", 50));
        menu.add(buildMenuItem("point-expiration", "积分过期配置", "ClockCircleOutlined", "/point-expiration", 51));
        menu.add(buildMenuItem("reports", "数据报表", "BarChartOutlined", "/reports", 52));

        // Add settings group
        MenuItemVO settingsGroup = buildMenuItem("settings-group", "系统设置", "SettingOutlined", "/settings", 80);
        List<MenuItemVO> settingsChildren = new ArrayList<>();
        settingsChildren.add(buildMenuItem("roles", "角色管理", "SafetyOutlined", "/roles", 1));
        settingsChildren.add(buildMenuItem("branding", "品牌配置", "SkinOutlined", "/branding", 2));
        settingsChildren.add(buildMenuItem("feature-matrix", "功能点阵", "AppstoreOutlined", "/feature-matrix", 3));
        settingsChildren.add(buildMenuItem("dict-management", "字典管理", "FileTextOutlined", "/dict-management", 4));
        settingsChildren.add(buildMenuItem("operation-log", "操作日志", "FileTextOutlined", "/operation-log", 5));
        settingsGroup.setChildren(settingsChildren);
        menu.add(settingsGroup);

        return menu.stream()
                .sorted(Comparator.comparingInt(MenuItemVO::getSortOrder))
                .collect(Collectors.toList());
    }

    private MenuItemVO buildProductMenu(ProductEntity product, PackageProductEntity pp, int sortOrder) {
        // Map product codes to correct frontend paths
        String frontendPath = mapProductCodeToPath(product.getCode());

        MenuItemVO productMenu = buildMenuItem(
                "product-" + product.getCode(),
                product.getName(),
                getProductIcon(product.getCategory()),
                frontendPath,
                sortOrder
        );

        return productMenu;
    }

    private String mapProductCodeToPath(String productCode) {
        return switch (productCode) {
            case "stair_climbing", "stairs_basic", "stairs_pro" -> "/product/stair-climbing";
            case "walking", "walking_basic", "walking_pro" -> "/product/walking";
            case "quiz" -> "/product/quiz";
            case "mall" -> "/product/mall";
            default -> "/product/" + productCode;
        };
    }

    private MenuItemVO buildMenuItem(String key, String label, String icon, String path, int sortOrder) {
        return MenuItemVO.builder()
                .key(key)
                .label(label)
                .icon(icon)
                .path(path)
                .sortOrder(sortOrder)
                .disabled(false)
                .build();
    }

    private String getProductIcon(String category) {
        return switch (category) {
            case "stairs_climbing" -> "RiseOutlined";
            case "walking" -> "WomanOutlined";
            case "quiz" -> "BookOutlined";
            case "mall" -> "ShopOutlined";
            default -> "AppstoreOutlined";
        };
    }
}
