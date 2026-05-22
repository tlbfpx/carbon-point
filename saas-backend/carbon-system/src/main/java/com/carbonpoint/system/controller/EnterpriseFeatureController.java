package com.carbonpoint.system.controller;

import com.carbonpoint.common.result.Result;
import com.carbonpoint.common.security.JwtUserPrincipal;
import com.carbonpoint.system.service.FeatureGateService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Enterprise feature API.
 * Returns the feature map for the current tenant based on their package.
 * @deprecated Deprecated for removal in v2.3, use unified resources instead.
 */
@Deprecated
@RestController
@RequestMapping("/api/enterprise")
@RequiredArgsConstructor
public class EnterpriseFeatureController {

    private final FeatureGateService featureGateService;

    /**
     * Get all enabled features for the current tenant.
     * GET /api/enterprise/features
     */
    @GetMapping("/features")
    public Result<Map<String, Boolean>> getFeatures(
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        if (principal == null || principal.getTenantId() == null) {
            return Result.error(com.carbonpoint.common.result.ErrorCode.UNAUTHORIZED);
        }
        return Result.success(featureGateService.getTenantFeatures(principal.getTenantId()));
    }
}
