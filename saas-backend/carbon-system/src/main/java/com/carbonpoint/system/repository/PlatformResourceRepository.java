package com.carbonpoint.system.repository;

import com.carbonpoint.system.dto.ConsistencyReport;
import com.carbonpoint.system.entity.PlatformResource;

import java.util.List;

/**
 * Repository for platform resources with dual-read support (old and new tables).
 * <p>
 * Non-invasive: defaults to reading from old tables (Feature + Product).
 * New table (platform_resources) is used for validation only.
 */
public interface PlatformResourceRepository {

    /**
     * Find all resources from the new platform_resources table (phase 2+).
     */
    List<PlatformResource> findAllFromNewTable();

    /**
     * Find all resources from the old tables (Feature + Product).
     */
    List<PlatformResource> findAllFromOldTable();

    /**
     * Find all resources - defaults to old table for non-invasive behavior.
     */
    List<PlatformResource> findAll();

    /**
     * Validate consistency between old and new tables.
     */
    ConsistencyReport validateConsistency();
}
