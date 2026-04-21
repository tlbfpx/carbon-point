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

    @Override
    public List<MenuItemVO> getTenantMenu() {
        Long tenantId = TenantContext.getTenantId();
        return getTenantMenu(tenantId);
    }

    @Override
    public List<MenuItemVO> getTenantMenu(Long tenantId) {
        List<MenuItemVO> menu = new ArrayList<>();

        // Add dashboard
        menu.add(buildMenuItem("dashboard", "工作台", "DashboardOutlined", "/dashboard", 1));

        // Get tenant's package and enabled products
        Tenant tenant = tenantMapper.selectById(tenantId);
        if (tenant != null && tenant.getPackageId() != null) {
            // Add product menus based on package
            List<PackageProductEntity> packageProducts = packageProductMapper.selectByPackageId(tenant.getPackageId());
            for (PackageProductEntity pp : packageProducts) {
                ProductEntity product = productMapper.selectById(pp.getProductId());
                if (product != null && product.getStatus() == 1) {
                    menu.add(buildProductMenu(product, pp, tenant.getPackageId()));
                }
            }
        }

        // Add other standard menus
        menu.add(buildMenuItem("mall", "积分商城", "ShoppingOutlined", "/mall", 50));
        menu.add(buildMenuItem("users", "用户管理", "UserOutlined", "/users", 60));
        menu.add(buildMenuItem("reports", "数据报表", "BarChartOutlined", "/reports", 70));
        menu.add(buildMenuItem("settings", "系统设置", "SettingOutlined", "/settings", 80));

        return menu.stream()
                .sorted(Comparator.comparingInt(MenuItemVO::getSortOrder))
                .collect(Collectors.toList());
    }

    private MenuItemVO buildProductMenu(ProductEntity product, PackageProductEntity pp, Long packageId) {
        MenuItemVO productMenu = buildMenuItem(
                "product-" + product.getCode(),
                product.getName(),
                getProductIcon(product.getCategory()),
                "/product/" + product.getCode(),
                pp.getSortOrder() + 10
        );

        // Add child menus based on enabled features
        List<MenuItemVO> children = new ArrayList<>();
        children.add(buildMenuItem("records", "打卡记录", "FileTextOutlined", "/product/" + product.getCode() + "/records", 1));

        // Get enabled features for this product in the package
        List<PackageProductFeatureEntity> features = packageProductFeatureMapper.selectByPackageIdAndProductId(packageId, pp.getProductId());
        for (PackageProductFeatureEntity ppf : features) {
            if (ppf.getIsEnabled()) {
                String featureKey = ppf.getFeatureId();
                children.add(buildFeatureMenu(featureKey, product.getCode()));
            }
        }

        if (!children.isEmpty()) {
            productMenu.setChildren(children);
        }

        return productMenu;
    }

    private MenuItemVO buildFeatureMenu(String featureKey, String productCode) {
        return switch (featureKey) {
            case "time_slot" -> buildMenuItem("time-slot", "时段配置", "ClockCircleOutlined",
                    "/product/" + productCode + "/time-slot", 2);
            case "special_date" -> buildMenuItem("special-date", "特殊日期配置", "CalendarOutlined",
                    "/product/" + productCode + "/special-date", 3);
            case "consecutive_reward" -> buildMenuItem("consecutive-reward", "连续打卡奖励", "TrophyOutlined",
                    "/product/" + productCode + "/consecutive-reward", 4);
            case "daily_cap" -> buildMenuItem("daily-cap", "积分规则", "NumberOutlined",
                    "/product/" + productCode + "/daily-cap", 5);
            default -> buildMenuItem(featureKey, featureKey, "AppstoreOutlined",
                    "/product/" + productCode + "/" + featureKey, 99);
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
            case "stairs_climbing" -> "UpOutlined";
            case "walking" -> "EnvironmentOutlined";
            default -> "AppstoreOutlined";
        };
    }
}
