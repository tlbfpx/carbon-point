package com.carbonpoint.system.service;

import java.util.Map;
import java.util.Optional;

/**
 * Tenant resource configuration service (phase 1 reference implementation).
 * Provides non-invasive access to tenant resources using existing Feature/Product tables.
 */
public interface TenantResourceConfigService {

    /**
     * Get all configured resources for a tenant.
     * Returns a map of resource codes to their configuration values.
     *
     * @param tenantId the tenant ID
     * @return map of resource code to config value
     */
    Map<String, Object> getTenantResources(Long tenantId);

    /**
     * Get a specific resource configuration for a tenant.
     *
     * @param tenantId     the tenant ID
     * @param resourceCode the resource code (feature code or product code)
     * @return optional configuration value
     */
    Optional<Object> getResourceConfig(Long tenantId, String resourceCode);
}
