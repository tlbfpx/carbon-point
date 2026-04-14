package com.carbonpoint.system.security;

import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;

/**
 * AOP aspect for platform admin RBAC.
 * Intercepts methods annotated with @PlatformRequirePerm and enforces
 * that the current platform admin has the required permission.
 */
@Aspect
@Component
@RequiredArgsConstructor
public class PlatformRequirePermAspect {

    private final PlatformPermissionService platformPermissionService;

    @Before("@annotation(platformRequirePerm)")
    public void checkPermission(JoinPoint joinPoint, PlatformRequirePerm platformRequirePerm) {
        var adminInfo = com.carbonpoint.common.security.PlatformAdminContext.get();
        if (adminInfo == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        var permissions = platformPermissionService.getCurrentAdminPermissions();
        if (!permissions.contains(platformRequirePerm.value())) {
            throw new BusinessException(ErrorCode.PERMISSION_DENIED);
        }
    }
}
