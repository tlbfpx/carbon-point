package com.carbonpoint.system.security.sliding;

import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.result.Result;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Sliding puzzle captcha controller for platform admin login.
 */
@RestController
@RequestMapping("/platform/auth/captcha")
@RequiredArgsConstructor
public class SlidingCaptchaController {

    private final SlidingCaptchaService slidingCaptchaService;

    /**
     * Generate a sliding captcha challenge.
     */
    @GetMapping("/generate")
    public Result<Map<String, Object>> generate() {
        return Result.success(slidingCaptchaService.generate());
    }

    /**
     * Verify sliding captcha answer.
     *
     * @param captchaId the captcha ID
     * @param slideX    the X position of the slider
     * @param track     movement track data
     * @return verification result with verifyToken on success
     */
    @PostMapping("/verify")
    public Result<VerifyResult> verify(@RequestParam String captchaId,
                                        @RequestParam int slideX,
                                        @RequestParam(required = false) String track) {
        boolean valid = slidingCaptchaService.verify(captchaId, slideX, track);
        if (!valid) {
            return Result.error(ErrorCode.AUTH_CAPTCHA_WRONG, "验证失败，请重试");
        }
        return Result.success(new VerifyResult(true, "验证成功"));
    }

    public record VerifyResult(boolean success, String message) {
    }
}
