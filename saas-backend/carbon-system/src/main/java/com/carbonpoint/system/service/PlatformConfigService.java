package com.carbonpoint.system.service;

import com.carbonpoint.system.entity.PlatformConfigEntity;

import java.util.List;

/**
 * Platform configuration service.
 */
public interface PlatformConfigService {

    /**
     * Get config value by key.
     * Returns null if not found.
     */
    String getConfig(String key);

    /**
     * Set config value (upsert).
     */
    void setConfig(String key, String value, String description);

    /**
     * List all platform configs.
     */
    List<PlatformConfigEntity> listAll();

    /**
     * Batch update configs.
     */
    void batchUpdate(List<PlatformConfigEntity> configs);
}
