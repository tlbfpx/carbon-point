package com.carbonpoint.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Security response headers filter.
 * Adds protective HTTP headers to all responses.
 *
 * <ul>
 *   <li>Strict-Transport-Security: max-age=31536000</li>
 *   <li>X-Content-Type-Options: nosniff</li>
 *   <li>X-Frame-Options: DENY</li>
 *   <li>X-XSS-Protection: 1; mode=block</li>
 *   <li>Content-Security-Policy: configurable per environment</li>
 *   <li>Referrer-Policy: strict-origin-when-cross-origin</li>
 *   <li>Permissions-Policy: ...</li>
 * </ul>
 *
 * <p>Registered manually in SecurityConfig to ensure correct filter ordering.
 * <p>CSP and HSTS are configurable via application.yml per environment
 * (dev allows localhost origins; production restricts to same-origin only).
 */
@Component
public class SecurityHeadersFilter extends OncePerRequestFilter {

    @Value("${security.headers.csp:default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'}")
    private String cspValue;

    @Value("${security.headers.hsts:max-age=31536000; includeSubDomains; preload}")
    private String hstsValue;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        HttpServletResponse res = response;

        // Strict Transport Security — enforce HTTPS (configurable per environment)
        res.setHeader("Strict-Transport-Security", hstsValue);

        // Prevent MIME type sniffing
        res.setHeader("X-Content-Type-Options", "nosniff");

        // Prevent clickjacking
        res.setHeader("X-Frame-Options", "DENY");

        // XSS protection (legacy browsers)
        res.setHeader("X-XSS-Protection", "1; mode=block");

        // Content Security Policy — configurable per environment
        res.setHeader("Content-Security-Policy", cspValue);

        // Referrer policy
        res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

        // Permissions policy
        res.setHeader("Permissions-Policy",
                "accelerometer=(), camera=(), geolocation=(), gyroscope=(), " +
                        "magnetometer=(), microphone=(), payment=(), usb=()");

        // Cache control for sensitive endpoints
        String path = request.getServletPath();
        if (path.startsWith("/api/auth/") || path.startsWith("/platform/auth/")) {
            res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
            res.setHeader("Pragma", "no-cache");
        }

        filterChain.doFilter(request, res);
    }
}
