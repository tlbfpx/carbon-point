package com.carbonpoint.system.security;

import java.lang.annotation.*;

/**
 * API-level feature gate annotation.
 * Checks if the current tenant's package includes the specified feature.
 * Use together with @RequirePerm for AND logic (both must pass).
 * Only applies to enterprise/H5 APIs, NOT platform admin APIs.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RequireFeature {
    /**
     * Feature code to check, e.g. "stair.floor_points"
     */
    String value();
}
