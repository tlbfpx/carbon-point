package com.carbonpoint.common.security;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Spring Security configuration — unified filter chain for both tenant and platform admin endpoints.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final PlatformAuthenticationFilter platformAuthenticationFilter;
    private final SecurityHeadersFilter securityHeadersFilter;
    private final com.carbonpoint.common.logging.MdcFilter mdcFilter;
    private final EnhancedPasswordEncoder passwordEncoder;

    // Allow multiple local dev ports for frontend development (3000-3010 + 5173)
    // Allow all localhost origins for development (any port)
    // In production, configure allowed-origins explicitly
    @Value("${cors.allowed-origins:http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004,http://localhost:3005,http://localhost:3006,http://localhost:3007,http://localhost:3008,http://localhost:3009,http://localhost:3010,http://localhost:5173}")
    private List<String> allowedOrigins;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Public auth endpoints (tenant)
                        .requestMatchers("/api/auth/**").permitAll()
                        // Public auth endpoints (platform)
                        .requestMatchers("/platform/auth/**").permitAll()
                        // Static resources
                        .requestMatchers("/static/**", "/favicon.ico").permitAll()
                        // Actuator health (used by Docker healthcheck, only exposed internally)
                        .requestMatchers("/actuator/health").permitAll()
                        // All other requests require authentication
                        .anyRequest().authenticated()
                )
                // Security headers filter (applied first)
                .addFilterBefore(securityHeadersFilter, UsernamePasswordAuthenticationFilter.class)
                // JWT authentication filter (register first so it can be referenced below)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                // MDC filter: runs before JWT auth, sets requestId for all requests
                .addFilterBefore(mdcFilter, JwtAuthenticationFilter.class)
                // Platform admin authentication filter (for platform admin APIs)
                .addFilterAfter(platformAuthenticationFilter, JwtAuthenticationFilter.class)
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setContentType("application/json;charset=UTF-8");
                            response.setStatus(401);
                            response.getWriter().write("{\"code\":401,\"message\":\"未登录或登录已过期\"}");
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setContentType("application/json;charset=UTF-8");
                            response.setStatus(403);
                            response.getWriter().write("{\"code\":403,\"message\":\"无权限访问\"}");
                        })
                );

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        // Delegates to EnhancedPasswordEncoder which supports Argon2id (Phase 13) and BCrypt.
        return new SpringSecurityPasswordEncoderAdapter(passwordEncoder);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
