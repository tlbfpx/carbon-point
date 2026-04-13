package com.carbonpoint.system.aop;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation for platform admin operation logging.
 * Applied to controller methods to capture operation details.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface PlatformOperationLog {

    /** Operation type, e.g., CREATE_ADMIN, UPDATE_TENANT, DELETE_CONFIG */
    String operationType();

    /** Operation object description, e.g., "平台管理员: {username}", "企业: {name}" */
    String operationObject() default "";
}
