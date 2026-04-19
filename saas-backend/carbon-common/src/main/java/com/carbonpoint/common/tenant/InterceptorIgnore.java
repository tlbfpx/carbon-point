package com.carbonpoint.common.tenant;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a MyBatis mapper method or class to bypass tenant-line interception.
 * Used for platform-level queries that should not filter by tenant_id.
 */
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD, ElementType.TYPE})
public @interface InterceptorIgnore {

    /**
     * When true, the tenant line interceptor will be skipped for this mapper/method.
     */
    boolean value() default true;
}
