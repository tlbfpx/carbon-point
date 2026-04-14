package com.carbonpoint.system.security.captcha;

import com.carbonpoint.common.security.SecurityProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Graphic captcha service.
 * Generates 4-character image captchas stored in Redis.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CaptchaService {

    private final StringRedisTemplate redisTemplate;
    private final SecurityProperties securityProperties;

    // Characters excluding confusing ones: 0/O, 1/I/l
    private static final String CAPTCHA_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
    private static final int IMG_WIDTH = 120;
    private static final int IMG_HEIGHT = 40;

    private final Random random = new Random();

    /**
     * Generate a new captcha image.
     *
     * @return captcha result containing uuid, base64 image, and answer
     */
    public CaptchaResult generate() {
        String uuid = UUID.randomUUID().toString().replace("-", "");
        String code = generateCode(securityProperties.getCaptcha().getLength());
        int expireMinutes = securityProperties.getCaptcha().getExpireMinutes();

        // Store in Redis
        String key = "captcha:" + uuid;
        redisTemplate.opsForValue().set(key, code.toLowerCase(), expireMinutes, TimeUnit.MINUTES);

        // Generate image
        String imageBase64 = generateImage(code);

        log.debug("Generated captcha: uuid={}, code={}", uuid, code);
        return new CaptchaResult(uuid, imageBase64, "data:image/png;base64," + imageBase64);
    }

    /**
     * Verify a captcha code.
     * Deletes the captcha from Redis after verification.
     *
     * @param uuid the captcha UUID
     * @param code the user's input code
     * @return true if code matches (case-insensitive)
     */
    public boolean verify(String uuid, String code) {
        if (uuid == null || code == null) {
            return false;
        }
        String key = "captcha:" + uuid;
        String stored = redisTemplate.opsForValue().get(key);

        if (stored == null) {
            log.debug("Captcha expired or not found: uuid={}", uuid);
            return false;
        }

        boolean matches = stored.equalsIgnoreCase(code);

        // Always delete after verification attempt (one-time use)
        redisTemplate.delete(key);

        if (!matches) {
            log.debug("Captcha mismatch: uuid={}, input={}, stored={}", uuid, code, stored);
        }
        return matches;
    }

    private String generateCode(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(CAPTCHA_CHARS.charAt(random.nextInt(CAPTCHA_CHARS.length())));
        }
        return sb.toString();
    }

    /**
     * Get captcha fonts with fallback chain.
     * Tries DejaVu Sans (available after font-dejavu install), then Lucida Sans,
     * then any available sans-serif, finally default Dialog.
     */
    private Font[] getCaptchaFonts() {
        // Preferred font names in order of preference
        String[] preferredFonts = {"DejaVu Sans", "Lucida Sans", "SansSerif", "Dialog"};
        Font[] result = new Font[4];

        for (int i = 0; i < result.length; i++) {
            result[i] = createFont(preferredFonts, Font.BOLD, 20 + (i * 2));
        }
        return result;
    }

    /**
     * Try to create a font from preferred names, falling back to default.
     */
    private Font createFont(String[] preferredNames, int style, int size) {
        for (String name : preferredNames) {
            try {
                Font font = new Font(name, style, size);
                if (canDisplay(font, 'A')) {
                    return font;
                }
            } catch (Exception e) {
                // try next
            }
        }
        // Ultimate fallback - Java's logical font always works
        return new Font(Font.SANS_SERIF, style, size);
    }

    private boolean canDisplay(Font font, char c) {
        return font.canDisplay(c);
    }

    private String generateImage(String code) {
        BufferedImage image = new BufferedImage(IMG_WIDTH, IMG_HEIGHT, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();

        try {
            // Background
            g.setColor(new Color(240, 244, 248));
            g.fillRect(0, 0, IMG_WIDTH, IMG_HEIGHT);

            // 干扰线
            for (int i = 0; i < 4; i++) {
                g.setColor(new Color(random.nextInt(200), random.nextInt(200), random.nextInt(200), 100));
                g.drawLine(random.nextInt(IMG_WIDTH), random.nextInt(IMG_HEIGHT),
                        random.nextInt(IMG_WIDTH), random.nextInt(IMG_HEIGHT));
            }

            // 干扰点
            for (int i = 0; i < 150; i++) {
                g.setColor(new Color(random.nextInt(200), random.nextInt(200), random.nextInt(200), 80));
                g.fillOval(random.nextInt(IMG_WIDTH), random.nextInt(IMG_HEIGHT), 2, 2);
            }

            // 渲染字符 - try DejaVu Sans first, then fall back to any available sans-serif
            Font[] fonts = getCaptchaFonts();

            int charWidth = IMG_WIDTH / code.length();
            for (int i = 0; i < code.length(); i++) {
                char ch = code.charAt(i);
                g.setFont(fonts[random.nextInt(fonts.length)]);

                // Random color for each character
                g.setColor(new Color(
                        20 + random.nextInt(80),
                        20 + random.nextInt(80),
                        20 + random.nextInt(80)
                ));

                // Slight rotation for each character
                double angle = (random.nextDouble() - 0.5) * 0.4;
                g.rotate(angle, i * charWidth + charWidth / 2f, IMG_HEIGHT / 2f);

                int y = IMG_HEIGHT / 2 + random.nextInt(10) - 5;
                g.drawString(String.valueOf(ch), i * charWidth + 5, y);

                g.rotate(-angle, i * charWidth + charWidth / 2f, IMG_HEIGHT / 2f);
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, "png", baos);
            return Base64.getEncoder().encodeToString(baos.toByteArray());

        } catch (IOException e) {
            log.error("Failed to generate captcha image", e);
            throw new RuntimeException("Failed to generate captcha image", e);
        } finally {
            g.dispose();
        }
    }

    public record CaptchaResult(String uuid, String code, String imageBase64) {
    }
}
