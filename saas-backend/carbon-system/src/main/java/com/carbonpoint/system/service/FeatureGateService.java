package com.carbonpoint.system.service;

import com.carbonpoint.system.entity.PackageProductFeatureEntity;
import com.carbonpoint.system.entity.Tenant;
import com.carbonpoint.system.mapper.PackageProductFeatureMapper;
import com.carbonpoint.system.mapper.TenantMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeatureGateService {

    private static final String CACHE_KEY_PREFIX = "feature:tenant:";
    private static final long CACHE_TTL_MINUTES = 5;

    private final TenantMapper tenantMapper;
    private final PackageProductFeatureMapper packageProductFeatureMapper;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    /**
     * Check if a feature is enabled for a tenant.
     * Uses Redis cache (5min TTL) with DB fallback.
     */
    public boolean isFeatureEnabled(Long tenantId, String featureCode) {
        Map<String, Boolean> features = getTenantFeatures(tenantId);
        return features.getOrDefault(featureCode, false);
    }

    /**
     * Get all enabled features for a tenant, with caching.
     */
    public Map<String, Boolean> getTenantFeatures(Long tenantId) {
        String cacheKey = CACHE_KEY_PREFIX + tenantId;
        try {
            String cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                return objectMapper.readValue(cached, new TypeReference<Map<String, Boolean>>() {});
            }
        } catch (Exception e) {
            log.warn("Failed to read feature cache for tenant {}", tenantId, e);
        }

        // DB fallback
        Map<String, Boolean> features = loadFeaturesFromDb(tenantId);

        try {
            redisTemplate.opsForValue().set(cacheKey,
                    objectMapper.writeValueAsString(features),
                    CACHE_TTL_MINUTES, TimeUnit.MINUTES);
        } catch (Exception e) {
            log.warn("Failed to cache features for tenant {}", tenantId, e);
        }

        return features;
    }

    /**
     * Invalidate feature cache for a tenant (call on package/config change).
     */
    public void invalidateCache(Long tenantId) {
        redisTemplate.delete(CACHE_KEY_PREFIX + tenantId);
    }

    private Map<String, Boolean> loadFeaturesFromDb(Long tenantId) {
        Tenant tenant = tenantMapper.selectById(tenantId);
        if (tenant == null || tenant.getPackageId() == null) {
            return Collections.emptyMap();
        }

        List<PackageProductFeatureEntity> pkgFeatures =
                packageProductFeatureMapper.selectEnabledFeatureCodesByPackageId(tenant.getPackageId());

        Map<String, Boolean> result = new HashMap<>();
        for (PackageProductFeatureEntity pf : pkgFeatures) {
            String code = pf.getFeatureCode();
            if (code != null && pf.getIsEnabled() != null && pf.getIsEnabled()) {
                result.put(code, true);
            }
        }
        return result;
    }
}
