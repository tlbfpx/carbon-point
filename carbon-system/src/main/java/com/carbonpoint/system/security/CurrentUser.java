package com.carbonpoint.system.security;

import com.carbonpoint.common.security.JwtUserPrincipal;
import com.carbonpoint.common.tenant.TenantContext;
import lombok.Data;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;

/**
 * Holds the current authenticated user's identity for the request scope.
 * Populated by JwtAuthenticationFilter via SecurityContextHolder.
 */
@Data
@Component
public class CurrentUser {

    private Long userId;
    private Long tenantId;
    private String phone;
    private String nickname;
    private List<String> roles;

    /**
     * Initialize from the JWT principal in SecurityContext.
     * Called by controllers/services that need current user info.
     */
    public void initFromSecurityContext() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof JwtUserPrincipal principal) {
            this.userId = principal.getUserId();
            this.tenantId = principal.getTenantId();
            this.roles = principal.getRoles();
        }
    }

    public boolean isPlatformAdmin() {
        return tenantId == null || tenantId == 0L;
    }

    public Long resolveTenantId() {
        if (tenantId != null && tenantId != 0L) {
            return tenantId;
        }
        // Platform admin querying with explicit tenant param
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            HttpServletRequest request = attrs.getRequest();
            String tenantIdParam = request.getParameter("tenantId");
            if (tenantIdParam != null) {
                return Long.valueOf(tenantIdParam);
            }
        }
        return TenantContext.getTenantId();
    }
}
