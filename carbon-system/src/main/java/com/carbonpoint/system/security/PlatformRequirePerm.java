package com.carbonpoint.system.security;

import java.lang.annotation.*;

/**
 * Platform admin permission check annotation.
 * Use with PlatformRequirePermAspect.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface PlatformRequirePerm {
    String value();
}
