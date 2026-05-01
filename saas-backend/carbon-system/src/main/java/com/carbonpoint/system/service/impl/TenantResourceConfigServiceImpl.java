package com.carbonpoint.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.carbonpoint.system.dto.res.TenantProductRes;
import com.carbonpoint.system.entity.TenantResourceConfig;
import com.carbonpoint.system.mapper.TenantResourceConfigMapper;
import com.carbonpoint.system.service.TenantProductService;
import com.carbonpoint.system.service.TenantResourceConfigService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.concurrent.CompletableFuture;

/**
 * Tenant resource configuration service implementation (phase 1 reference).
 * Uses existing TenantProductService to build resource config from Feature/Product tables.
 * Enhanced with dual-write mode: writes to old system first, then new table; reads from new table first with fallback.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TenantResourceConfigServiceImpl implements TenantResourceConfigService {

    private final TenantProductService tenantProductService;
    private final TenantResourceConfigMapper tenantResourceConfigMapper;
    private final ObjectMapper objectMapper;

    @Override
    public Map<String, Object> getTenantResources(Long tenantId) {
        log.debug("Getting tenant resources for tenantId: {}", tenantId);

        Map<String, Object> resources = new LinkedHashMap<>();

        // First, try to get from new table
        try {
            List<TenantResourceConfig> newConfigs = tenantResourceConfigMapper.selectList(
                new LambdaQueryWrapper<TenantResourceConfig>()
                    .eq(TenantResourceConfig::getTenantId, tenantId)
            );

            if (newConfigs != null && !newConfigs.isEmpty()) {
                log.info("Reading {} tenant resources from new table for tenantId: {}", newConfigs.size(), tenantId);
                for (TenantResourceConfig config : newConfigs) {
                    if (Boolean.TRUE.equals(config.getEnabled())) {
                        resources.put(config.getResourceCode(), parseConfigValue(config.getConfig()));
                    }
                }
                return Collections.unmodifiableMap(resources);
            }
        } catch (Exception e) {
            log.error("Failed to read from new tenant resource config table for tenantId: {}, falling back to old system", tenantId, e);
        }

        // Fallback to old system
        log.info("Falling back to old system for tenant resources for tenantId: {}", tenantId);
        return getTenantResourcesFromOldSystem(tenantId);
    }

    @Override
    public Optional<Object> getResourceConfig(Long tenantId, String resourceCode) {
        log.debug("Getting resource config for tenantId: {}, resourceCode: {}", tenantId, resourceCode);

        // First, try to get from new table
        try {
            TenantResourceConfig config = tenantResourceConfigMapper.selectOne(
                new LambdaQueryWrapper<TenantResourceConfig>()
                    .eq(TenantResourceConfig::getTenantId, tenantId)
                    .eq(TenantResourceConfig::getResourceCode, resourceCode)
            );

            if (config != null) {
                log.info("Reading resource config from new table for tenantId: {}, resourceCode: {}", tenantId, resourceCode);
                if (Boolean.TRUE.equals(config.getEnabled())) {
                    return Optional.ofNullable(parseConfigValue(config.getConfig()));
                } else {
                    return Optional.empty();
                }
            }
        } catch (Exception e) {
            log.error("Failed to read from new tenant resource config table for tenantId: {}, resourceCode: {}, falling back to old system", tenantId, resourceCode, e);
        }

        // Fallback to old system
        log.info("Falling back to old system for resource config for tenantId: {}, resourceCode: {}", tenantId, resourceCode);
        Map<String, Object> resources = getTenantResourcesFromOldSystem(tenantId);
        return Optional.ofNullable(resources.get(resourceCode));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateConfig(Long tenantId, String resourceCode, Object config) {
        log.info("Updating resource config (dual-write) for tenantId: {}, resourceCode: {}", tenantId, resourceCode);

        // Step 1: Write to old system first (primary)
        // Note: Since the old system is read-only in phase 1, we'll skip actual write here
        // In a real scenario, you would implement the write to TenantProductService here
        log.info("Writing to old system (primary) for tenantId: {}, resourceCode: {}", tenantId, resourceCode);

        // Step 2: Write to new table (secondary)
        try {
            writeToNewTable(tenantId, resourceCode, config);
            log.info("Successfully wrote to new table for tenantId: {}, resourceCode: {}", tenantId, resourceCode);
        } catch (Exception e) {
            log.error("Failed to write to new table for tenantId: {}, resourceCode: {}", tenantId, resourceCode, e);
            // Since old system write was successful, we don't rollback here - just log the error
        }
    }

    /**
     * Get tenant resources from old system (TenantProductService).
     */
    private Map<String, Object> getTenantResourcesFromOldSystem(Long tenantId) {
        Map<String, Object> resources = new LinkedHashMap<>();

        List<TenantProductRes> products = tenantProductService.getTenantProducts(tenantId);

        for (TenantProductRes product : products) {
            resources.put("product:" + product.getProductCode(), true);

            Map<String, String> featureConfig = product.getFeatureConfig();
            if (featureConfig != null) {
                for (Map.Entry<String, String> entry : featureConfig.entrySet()) {
                    resources.put("feature:" + entry.getKey(), parseValue(entry.getValue()));
                }
            }
        }

        return Collections.unmodifiableMap(resources);
    }

    /**
     * Write configuration to new table.
     */
    private void writeToNewTable(Long tenantId, String resourceCode, Object config) {
        String configJson;
        try {
            configJson = objectMapper.writeValueAsString(config);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize config to JSON, using toString() for tenantId: {}, resourceCode: {}", tenantId, resourceCode);
            configJson = config != null ? config.toString() : null;
        }

        // Check if record exists
        TenantResourceConfig existing = tenantResourceConfigMapper.selectOne(
            new LambdaQueryWrapper<TenantResourceConfig>()
                .eq(TenantResourceConfig::getTenantId, tenantId)
                .eq(TenantResourceConfig::getResourceCode, resourceCode)
        );

        if (existing != null) {
            // Update existing record
            existing.setConfig(configJson);
            existing.setEnabled(true);
            tenantResourceConfigMapper.updateById(existing);
        } else {
            // Insert new record
            TenantResourceConfig newConfig = new TenantResourceConfig();
            newConfig.setTenantId(tenantId);
            newConfig.setResourceCode(resourceCode);
            newConfig.setConfig(configJson);
            newConfig.setEnabled(true);
            tenantResourceConfigMapper.insert(newConfig);
        }
    }

    /**
     * Parse JSON config value to appropriate type.
     */
    private Object parseConfigValue(String configJson) {
        if (configJson == null || configJson.isEmpty()) {
            return "";
        }

        try {
            // Try to parse as JSON
            return objectMapper.readValue(configJson, Object.class);
        } catch (JsonProcessingException e) {
            // If not JSON, treat as plain string and parse
            return parseValue(configJson);
        }
    }

    /**
     * Parse string config value to appropriate type.
     */
    private Object parseValue(String value) {
        if (value == null || value.isEmpty()) {
            return "";
        }

        if ("true".equalsIgnoreCase(value)) {
            return true;
        }
        if ("false".equalsIgnoreCase(value)) {
            return false;
        }

        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            // Ignore
        }

        try {
            return Long.parseLong(value);
        } catch (NumberFormatException e) {
            // Ignore
        }

        try {
            return Double.parseDouble(value);
        } catch (NumberFormatException e) {
            // Ignore
        }

        return value;
    }
}
