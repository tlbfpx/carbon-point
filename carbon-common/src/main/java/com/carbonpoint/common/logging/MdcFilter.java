package com.carbonpoint.common.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * MDC (Mapped Diagnostic Context) filter that enriches all log entries
 * within a request with request-level identifiers.
 *
 * <ul>
 *   <li>requestId — unique UUID per request, also returned as X-Request-Id header</li>
 *   <li>userId — extracted from JWT token (if authenticated)</li>
 *   <li>tenantId — extracted from JWT token (if authenticated)</li>
 * </ul>
 *
 * <p>Registered before JwtAuthenticationFilter in SecurityConfig so MDC
 * context is available for all downstream logging including authentication.
 */
@Slf4j
@Component
public class MdcFilter extends OncePerRequestFilter {

    private static final String MDC_REQUEST_ID = "requestId";
    private static final String MDC_USER_ID = "userId";
    private static final String MDC_TENANT_ID = "tenantId";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String requestId = UUID.randomUUID().toString();

        // Always set requestId
        org.slf4j.MDC.put(MDC_REQUEST_ID, requestId);
        response.setHeader("X-Request-Id", requestId);

        try {
            filterChain.doFilter(request, response);
        } finally {
            // Always clear MDC after request processing
            org.slf4j.MDC.remove(MDC_REQUEST_ID);
            org.slf4j.MDC.remove(MDC_USER_ID);
            org.slf4j.MDC.remove(MDC_TENANT_ID);
        }
    }
}
