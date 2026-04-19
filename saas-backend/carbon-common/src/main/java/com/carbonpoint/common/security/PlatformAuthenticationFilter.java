package com.carbonpoint.common.security;

import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.result.Result;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * JWT authentication filter for platform admin endpoints.
 * Intercepts all /platform/** requests (except /platform/auth/**).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PlatformAuthenticationFilter extends OncePerRequestFilter {

    private final PlatformJwtUtil jwtUtil;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();

        // Skip authentication for /platform/auth/** (login/refresh/logout)
        if (path.startsWith("/platform/auth")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Only intercept /platform/** requests
        if (!path.startsWith("/platform")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Extract and validate token
        String token = extractToken(request);
        if (token == null) {
            sendError(response, HttpServletResponse.SC_UNAUTHORIZED, ErrorCode.UNAUTHORIZED);
            return;
        }

        Claims claims = jwtUtil.parseToken(token);
        if (claims == null || !jwtUtil.isPlatformAdminToken(claims)) {
            sendError(response, HttpServletResponse.SC_UNAUTHORIZED, ErrorCode.TOKEN_INVALID);
            return;
        }

        // Set admin context for this request
        PlatformAdminInfo adminInfo = new PlatformAdminInfo(
                jwtUtil.getAdminId(claims),
                jwtUtil.getUsername(claims),
                jwtUtil.getRole(claims)
        );
        PlatformAdminContext.set(adminInfo);

        // Also set Spring Security context so FilterSecurityInterceptor allows the request
        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(
                        adminInfo,
                        null,
                        java.util.List.of(new SimpleGrantedAuthority("ROLE_" + adminInfo.getRole().toUpperCase()))
                );
        SecurityContextHolder.getContext().setAuthentication(authentication);

        try {
            filterChain.doFilter(request, response);
        } finally {
            PlatformAdminContext.clear();
        }
    }

    private String extractToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }

    private void sendError(HttpServletResponse response, int status, ErrorCode errorCode) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        Result<Void> result = Result.error(errorCode);
        response.getWriter().write(objectMapper.writeValueAsString(result));
    }
}
