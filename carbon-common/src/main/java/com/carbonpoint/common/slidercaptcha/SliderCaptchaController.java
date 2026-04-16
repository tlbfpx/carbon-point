package com.carbonpoint.common.slidercaptcha;

import com.carbonpoint.common.result.Result;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 滑动拼图验证码接口。
 */
@Slf4j
@RestController
@RequestMapping("/api/captcha")
@RequiredArgsConstructor
public class SliderCaptchaController {

    private final SliderCaptchaService sliderCaptchaService;

    /**
     * 获取滑动拼图验证码。
     */
    @GetMapping("/slider")
    public Result<SliderCaptchaService.SliderCaptchaResponse> getSliderCaptcha() {
        var response = sliderCaptchaService.generate();
        return Result.success(response);
    }

    /**
     * 验证滑动位置。
     */
    @PostMapping("/slider/verify")
    public Result<Boolean> verify(VerifyRequest request) {
        boolean passed = sliderCaptchaService.verify(request.getCaptchaId(), request.getX(), true);
        return Result.success(passed);
    }

    @Data
    public static class VerifyRequest {
        private String captchaId;
        private int x;
    }
}
