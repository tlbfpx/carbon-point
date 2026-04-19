package com.carbonpoint.common.security;

import com.carbonpoint.common.tenant.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

/**
 * JWT authentication filter: extracts Bearer token from Authorization header,
 * validates it, and populates SecurityContext and TenantContext.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String token = extractToken(request);
            if (StringUtils.hasText(token) && jwtUtil.isTokenValid(token)) {
                Long userId = jwtUtil.getUserId(token);
                Long tenantId = jwtUtil.getTenantId(token);
                List<String> roles = jwtUtil.getRoles(token);

                // Set tenant context
                if (tenantId != null) {
                    TenantContext.setTenantId(tenantId);
                }

                // Set MDC context for structured logging
                org.slf4j.MDC.put("userId", String.valueOf(userId));
                org.slf4j.MDC.put("tenantId", String.valueOf(tenantId));

                // Build authentication principal
                JwtUserPrincipal principal = new JwtUserPrincipal(userId, tenantId, roles);

                List<SimpleGrantedAuthority> authorities = roles.stream()
                        .map(role -> new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()))
                        .collect(Collectors.toList());

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(principal, null, authorities);

                SecurityContextHolder.getContext().setAuthentication(authentication);
                log.debug("Authenticated user: userId={}, tenantId={}, roles={}", userId, tenantId, roles);
            }
        } catch (Exception e) {
            log.warn("JWT authentication failed: {}", e.getMessage());
            // Do not set authentication — request will be treated as anonymous
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            // Always clear tenant context after request processing
            TenantContext.clear();
        }
    }

    private String extractToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        // Skip filter for public auth endpoints and all platform admin endpoints
        // Platform admin JWT tokens have different structure (adminId, username) vs tenant user tokens (userId, tenantId)
        // Public auth endpoints: login, register, refresh, logout, captcha
        // Protected: /api/auth/current requires authentication
        if (path.equals("/api/auth/current")) {
            return false; // Do filter this - it needs authentication
        }
        if (path.startsWith("/api/auth/") || path.startsWith("/platform/")) {
            return true; // Skip filter for public auth endpoints
        }
        return false;
    }
}
