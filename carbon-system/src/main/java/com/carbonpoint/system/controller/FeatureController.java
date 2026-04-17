package com.carbonpoint.system.controller;

import com.carbonpoint.common.result.Result;
import com.carbonpoint.system.dto.res.FeatureRes;
import com.carbonpoint.system.dto.res.PageRes;
import com.carbonpoint.system.entity.FeatureEntity;
import com.carbonpoint.system.service.FeatureService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

/**
 * Feature management controller - platform level.
 */
@RestController
@RequestMapping("/features")
@RequiredArgsConstructor
public class FeatureController {

    private final FeatureService featureService;

    /**
     * Paginated feature list.
     * GET /features?page=1&size=20&type=permission&group=checkin&keyword=xxx
     */
    @GetMapping
    public Result<PageRes<FeatureRes>> getFeatures(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String group,
            @RequestParam(required = false) String keyword) {
        return Result.success(featureService.getFeatures(page, size, type, group, keyword));
    }

    /**
     * Get feature by ID.
     * GET /features/{id}
     */
    @GetMapping("/{id}")
    public Result<FeatureRes> getFeature(@PathVariable String id) {
        Optional<FeatureRes> feature = featureService.getFeature(id);
        return feature.map(Result::success)
                .orElseGet(() -> Result.error(com.carbonpoint.common.result.ErrorCode.NOT_FOUND, "功能点不存在"));
    }

    /**
     * Create a new feature.
     * POST /features
     */
    @PostMapping
    public Result<FeatureRes> createFeature(@RequestBody FeatureEntity data) {
        FeatureRes created = featureService.createFeature(data);
        return Result.success(created);
    }

    /**
     * Update an existing feature.
     * PUT /features/{id}
     */
    @PutMapping("/{id}")
    public Result<FeatureRes> updateFeature(@PathVariable String id, @RequestBody FeatureEntity data) {
        FeatureRes updated = featureService.updateFeature(id, data);
        return Result.success(updated);
    }

    /**
     * Delete a feature.
     * DELETE /features/{id}
     * Fails if the feature is in use by any product.
     */
    @DeleteMapping("/{id}")
    public Result<Void> deleteFeature(@PathVariable String id) {
        featureService.deleteFeature(id);
        return Result.success();
    }
}
