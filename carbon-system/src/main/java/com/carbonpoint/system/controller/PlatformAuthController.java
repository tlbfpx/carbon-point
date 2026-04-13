package com.carbonpoint.system.controller;

import com.carbonpoint.common.result.Result;
import com.carbonpoint.system.dto.PlatformAuthResponse;
import com.carbonpoint.system.dto.PlatformLoginRequest;
import com.carbonpoint.system.dto.RefreshTokenRequest;
import com.carbonpoint.system.service.PlatformAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * Platform admin authentication controller.
 * Endpoints: POST /platform/auth/login, POST /platform/auth/refresh, POST /platform/auth/logout
 */
@RestController
@RequestMapping("/platform/auth")
@RequiredArgsConstructor
public class PlatformAuthController {

    private final PlatformAuthService authService;

    /**
     * Platform admin login.
     */
    @PostMapping("/login")
    public Result<PlatformAuthResponse> login(@Valid @RequestBody PlatformLoginRequest request,
                                               HttpServletRequest httpReq) {
        String clientIp = getClientIp(httpReq);
        PlatformAuthResponse response = authService.login(request.getUsername(), request.getPassword(),
                request.getDeviceFingerprint(), clientIp);
        return Result.success(response);
    }

    /**
     * Refresh access token.
     */
    @PostMapping("/refresh")
    public Result<PlatformAuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest request,
                                                 HttpServletRequest httpReq) {
        String clientIp = getClientIp(httpReq);
        PlatformAuthResponse response = authService.refreshToken(request.getRefreshToken(),
                request.getDeviceFingerprint(), clientIp);
        return Result.success(response);
    }

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        String xri = request.getHeader("X-Real-IP");
        if (xri != null && !xri.isBlank()) {
            return xri.trim();
        }
        return request.getRemoteAddr();
    }

    /**
     * Platform admin logout.
     */
    @PostMapping("/logout")
    public Result<Void> logout() {
        // Admin info is available from PlatformAdminContext (set by the auth filter)
        // For logout, we just return success - token invalidation is handled client-side
        return Result.success();
    }
}
