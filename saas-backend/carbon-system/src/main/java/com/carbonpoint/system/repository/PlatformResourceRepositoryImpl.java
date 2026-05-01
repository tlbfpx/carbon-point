package com.carbonpoint.system.repository;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.carbonpoint.common.tenant.InterceptorIgnore;
import com.carbonpoint.system.config.FeatureToggleProperties;
import com.carbonpoint.system.dto.ConsistencyReport;
import com.carbonpoint.system.entity.FeatureEntity;
import com.carbonpoint.system.entity.PlatformProduct;
import com.carbonpoint.system.entity.PlatformResource;
import com.carbonpoint.system.enums.ResourceType;
import com.carbonpoint.system.mapper.FeatureMapper;
import com.carbonpoint.system.mapper.PlatformProductMapper;
import com.carbonpoint.system.mapper.PlatformResourceMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Implementation of PlatformResourceRepository with dual-read support and feature toggle.
 * <p>
 * When feature.unified-resources is true: uses new tables as primary, old tables as fallback.
 * When false (default): uses old tables as primary, new tables for validation only.
 */
@Slf4j
@Repository
@Primary
@RequiredArgsConstructor
public class PlatformResourceRepositoryImpl implements PlatformResourceRepository {

    private final PlatformResourceMapper platformResourceMapper;
    private final FeatureMapper featureMapper;
    private final PlatformProductMapper platformProductMapper;
    private final ObjectMapper objectMapper;
    private final FeatureToggleProperties featureToggleProperties;

    @Override
    @InterceptorIgnore
    public List<PlatformResource> findAllFromNewTable() {
        log.debug("Reading all resources from new platform_resources table");
        LambdaQueryWrapper<PlatformResource> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PlatformResource::getDeleted, false);
        return platformResourceMapper.selectList(wrapper);
    }

    @Override
    @InterceptorIgnore
    public List<PlatformResource> findAllFromOldTable() {
        log.debug("Reading all resources from old tables (Feature + Product)");
        List<PlatformResource> resources = new ArrayList<>();

        // Load features
        List<FeatureEntity> features = featureMapper.selectList(null);
        for (FeatureEntity feature : features) {
            resources.add(buildResourceFromFeature(feature));
        }

        // Load products
        List<PlatformProduct> products = platformProductMapper.selectList(null);
        for (PlatformProduct product : products) {
            resources.add(buildResourceFromProduct(product));
        }

        return resources;
    }

    @Override
    public List<PlatformResource> findAll() {
        if (featureToggleProperties.isUnifiedResources()) {
            log.debug("Feature toggle enabled: using new platform_resources table as primary");
            try {
                return findAllFromNewTable();
            } catch (Exception e) {
                log.warn("Failed to read from new table, falling back to old tables", e);
                return findAllFromOldTable();
            }
        } else {
            log.debug("Feature toggle disabled: using old tables (Feature + Product) as primary");
            return findAllFromOldTable();
        }
    }

    @Override
    public ConsistencyReport validateConsistency() {
        log.info("Validating consistency between old and new resource tables");
        List<PlatformResource> oldResources = findAllFromOldTable();
        List<PlatformResource> newResources = findAllFromNewTable();

        ConsistencyReport report = new ConsistencyReport();
        report.setTotalResources(oldResources.size());
        List<String> mismatches = new ArrayList<>();

        // Map by code for comparison
        Map<String, PlatformResource> oldByCode = oldResources.stream()
                .collect(Collectors.toMap(PlatformResource::getCode, r -> r));
        Map<String, PlatformResource> newByCode = newResources.stream()
                .collect(Collectors.toMap(PlatformResource::getCode, r -> r));

        // Check for resources missing in new table
        for (String code : oldByCode.keySet()) {
            if (!newByCode.containsKey(code)) {
                mismatches.add("Resource missing in new table: " + code);
            }
        }

        // Check for extra resources in new table
        for (String code : newByCode.keySet()) {
            if (!oldByCode.containsKey(code)) {
                mismatches.add("Extra resource in new table: " + code);
            }
        }

        // Check for field mismatches
        int matchingCount = 0;
        for (String code : oldByCode.keySet()) {
            if (newByCode.containsKey(code)) {
                PlatformResource oldRes = oldByCode.get(code);
                PlatformResource newRes = newByCode.get(code);
                List<String> fieldMismatches = compareResources(oldRes, newRes);
                if (fieldMismatches.isEmpty()) {
                    matchingCount++;
                } else {
                    mismatches.addAll(fieldMismatches);
                }
            }
        }

        report.setMismatches(mismatches);
        report.setMatchingCount(matchingCount);
        report.setConsistent(mismatches.isEmpty());

        log.info("Consistency check complete: consistent={}, total={}, matching={}, mismatches={}",
                report.isConsistent(), report.getTotalResources(), report.getMatchingCount(), report.getMismatches().size());

        return report;
    }

    // ========== Private helper methods ==========

    private PlatformResource buildResourceFromFeature(FeatureEntity feature) {
        PlatformResource resource = new PlatformResource();
        resource.setCode(feature.getCode());
        resource.setType(ResourceType.FEATURE.getCode());
        resource.setName(feature.getName());
        resource.setCategory(feature.getGroup());
        resource.setDescription(feature.getDescription());
        resource.setIcon(null);
        resource.setStatus("ENABLED");
        resource.setSortOrder(0);
        resource.setDeleted(false);
        resource.setCreatedAt(feature.getCreatedAt());
        resource.setUpdatedAt(feature.getUpdatedAt());

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("featureType", feature.getType());
        metadata.put("valueType", feature.getValueType());
        metadata.put("defaultValue", feature.getDefaultValue());
        metadata.put("group", feature.getGroup());
        try {
            resource.setMetadata(objectMapper.writeValueAsString(metadata));
        } catch (Exception e) {
            log.warn("Failed to serialize metadata for feature {}", feature.getCode(), e);
            resource.setMetadata("{}");
        }

        return resource;
    }

    private PlatformResource buildResourceFromProduct(PlatformProduct product) {
        PlatformResource resource = new PlatformResource();
        resource.setCode(product.getCode());
        resource.setType(ResourceType.FUNCTION_PRODUCT.getCode());
        resource.setName(product.getName());
        resource.setCategory(product.getCategory());
        resource.setDescription(product.getDescription());
        resource.setIcon(null);
        resource.setStatus(product.getStatus() == 1 ? "ENABLED" : "DISABLED");
        resource.setSortOrder(product.getSortOrder() != null ? product.getSortOrder() : 0);
        resource.setDeleted(product.getDeleted() != null && product.getDeleted() == 1);
        resource.setCreatedAt(product.getCreatedAt());
        resource.setUpdatedAt(product.getUpdatedAt());

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("triggerType", product.getTriggerType());
        metadata.put("ruleChainConfig", product.getRuleChainConfig());
        metadata.put("defaultConfig", product.getDefaultConfig());
        metadata.put("basicConfig", product.getBasicConfig());
        try {
            resource.setMetadata(objectMapper.writeValueAsString(metadata));
        } catch (Exception e) {
            log.warn("Failed to serialize metadata for product {}", product.getCode(), e);
            resource.setMetadata("{}");
        }

        return resource;
    }

    private List<String> compareResources(PlatformResource oldRes, PlatformResource newRes) {
        List<String> mismatches = new ArrayList<>();
        String code = oldRes.getCode();

        if (!Objects.equals(oldRes.getType(), newRes.getType())) {
            mismatches.add(String.format("Resource %s type mismatch: old=%s, new=%s",
                    code, oldRes.getType(), newRes.getType()));
        }
        if (!Objects.equals(oldRes.getName(), newRes.getName())) {
            mismatches.add(String.format("Resource %s name mismatch: old=%s, new=%s",
                    code, oldRes.getName(), newRes.getName()));
        }
        if (!Objects.equals(oldRes.getCategory(), newRes.getCategory())) {
            mismatches.add(String.format("Resource %s category mismatch: old=%s, new=%s",
                    code, oldRes.getCategory(), newRes.getCategory()));
        }
        if (!Objects.equals(oldRes.getStatus(), newRes.getStatus())) {
            mismatches.add(String.format("Resource %s status mismatch: old=%s, new=%s",
                    code, oldRes.getStatus(), newRes.getStatus()));
        }
        if (!Objects.equals(oldRes.getSortOrder(), newRes.getSortOrder())) {
            mismatches.add(String.format("Resource %s sortOrder mismatch: old=%s, new=%s",
                    code, oldRes.getSortOrder(), newRes.getSortOrder()));
        }

        return mismatches;
    }
}
