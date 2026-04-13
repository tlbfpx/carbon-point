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
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface RequirePerm {

    /**
     * The permission code to check (e.g., "user:create", "role:delete").
     */
    String value();
}
