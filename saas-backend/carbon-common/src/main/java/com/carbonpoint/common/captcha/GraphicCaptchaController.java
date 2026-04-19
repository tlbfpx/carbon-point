package com.carbonpoint.common.captcha;

import com.carbonpoint.common.result.Result;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * 图形验证码接口。
 */
@Slf4j
@RestController
@RequestMapping("/api/captcha")
@RequiredArgsConstructor
public class GraphicCaptchaController {

    private final GraphicCaptchaService captchaService;

    /**
     * 获取图形验证码。
     *
     * 返回 captchaId（用于验证时提交）和 image Base64 数据。
     */
    @GetMapping("/graphic")
    public Result<GraphicCaptchaResponse> getGraphicCaptcha() {
        String captchaId = UUID.randomUUID().toString();
        String imageData = captchaService.generate(captchaId);
        return Result.success(new GraphicCaptchaResponse(captchaId, imageData));
    }

    @Data
    @AllArgsConstructor
    public static class GraphicCaptchaResponse {
        private String captchaId;
        private String imageData;
    }
}
