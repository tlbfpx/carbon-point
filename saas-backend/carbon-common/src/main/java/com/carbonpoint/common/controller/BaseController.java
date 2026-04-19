package com.carbonpoint.common.controller;

import com.carbonpoint.common.result.Result;
import com.carbonpoint.common.security.JwtUserPrincipal;
import com.carbonpoint.common.tenant.TenantContext;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Base controller with common utility methods.
 */
public abstract class BaseController {

    /**
     * Get the current authenticated user ID.
     */
    protected Long getCurrentUserId() {
        JwtUserPrincipal principal = getCurrentUser();
        return principal != null ? principal.getUserId() : null;
    }

    /**
     * Get the current tenant ID from TenantContext.
     */
    protected Long getCurrentTenantId() {
        return TenantContext.getTenantId();
    }

    /**
     * Get the current authenticated user's principal.
     */
    protected JwtUserPrincipal getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof JwtUserPrincipal) {
            return (JwtUserPrincipal) authentication.getPrincipal();
        }
        return null;
    }

    /**
     * Wrap a successful result.
     */
    protected <T> Result<T> success() {
        return Result.success();
    }

    /**
     * Wrap a successful result with data.
     */
    protected <T> Result<T> success(T data) {
        return Result.success(data);
    }

    /**
     * Wrap a successful result with custom message.
     */
    protected <T> Result<T> success(T data, String message) {
        return Result.success(data, message);
    }
}
