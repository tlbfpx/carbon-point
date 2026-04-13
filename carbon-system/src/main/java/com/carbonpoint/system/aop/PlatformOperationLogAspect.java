package com.carbonpoint.system.aop;

import com.carbonpoint.common.security.PlatformAdminContext;
import com.carbonpoint.common.security.PlatformAdminInfo;
import com.carbonpoint.system.entity.PlatformOperationLogEntity;
import com.carbonpoint.system.mapper.PlatformOperationLogMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

/**
 * AOP aspect for logging platform admin operations.
 * Intercepts all methods annotated with @PlatformOperationLog.
 * Logs to platform_operation_logs table (Phase 2 schema columns).
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class PlatformOperationLogAspect {

    private final PlatformOperationLogMapper logMapper;

    @Around("@annotation(logAnnotation)")
    public Object logOperation(ProceedingJoinPoint pjp, PlatformOperationLog logAnnotation) throws Throwable {
        // Extract request info before execution
        HttpServletRequest request = getCurrentRequest();
        String ipAddress = getClientIp(request);
        String userAgent = request != null ? request.getHeader("User-Agent") : null;

        // Get admin info from thread local
        PlatformAdminInfo adminInfo = PlatformAdminContext.get();
        Long adminId = adminInfo != null ? adminInfo.getAdminId() : null;
        String adminName = adminInfo != null ? adminInfo.getUsername() : "unknown";
        String adminRole = adminInfo != null ? adminInfo.getRole() : "unknown";

        // Execute the actual method
        Object result = null;
        int responseStatus = 200;
        try {
            result = pjp.proceed();
            return result;
        } catch (Throwable e) {
            responseStatus = 500;
            throw e;
        } finally {
            // Write operation log (fail silently to avoid blocking business flow)
            try {
                writeLog(adminId, adminName, adminRole, logAnnotation.operationType(),
                        logAnnotation.operationObject(), ipAddress);
            } catch (Exception e) {
                log.error("Failed to write platform operation log", e);
            }
        }
    }

    private void writeLog(Long adminId, String adminName, String adminRole,
                          String operationType, String operationObject, String ipAddress) {
        PlatformOperationLogEntity logEntry = new PlatformOperationLogEntity();
        logEntry.setAdminId(adminId != null ? adminId : 0L);
        logEntry.setAdminName(adminName);
        logEntry.setAdminRole(adminRole);
        logEntry.setOperationType(operationType);
        logEntry.setOperationObject(operationObject);
        logEntry.setIpAddress(ipAddress);
        logEntry.setCreatedAt(java.time.LocalDateTime.now());

        logMapper.insert(logEntry);
    }

    private HttpServletRequest getCurrentRequest() {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        return attrs != null ? attrs.getRequest() : null;
    }

    private String getClientIp(HttpServletRequest request) {
        if (request == null) return null;

        String[] headers = {
                "X-Forwarded-For",
                "X-Real-IP",
                "Proxy-Client-IP",
                "WL-Proxy-Client-IP",
                "HTTP_X_FORWARDED_FOR",
                "HTTP_CLIENT_IP",
                "HTTP_FORWARDED_FOR"
        };

        for (String header : headers) {
            String ip = request.getHeader(header);
            if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
                return ip.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }
}
