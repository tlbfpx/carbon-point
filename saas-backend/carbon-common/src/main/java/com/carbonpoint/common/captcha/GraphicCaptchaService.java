package com.carbonpoint.common.captcha;

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
 * 图形验证码服务。
 * <p>
 * 生成 4-6 位验证码，添加干扰线和干扰点，结果存储到 Redis，
 * 返回 Base64 编码的图片数据。
 */
@Slf4j
@Service
public class GraphicCaptchaService {

    private final RedisTemplate<String, String> redisTemplate;
    private final SecureRandom random = new SecureRandom();

    // 验证码配置
    private static final int DEFAULT_WIDTH = 120;
    private static final int DEFAULT_HEIGHT = 40;
    private static final int DEFAULT_LENGTH = 4;
    private static final int EXPIRATION_MINUTES = 5;
    private static final int INTERFERENCE_LINES = 4;
    private static final int INTERFERENCE_POINTS = 20;

    private static final String[] COLORS = {
            "#000000", "#0000FF", "#00FF00", "#00FFFF", "#FF0000", "#FF00FF", "#FFFF00", "#000000"
    };

    private static final char[] CODE_CHARS = {
            '2', '3', '4', '5', '6', '7', '8', '9',
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M',
            'N', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
    };

    private static final String REDIS_KEY_PREFIX = "captcha:graphic:";

    public GraphicCaptchaService(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * 生成图形验证码。
     *
     * @param captchaId 验证码唯一 ID（一般是 sessionId 或 requestId）
     * @return Base64 编码的图片数据
     */
    public String generate(String captchaId) {
        int width = DEFAULT_WIDTH;
        int height = DEFAULT_HEIGHT;
        int length = DEFAULT_LENGTH;

        // 创建 buffered image
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();

        // 背景
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, width, height);

        // 干扰线
        for (int i = 0; i < INTERFERENCE_LINES; i++) {
            int x1 = random.nextInt(width);
            int y1 = random.nextInt(height);
            int x2 = random.nextInt(width);
            int y2 = random.nextInt(height);
            g.setColor(getRandomColor());
            g.drawLine(x1, y1, x2, y2);
        }

        // 干扰点
        for (int i = 0; i < INTERFERENCE_POINTS; i++) {
            int x = random.nextInt(width);
            int y = random.nextInt(height);
            g.setColor(getRandomColor());
            g.fillRect(x, y, 1, 1);
        }

        // 生成验证码文字
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < length; i++) {
            char c = CODE_CHARS[random.nextInt(CODE_CHARS.length)];
            code.append(c);
            Color color = getRandomColor();
            g.setColor(color);
            g.setFont(getRandomFont());
            float x = (width / (length + 1f)) * (i + 0.5f);
            float y = height * 0.7f;
            g.drawString(String.valueOf(c), x, y);
        }

        g.dispose();

        // 存储到 Redis
        String codeStr = code.toString();
        String redisKey = REDIS_KEY_PREFIX + captchaId;
        redisTemplate.opsForValue().set(redisKey, codeStr.toLowerCase(), EXPIRATION_MINUTES, TimeUnit.MINUTES);

        // 转换为 Base64
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, "png", baos);
            byte[] bytes = baos.toByteArray();
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(bytes);
        } catch (Exception e) {
            log.error("Failed to encode captcha image", e);
            return "";
        }
    }

    /**
     * 验证用户输入的验证码是否正确。
     *
     * @param captchaId   验证码 ID
     * @param userInput 用户输入
     * @param deleteOnSuccess 验证成功后是否删除
     * @return true = 验证通过
     */
    public boolean verify(String captchaId, String userInput, boolean deleteOnSuccess) {
        if (userInput == null || userInput.isBlank()) {
            return false;
        }
        String redisKey = REDIS_KEY_PREFIX + captchaId;
        String stored = redisTemplate.opsForValue().get(redisKey);
        if (stored == null) {
            return false;
        }
        boolean matched = stored.equalsIgnoreCase(userInput.trim().toLowerCase());
        if (matched && deleteOnSuccess) {
            redisTemplate.delete(redisKey);
        }
        return matched;
    }

    /**
     * 验证成功后清除验证码。
     */
    public void clear(String captchaId) {
        String redisKey = REDIS_KEY_PREFIX + captchaId;
        redisTemplate.delete(redisKey);
    }

    private Color getRandomColor() {
        String hex = COLORS[random.nextInt(COLORS.length)];
        int r = Integer.parseInt(hex.substring(1, 3), 16);
        int g = Integer.parseInt(hex.substring(3, 5), 16);
        int b = Integer.parseInt(hex.substring(5, 7), 16);
        return new Color(r, g, b);
    }

    private Font getRandomFont() {
        String[] fonts = {"Arial", "Verdana", "Times New Roman"};
        int size = 28 + random.nextInt(8);
        int style = random.nextInt(3);
        return new Font(fonts[random.nextInt(fonts.length)], style, size);
    }
}
