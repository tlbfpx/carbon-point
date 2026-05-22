package com.carbonpoint.system.controller;

import com.carbonpoint.common.result.Result;
import com.carbonpoint.system.config.FeatureToggleProperties;
import com.carbonpoint.system.dto.ConsistencyReport;
import com.carbonpoint.system.entity.PlatformResource;
import com.carbonpoint.system.repository.PlatformResourceRepository;
import com.carbonpoint.system.service.ResourceRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controller for unified resources architecture, including health checks and status endpoints.
 */
@Slf4j
@RestController
@RequestMapping("/platform/unified-resources")
@RequiredArgsConstructor
public class UnifiedResourceController {

    private final FeatureToggleProperties featureToggleProperties;
    private final PlatformResourceRepository platformResourceRepository;
    private final ResourceRegistry resourceRegistry;

    /**
     * Get the current status of the unified resources feature toggle.
     */
    @GetMapping("/status")
    public Result<Map<String, Object>> getStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("featureEnabled", featureToggleProperties.isUnifiedResources());
        status.put("primarySource", featureToggleProperties.isUnifiedResources() ? "NEW_TABLES" : "OLD_TABLES");
        return Result.success(status);
    }

    /**
     * Health check endpoint for both old and new resource systems.
     */
    @GetMapping("/health")
    public Result<Map<String, Object>> health() {
        Map<String, Object> health = new HashMap<>();

        // Check old system
        try {
            List<PlatformResource> oldResources = platformResourceRepository.findAllFromOldTable();
            health.put("oldSystem", Map.of(
                "status", "UP",
                "resourceCount", oldResources.size()
            ));
        } catch (Exception e) {
            log.error("Old system health check failed", e);
            health.put("oldSystem", Map.of(
                "status", "DOWN",
                "error", e.getMessage()
            ));
        }

        // Check new system
        try {
            List<PlatformResource> newResources = platformResourceRepository.findAllFromNewTable();
            health.put("newSystem", Map.of(
                "status", "UP",
                "resourceCount", newResources.size()
            ));
        } catch (Exception e) {
            log.error("New system health check failed", e);
            health.put("newSystem", Map.of(
                "status", "DOWN",
                "error", e.getMessage()
            ));
        }

        // Overall status
        health.put("featureEnabled", featureToggleProperties.isUnifiedResources());

        return Result.success(health);
    }

    /**
     * Validate consistency between old and new resource tables.
     */
    @GetMapping("/consistency")
    public Result<ConsistencyReport> validateConsistency() {
        ConsistencyReport report = platformResourceRepository.validateConsistency();
        return Result.success(report);
    }

    /**
     * Refresh the resource registry cache.
     */
    @PostMapping("/refresh")
    public Result<Void> refreshRegistry() {
        resourceRegistry.refresh();
        return Result.success();
    }

    /**
     * Get all resources from the current primary source.
     */
    @GetMapping("/resources")
    public Result<List<PlatformResource>> getAllResources() {
        List<PlatformResource> resources = platformResourceRepository.findAll();
        return Result.success(resources);
    }

    /**
     * Get all resources from the old tables (Feature + Product).
     */
    @GetMapping("/resources/old")
    public Result<List<PlatformResource>> getOldResources() {
        List<PlatformResource> resources = platformResourceRepository.findAllFromOldTable();
        return Result.success(resources);
    }

    /**
     * Get all resources from the new platform_resources table.
     */
    @GetMapping("/resources/new")
    public Result<List<PlatformResource>> getNewResources() {
        List<PlatformResource> resources = platformResourceRepository.findAllFromNewTable();
        return Result.success(resources);
    }
}
