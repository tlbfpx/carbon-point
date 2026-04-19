package com.carbonpoint.system.controller;

import com.carbonpoint.common.result.Result;
import com.carbonpoint.system.dto.PlatformConfigRequest;
import com.carbonpoint.system.entity.PlatformConfigEntity;
import com.carbonpoint.system.service.PlatformConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Platform configuration controller.
 * Allows super_admin to manage platform-level configurations.
 * Endpoints: GET/PUT /platform/configs/{key}, GET/PUT /platform/config
 */
@RestController
@RequestMapping("/platform/config")
@RequiredArgsConstructor
public class PlatformConfigController {

    private final PlatformConfigService configService;

    /**
     * Get config value by key (legacy path: /platform/configs/{key}).
     */
    @GetMapping("/configs/{key}")
    public Result<String> getConfig(@PathVariable String key) {
        String value = configService.getConfig(key);
        return Result.success(value);
    }

    /**
     * Set config value (legacy path: /platform/configs/{key}).
     */
    @PutMapping("/configs/{key}")
    public Result<Void> setConfig(@PathVariable String key,
                                   @RequestBody PlatformConfigRequest request) {
        configService.setConfig(key, request.getConfigValue(), request.getDescription());
        return Result.success();
    }

    // ─── New unified endpoints (matches frontend API) ────────────────────────

    /**
     * List all platform configs.
     * GET /platform/config
     */
    @GetMapping
    public Result<List<PlatformConfigEntity>> listAll() {
        return Result.success(configService.listAll());
    }

    /**
     * Batch update configs.
     * PUT /platform/config
     */
    @PutMapping
    public Result<Void> batchUpdate(@RequestBody List<PlatformConfigEntity> configs) {
        configService.batchUpdate(configs);
        return Result.success();
    }
}
