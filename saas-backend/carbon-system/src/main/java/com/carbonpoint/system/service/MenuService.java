package com.carbonpoint.system.service;

import com.carbonpoint.system.dto.res.MenuItemVO;

import java.util.List;

/**
 * Service for dynamic menu generation based on tenant package and products.
 */
public interface MenuService {

    /**
     * Get dynamic menu for current tenant.
     * @return menu tree
     */
    List<MenuItemVO> getTenantMenu();

    /**
     * Get dynamic menu for a specific tenant.
     * @param tenantId tenant ID
     * @return menu tree
     */
    List<MenuItemVO> getTenantMenu(Long tenantId);
}
