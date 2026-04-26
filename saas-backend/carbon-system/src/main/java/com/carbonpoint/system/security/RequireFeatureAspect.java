package com.carbonpoint.system.security;

import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.system.service.FeatureGateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;

@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class RequireFeatureAspect {

    private final FeatureGateService featureGateService;

    @Before("@annotation(requireFeature)")
    public void checkFeature(JoinPoint joinPoint, RequireFeature requireFeature) {
        Long tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        String featureCode = requireFeature.value();
        if (!featureGateService.isFeatureEnabled(tenantId, featureCode)) {
            log.warn("Feature gate blocked: tenantId={}, feature={}, method={}",
                    tenantId, featureCode, joinPoint.getSignature().toShortString());
            throw new BusinessException(ErrorCode.PERMISSION_DENIED);
        }
    }
}
