package com.carbonpoint.system.service.impl;

import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.system.config.FeatureToggleProperties;
import com.carbonpoint.system.dto.res.MenuItemVO;
import com.carbonpoint.system.dto.res.MenuNode;
import com.carbonpoint.system.entity.*;
import com.carbonpoint.system.enums.ResourceType;
import com.carbonpoint.system.mapper.*;
import com.carbonpoint.system.service.MenuService;
import com.carbonpoint.system.service.ResourceRegistry;
import com.carbonpoint.system.service.TenantResourceConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Implementation of MenuService for dynamic menu generation with feature toggle support.
 * <p>
 * When feature.unified-resources is true: uses resource-driven menu as primary.
 * When false (default): uses old menu implementation.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MenuServiceImpl implements MenuService {

    private final TenantMapper tenantMapper;
    private final ProductMapper productMapper;
    private final ProductFeatureMapper productFeatureMapper;
    private final PackageProductMapper packageProductMapper;
    private final PackageProductFeatureMapper packageProductFeatureMapper;
    private final FeatureMapper featureMapper;
    private final ResourceRegistry resourceRegistry;
    private final TenantResourceConfigService tenantResourceConfigService;
    private final FeatureToggleProperties featureToggleProperties;

    @Override
    public List<MenuItemVO> getTenantMenu() {
        Long tenantId = TenantContext.getTenantId();
        return getTenantMenu(tenantId);
    }

    @Override
    public List<MenuItemVO> getTenantMenu(Long tenantId) {
        if (featureToggleProperties.isUnifiedResources()) {
            log.debug("Feature toggle enabled: using resource-driven menu implementation");
            // Convert MenuNode to MenuItemVO for compatibility
            List<MenuNode> resourceMenu = getResourceDrivenMenu(tenantId);
            return convertToMenuItemVO(resourceMenu);
        } else {
            log.debug("Feature toggle disabled: using old menu implementation");
            return getOldTenantMenu(tenantId);
        }
    }

    private static final Set<String> POINTS_GENERATING_CATEGORIES = Set.of("stair_climbing", "stairs_climbing", "walking");

    /**
     * Old menu implementation (kept for backward compatibility).
     */
    private List<MenuItemVO> getOldTenantMenu(Long tenantId) {
        List<MenuItemVO> menu = new ArrayList<>();
        Set<String> tenantProductCategories = new HashSet<>();

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
                    tenantProductCategories.add(product.getCode());
                    if (product.getCategory() != null) {
                        tenantProductCategories.add(product.getCategory());
                    }
                }
            }
        }

        boolean hasPointsProducts = tenantProductCategories.stream()
                .anyMatch(POINTS_GENERATING_CATEGORIES::contains);

        // Add operations menus — only show points-related menus when tenant has point-generating products
        if (hasPointsProducts) {
            menu.add(buildMenuItem("points", "积分运营", "TrophyOutlined", "/points", 50));
            menu.add(buildMenuItem("point-expiration", "积分过期配置", "ClockCircleOutlined", "/point-expiration", 51));
        }
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

    /**
     * Convert MenuNode list to MenuItemVO list for backward compatibility.
     */
    private List<MenuItemVO> convertToMenuItemVO(List<MenuNode> menuNodes) {
        return menuNodes.stream()
                .map(this::convertNode)
                .collect(Collectors.toList());
    }

    private MenuItemVO convertNode(MenuNode node) {
        MenuItemVO vo = MenuItemVO.builder()
                .key(node.getKey())
                .label(node.getLabel())
                .icon(node.getIcon())
                .path(node.getPath())
                .sortOrder(node.getSortOrder())
                .disabled(node.isDisabled())
                .build();

        if (node.getChildren() != null && !node.getChildren().isEmpty()) {
            vo.setChildren(convertToMenuItemVO(node.getChildren()));
        }

        return vo;
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

    // ========== New resource-driven menu methods ==========

    @Override
    public List<MenuNode> getResourceDrivenMenu() {
        Long tenantId = TenantContext.getTenantId();
        return getResourceDrivenMenu(tenantId);
    }

    @Override
    public List<MenuNode> getResourceDrivenMenu(Long tenantId) {
        log.debug("Building resource-driven menu for tenantId: {}", tenantId);
        List<MenuNode> menu = new ArrayList<>();

        // Add dashboard
        menu.add(buildMenuNode("dashboard", "数据看板", "DashboardOutlined", "/dashboard", 1, null, null));

        // Add members menu
        menu.add(buildMenuNode("members", "员工管理", "TeamOutlined", "/members", 2, null, null));

        // Get tenant's available resources
        Map<String, Object> tenantResources = tenantResourceConfigService.getTenantResources(tenantId);

        // Get function products from ResourceRegistry, filter by tenant's resources
        List<PlatformResource> products = resourceRegistry.getFunctionProducts();
        Set<String> enabledProductCategories = new HashSet<>();
        int sortOrder = 10;
        for (PlatformResource product : products) {
            if ("ENABLED".equals(product.getStatus())) {
                // Check if tenant has this product resource
                String productResourceKey = "product:" + product.getCode();
                Object hasProduct = tenantResources.get(productResourceKey);
                if (Boolean.TRUE.equals(hasProduct)) {
                    menu.add(buildProductMenuNode(product, sortOrder++));
                    enabledProductCategories.add(product.getCode());
                    if (product.getCategory() != null) {
                        enabledProductCategories.add(product.getCategory());
                    }
                }
            }
        }

        boolean hasPointsProducts = enabledProductCategories.stream()
                .anyMatch(POINTS_GENERATING_CATEGORIES::contains);

        // Add operations menus — only show points-related menus when tenant has point-generating products
        if (hasPointsProducts) {
            menu.add(buildMenuNode("points", "积分运营", "TrophyOutlined", "/points", 50, null, null));
            menu.add(buildMenuNode("point-expiration", "积分过期配置", "ClockCircleOutlined", "/point-expiration", 51, null, null));
        }
        menu.add(buildMenuNode("reports", "数据报表", "BarChartOutlined", "/reports", 52, null, null));

        // Add settings group
        MenuNode settingsGroup = buildMenuNode("settings-group", "系统设置", "SettingOutlined", "/settings", 80, null, null);
        List<MenuNode> settingsChildren = new ArrayList<>();
        settingsChildren.add(buildMenuNode("roles", "角色管理", "SafetyOutlined", "/roles", 1, null, null));
        settingsChildren.add(buildMenuNode("branding", "品牌配置", "SkinOutlined", "/branding", 2, null, null));
        settingsChildren.add(buildMenuNode("feature-matrix", "功能点阵", "AppstoreOutlined", "/feature-matrix", 3, null, null));
        settingsChildren.add(buildMenuNode("dict-management", "字典管理", "FileTextOutlined", "/dict-management", 4, null, null));
        settingsChildren.add(buildMenuNode("operation-log", "操作日志", "FileTextOutlined", "/operation-log", 5, null, null));
        settingsGroup.setChildren(settingsChildren);
        menu.add(settingsGroup);

        log.debug("Built resource-driven menu with {} items for tenantId: {}", menu.size(), tenantId);
        return menu.stream()
                .sorted(Comparator.comparingInt(MenuNode::getSortOrder))
                .collect(Collectors.toList());
    }

    private MenuNode buildProductMenuNode(PlatformResource product, int sortOrder) {
        String frontendPath = mapProductCodeToPath(product.getCode());

        return buildMenuNode(
                "product-" + product.getCode(),
                product.getName(),
                product.getIcon() != null ? product.getIcon() : getProductIcon(product.getCategory()),
                frontendPath,
                sortOrder,
                product.getCode(),
                product.getType()
        );
    }

    private MenuNode buildMenuNode(String key, String label, String icon, String path, int sortOrder, String resourceCode, String resourceType) {
        return MenuNode.builder()
                .key(key)
                .label(label)
                .icon(icon)
                .path(path)
                .sortOrder(sortOrder)
                .disabled(false)
                .resourceCode(resourceCode)
                .resourceType(resourceType)
                .build();
    }
}
