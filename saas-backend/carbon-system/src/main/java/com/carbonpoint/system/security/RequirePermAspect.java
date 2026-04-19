package com.carbonpoint.system.security;

import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.List;

@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class RequirePermAspect {

    private final PermissionService permissionService;
    private final CurrentUser currentUser;

    @Before("@annotation(requirePerm)")
    public void checkPermission(JoinPoint joinPoint, RequirePerm requirePerm) {
        // Initialize from SecurityContext populated by JwtAuthenticationFilter
        currentUser.initFromSecurityContext();

        Long userId = currentUser.getUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        List<String> permissions = permissionService.getUserPermissions(userId);
        if (!permissions.contains(requirePerm.value())) {
            String uri = "";
            try {
                ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
                if (attrs != null) {
                    uri = attrs.getRequest().getRequestURI();
                }
            } catch (Exception ignored) {}
            log.warn("权限校验失败: userId={}, requiredPerm={}, uri={}", userId, requirePerm.value(), uri);
            throw new BusinessException(ErrorCode.PERMISSION_DENIED);
        }
    }
}
