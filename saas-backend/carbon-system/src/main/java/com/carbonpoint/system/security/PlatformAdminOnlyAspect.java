package com.carbonpoint.system.security;

import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.security.PlatformAdminContext;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;

/**
 * AOP aspect for platform admin exclusive endpoints.
 * Intercepts methods annotated with @PlatformAdminOnly.
 */
@Aspect
@Component
public class PlatformAdminOnlyAspect {

    @Before("@annotation(platformAdminOnly)")
    public void checkPlatformAdmin(JoinPoint joinPoint, PlatformAdminOnly platformAdminOnly) {
        var adminInfo = PlatformAdminContext.get();
        if (adminInfo == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        // For MVP, all authenticated platform admins can access package management endpoints.
        // Fine-grained RBAC for platform admins can be added in a future iteration.
    }
}
