package com.carbonpoint.system.service;

import com.carbonpoint.system.dto.res.FeatureRes;
import com.carbonpoint.system.dto.res.PageRes;
import com.carbonpoint.system.entity.FeatureEntity;

import java.util.Optional;

/**
 * Feature service - platform-level feature flag/config management.
 */
public interface FeatureService {

    /**
     * Paginated feature list with optional filters.
     */
    PageRes<FeatureRes> getFeatures(int page, int size, String type, String group, String keyword);

    /**
     * Get feature by ID.
     */
    Optional<FeatureRes> getFeature(String id);

    /**
     * Create a new feature.
     */
    FeatureRes createFeature(FeatureEntity data);

    /**
     * Update an existing feature.
     */
    FeatureRes updateFeature(String id, FeatureEntity data);

    /**
     * Delete a feature.
     * Fails if the feature is in use by any product.
     */
    void deleteFeature(String id);
}
