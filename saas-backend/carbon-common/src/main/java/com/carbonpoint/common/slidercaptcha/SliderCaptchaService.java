package com.carbonpoint.common.slidercaptcha;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.concurrent.TimeUnit;

/**
 * 滑动拼图验证码服务。
 * <p>
 * 算法：在背景图上挖一个拼图块，用户需要将拼图块滑动到正确位置。
 * 验证通过条件：x 坐标误差小于允许容差值。
 */
@Slf4j
@Service
public class SliderCaptchaService {

    private final RedisTemplate<String, String> redisTemplate;
    private final SecureRandom random = new SecureRandom();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // 配置参数
    private static final int DEFAULT_WIDTH = 300;
    private static final int DEFAULT_HEIGHT = 150;
    private static final int BLOCK_SIZE = 40;
    private static final int TOLERANCE = 5; // x 坐标容差（像素）
    private static final int EXPIRATION_MINUTES = 5;
    private static final String REDIS_KEY_PREFIX = "captcha:slider:";

    public SliderCaptchaService(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * 生成滑动拼图验证码。
     *
     * @return 包含 captchaId、背景图 base64、拼图块 base64
     */
    public SliderCaptchaResponse generate() {
        int width = DEFAULT_WIDTH;
        int height = DEFAULT_HEIGHT;
        int blockSize = BLOCK_SIZE;

        // 随机目标位置 x 坐标（确保不超出边界）
        int targetX = blockSize + random.nextInt(width - blockSize * 2);
        int targetY = random.nextInt(height - blockSize);

        // 创建背景图
        BufferedImage background = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D gBg = background.createGraphics();

        // 填充渐变背景
        GradientPaint gp = new GradientPaint(
                0, 0, new Color(random.nextInt(200), random.nextInt(200), random.nextInt(200)),
                width, height, new Color(random.nextInt(200), random.nextInt(200), random.nextInt(200))
        );
        gBg.setPaint(gp);
        gBg.fillRect(0, 0, width, height);

        // 添加一些随机噪点
        for (int i = 0; i < 200; i++) {
            int x = random.nextInt(width);
            int y = random.nextInt(height);
            gBg.setColor(new Color(random.nextInt(255), random.nextInt(255), random.nextInt(255), 100));
            gBg.fillRect(x, y, 1 + random.nextInt(3), 1 + random.nextInt(3));
        }

        // 创建拼图块图像
        BufferedImage blockImage = new BufferedImage(blockSize, blockSize, BufferedImage.TYPE_INT_ARGB);
        Graphics2D gBlock = blockImage.createGraphics();

        // 挖取背景上对应位置给拼图块
        int round = blockSize / 8;
        Shape rounded = new java.awt.geom.RoundRectangle2D.Float(
                0, 0, blockSize, blockSize, round, round
        );
        gBlock.clip(rounded);
        // 从背景复制对应区域到拼图块
        BufferedImage blockSource = background.getSubimage(targetX, targetY, blockSize, blockSize);
        gBg.setColor(Color.WHITE);
        // 挖空背景对应位置（留缺口）
        gBg.fillRoundRect(targetX, targetY, blockSize, blockSize, round, round);
        gBlock.drawImage(blockSource, 0, 0, null);
        // 给拼图块加边框
        gBlock.setColor(Color.DARK_GRAY);
        gBlock.drawRoundRect(0, 0, blockSize - 1, blockSize - 1, round, round);

        gBlock.dispose();
        gBg.dispose();

        // 存储正确位置到 Redis
        String captchaId = java.util.UUID.randomUUID().toString();
        String redisKey = REDIS_KEY_PREFIX + captchaId;
        try {
            String json = objectMapper.writeValueAsString(new CaptchaData(targetX, targetY));
            redisTemplate.opsForValue().set(redisKey, json, EXPIRATION_MINUTES, TimeUnit.MINUTES);
        } catch (Exception e) {
            log.error("Failed to save slider captcha to redis", e);
        }

        // 编码为 Base64
        String bgBase64 = encodeToBase64(background);
        String blockBase64 = encodeToBase64(blockImage);

        return new SliderCaptchaResponse(captchaId, bgBase64, blockBase64, targetY, blockSize);
    }

    /**
     * 验证滑动位置是否正确。
     *
     * @param captchaId 验证码 ID
     * @param userX 用户滑动结束 x 坐标
     * @param deleteOnSuccess 验证成功后删除
     * @return true = 验证通过
     */
    public boolean verify(String captchaId, int userX, boolean deleteOnSuccess) {
        String redisKey = REDIS_KEY_PREFIX + captchaId;
        String data = redisTemplate.opsForValue().get(redisKey);
        if (data == null) {
            return false;
        }
        try {
            CaptchaData captchaData = objectMapper.readValue(data, CaptchaData.class);
            int diff = Math.abs(captchaData.targetX() - userX);
            boolean passed = diff <= TOLERANCE;
            if (passed && deleteOnSuccess) {
                redisTemplate.delete(redisKey);
            }
            return passed;
        } catch (Exception e) {
            log.error("Failed to parse slider captcha data", e);
            return false;
        }
    }

    public void clear(String captchaId) {
        String redisKey = REDIS_KEY_PREFIX + captchaId;
        redisTemplate.delete(redisKey);
    }

    private String encodeToBase64(BufferedImage image) {
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, "png", baos);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(baos.toByteArray());
        } catch (Exception e) {
            log.error("Failed to encode image", e);
            return "";
        }
    }

    private record CaptchaData(int targetX, int targetY) {}

    @lombok.Data
    @lombok.AllArgsConstructor
    public static class SliderCaptchaResponse {
        private String captchaId;
        private String backgroundImage;
        private String blockImage;
        private int targetY;
        private int blockSize;
    }
}
