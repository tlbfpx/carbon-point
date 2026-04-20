package com.carbonpoint.system.controller;

import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.result.Result;
import com.carbonpoint.system.dto.req.*;
import com.carbonpoint.system.dto.res.AuthRes;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.mapper.UserMapper;
import com.carbonpoint.system.security.CurrentUser;
import com.carbonpoint.system.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final CurrentUser currentUser;
    private final UserMapper userMapper;

    @PostMapping("/login")
    public Result<AuthRes> login(@RequestBody LoginReq req, HttpServletRequest httpReq) {
        String clientIp = getClientIp(httpReq);
        return Result.success(authService.login(req, clientIp));
    }

    @PostMapping("/register")
    public Result<AuthRes> register(@RequestBody RegisterReq req) {
        return Result.success(authService.register(req));
    }

    @PostMapping("/send-sms-code")
    public Result<Void> sendSmsCode(@RequestParam String phone) {
        authService.sendSmsCode(phone);
        return Result.success();
    }

    @PostMapping("/refresh")
    public Result<AuthRes> refresh(@RequestBody RefreshTokenReq req, HttpServletRequest httpReq) {
        String clientIp = getClientIp(httpReq);
        return Result.success(authService.refreshToken(req.getRefreshToken(),
                req.getDeviceFingerprint(), clientIp));
    }

    @PostMapping("/logout")
    public Result<Void> logout(@RequestBody RefreshTokenReq req) {
        authService.logout(req.getRefreshToken());
        return Result.success();
    }

    @GetMapping("/current")
    public Result<AuthRes.UserInfo> getCurrentUser() {
        currentUser.initFromSecurityContext();
        if (currentUser.getUserId() == null) {
            return Result.error(com.carbonpoint.common.result.ErrorCode.UNAUTHORIZED);
        }
        User user = userMapper.selectById(currentUser.getUserId());
        if (user == null) {
            return Result.error(ErrorCode.USER_NOT_FOUND);
        }
        return Result.success(AuthRes.UserInfo.builder()
                .userId(user.getId())
                .tenantId(user.getTenantId())
                .phone(maskPhone(user.getPhone()))
                .nickname(user.getNickname())
                .avatar(user.getAvatar())
                .level(user.getLevel())
                .status(user.getStatus())
                .build());
    }

    /**
     * Extract client IP from request, handling X-Forwarded-For proxy header.
     */
    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            // X-Forwarded-For can contain multiple IPs: client, proxy1, proxy2
            return xff.split(",")[0].trim();
        }
        String xri = request.getHeader("X-Real-IP");
        if (xri != null && !xri.isBlank()) {
            return xri.trim();
        }
        return request.getRemoteAddr();
    }

    /**
     * Mask phone number for privacy: 138****8888
     */
    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) return phone;
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }
}
