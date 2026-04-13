package com.carbonpoint.system.security.captcha;

import com.carbonpoint.common.result.Result;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Captcha API endpoints.
 */
@Slf4j
@RestController
@RequestMapping("/api/auth/captcha")
@RequiredArgsConstructor
public class CaptchaController {

    private final CaptchaService captchaService;

    /**
     * Generate a new graphic captcha.
     *
     * @return captcha uuid and base64 image
     */
    @GetMapping("/generate")
    public Result<CaptchaVO> generate() {
        CaptchaService.CaptchaResult result = captchaService.generate();
        return Result.success(new CaptchaVO(result.uuid(), result.imageBase64()));
    }

    /**
     * Verify a captcha code.
     *
     * @param uuid captcha UUID
     * @param code user's input code
     * @return verification result
     */
    @GetMapping("/verify")
    public Result<Boolean> verify(@RequestParam String uuid, @RequestParam String code) {
        boolean valid = captchaService.verify(uuid, code);
        if (!valid) {
            return Result.error(4001, "验证码错误或已过期");
        }
        return Result.success(true, "验证成功");
    }

    public record CaptchaVO(String uuid, String imageBase64) {
    }
}
