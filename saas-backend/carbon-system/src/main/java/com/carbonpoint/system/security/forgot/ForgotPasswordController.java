package com.carbonpoint.system.security.forgot;

import com.carbonpoint.common.result.Result;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

/**
 * Forgot password API endpoints.
 */
@RestController
@RequestMapping("/api/auth/forgot")
@RequiredArgsConstructor
@Validated
public class ForgotPasswordController {

    private final ForgotPasswordService forgotPasswordService;

    /**
     * Send a password reset code via SMS or email.
     *
     * @param request contains phoneOrEmail
     * @return success message
     */
    @PostMapping("/send-code")
    public Result<SendCodeResponse> sendCode(@RequestBody @Validated SendCodeRequest request) {
        String channel = forgotPasswordService.sendResetCode(request.phoneOrEmail());
        return Result.success(new SendCodeResponse(channel, "验证码已发送"));
    }

    /**
     * Validate the reset code and get a reset token.
     *
     * @param request contains phoneOrEmail and code
     * @return reset token
     */
    @PostMapping("/validate-code")
    public Result<ValidateCodeResponse> validateCode(@RequestBody @Validated ValidateCodeRequest request) {
        String resetToken = forgotPasswordService.validateCode(request.phoneOrEmail(), request.code());
        return Result.success(new ValidateCodeResponse(resetToken, "验证成功"));
    }

    /**
     * Reset password using a valid reset token.
     *
     * @param request contains resetToken and newPassword
     * @return success message
     */
    @PostMapping("/reset")
    public Result<String> resetPassword(@RequestBody @Validated ResetPasswordRequest request) {
        forgotPasswordService.resetPassword(request.resetToken(), request.newPassword());
        return Result.success("密码重置成功，请使用新密码登录");
    }

    // ─── Request/Response DTOs ────────────────────────────────────────────────

    public record SendCodeRequest(
            @NotBlank(message = "手机号或邮箱不能为空") String phoneOrEmail
    ) {
    }

    public record SendCodeResponse(String channel, String message) {
    }

    public record ValidateCodeRequest(
            @NotBlank(message = "手机号或邮箱不能为空") String phoneOrEmail,
            @NotBlank(message = "验证码不能为空") String code
    ) {
    }

    public record ValidateCodeResponse(String resetToken, String message) {
    }

    public record ResetPasswordRequest(
            @NotBlank(message = "重置令牌不能为空") String resetToken,
            @NotBlank(message = "新密码不能为空") String newPassword
    ) {
    }
}
