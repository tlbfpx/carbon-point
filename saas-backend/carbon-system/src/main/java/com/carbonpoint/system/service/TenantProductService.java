package com.carbonpoint.system.service;

import com.carbonpoint.system.dto.res.TenantProductRes;

import java.util.List;

/**
 * Service for querying tenant's available products based on their package.
 */
public interface TenantProductService {

    /**
     * Get all products available to a tenant, including enabled feature configurations.
     *
     * @param tenantId the tenant ID
     * @return list of products with their feature configs
     */
    List<TenantProductRes> getTenantProducts(Long tenantId);
}
