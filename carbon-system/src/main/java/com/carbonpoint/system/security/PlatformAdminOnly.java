package com.carbonpoint.system.security;

import java.lang.annotation.*;

/**
 * Marker annotation for platform admin exclusive endpoints.
 * Use with PlatformAdminOnlyAspect.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface PlatformAdminOnly {
}
