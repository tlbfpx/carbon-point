package com.carbonpoint.system.service.impl;

import com.carbonpoint.system.dto.res.TenantProductRes;
import com.carbonpoint.system.service.TenantProductService;
import com.carbonpoint.system.service.TenantResourceConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Tenant resource configuration service implementation (phase 1 reference).
 * Uses existing TenantProductService to build resource config from Feature/Product tables.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TenantResourceConfigServiceImpl implements TenantResourceConfigService {

    private final TenantProductService tenantProductService;

    @Override
    public Map<String, Object> getTenantResources(Long tenantId) {
        log.debug("Getting tenant resources for tenantId: {}", tenantId);

        Map<String, Object> resources = new LinkedHashMap<>();

        // Get tenant products and their feature configs
        List<TenantProductRes> products = tenantProductService.getTenantProducts(tenantId);

        for (TenantProductRes product : products) {
            // Add product as a resource
            resources.put("product:" + product.getProductCode(), true);

            // Add feature configs
            Map<String, String> featureConfig = product.getFeatureConfig();
            if (featureConfig != null) {
                for (Map.Entry<String, String> entry : featureConfig.entrySet()) {
                    resources.put("feature:" + entry.getKey(), parseValue(entry.getValue()));
                }
            }
        }

        log.debug("Found {} resources for tenantId: {}", resources.size(), tenantId);
        return Collections.unmodifiableMap(resources);
    }

    @Override
    public Optional<Object> getResourceConfig(Long tenantId, String resourceCode) {
        log.debug("Getting resource config for tenantId: {}, resourceCode: {}", tenantId, resourceCode);

        Map<String, Object> resources = getTenantResources(tenantId);
        return Optional.ofNullable(resources.get(resourceCode));
    }

    /**
     * Parse string config value to appropriate type.
     */
    private Object parseValue(String value) {
        if (value == null || value.isEmpty()) {
            return "";
        }

        // Try boolean
        if ("true".equalsIgnoreCase(value)) {
            return true;
        }
        if ("false".equalsIgnoreCase(value)) {
            return false;
        }

        // Try integer
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            // Ignore
        }

        // Try long
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException e) {
            // Ignore
        }

        // Try double
        try {
            return Double.parseDouble(value);
        } catch (NumberFormatException e) {
            // Ignore
        }

        // Default to string
        return value;
    }
}
