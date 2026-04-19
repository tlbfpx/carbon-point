package com.carbonpoint.system.security;

import java.lang.annotation.*;

/**
 * API-level permission check annotation.
 * Use with RequirePermAspect AOP aspect.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RequirePerm {
    /**
     * Required permission code, e.g. "enterprise:member:create"
     */
    String value();
}
