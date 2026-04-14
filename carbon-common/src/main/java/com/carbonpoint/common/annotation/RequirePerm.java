package com.carbonpoint.common.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation for API-level permission checks.
 * Place on controller methods to enforce permission validation.
 *
 * Usage: @RequirePerm("user:create") — checks if the current user has the "user:create" permission.
 *
 * @deprecated Use {@link com.carbonpoint.system.security.RequirePerm} instead.
 *     The canonical permission annotation is {@code com.carbonpoint.system.security.RequirePerm},
 *     which is wired to {@link com.carbonpoint.system.security.RequirePermAspect}.
 */
@Deprecated
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface RequirePerm {

    /**
     * The permission code to check (e.g., "user:create", "role:delete").
     */
    String value();
}
