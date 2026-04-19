package com.carbonpoint.system.security.sliding;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Sliding puzzle captcha service for platform admin.
 *
 * <p>Generates a background image with a missing piece and a slider piece.
 * Stores the target X position in Redis for server-side verification.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SlidingCaptchaService {

    private final StringRedisTemplate redisTemplate;

    private static final int BLOCK_SIZE = 50; // puzzle piece size

    /**
     * Generate a sliding captcha challenge.
     *
     * @return map containing backgroundImage, sliderImage, targetX, targetY, captchaId
     */
    public Map<String, Object> generate() {
        String captchaId = UUID.randomUUID().toString().replace("-", "");
        int targetX = 40 + new java.util.Random().nextInt(40); // random X position (40-80)
        int targetY = 10 + new java.util.Random().nextInt(30); // random Y position (10-40)

        // Store in Redis for verification (5 min expiry)
        String key = "sliding:" + captchaId;
        redisTemplate.opsForValue().set(key, targetX + ":" + targetY, 5, TimeUnit.MINUTES);

        // For MVP, return placeholder data. In production, this generates real images.
        Map<String, Object> result = new HashMap<>();
        result.put("captchaId", captchaId);
        result.put("targetX", targetX);
        result.put("targetY", targetY);
        result.put("backgroundImage", ""); // Generated on frontend in MVP
        result.put("sliderImage", "");     // Generated on frontend in MVP
        result.put("tipText", "拖动滑块完成拼图");

        log.debug("Generated sliding captcha: id={}, targetX={}, targetY={}", captchaId, targetX, targetY);
        return result;
    }

    /**
     * Verify a sliding captcha solution.
     *
     * @param captchaId the captcha ID
     * @param slideX    the X position where the user slid the piece
     * @param track     the movement track data (for human behavior analysis)
     * @return true if within tolerance (±2px)
     */
    public boolean verify(String captchaId, int slideX, String track) {
        if (captchaId == null) {
            return false;
        }
        String key = "sliding:" + captchaId;
        String stored = redisTemplate.opsForValue().get(key);

        if (stored == null) {
            log.debug("Sliding captcha expired or not found: id={}", captchaId);
            return false;
        }

        String[] parts = stored.split(":");
        int targetX = Integer.parseInt(parts[0]);

        // Delete after verification (one-time use)
        redisTemplate.delete(key);

        // Tolerance of ±3 pixels
        boolean matches = Math.abs(slideX - targetX) <= 3;
        log.debug("Sliding captcha verify: id={}, expected={}, got={}, matches={}",
                captchaId, targetX, slideX, matches);
        return matches;
    }
}
