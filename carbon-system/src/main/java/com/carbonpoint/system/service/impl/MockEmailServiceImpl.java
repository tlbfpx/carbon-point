package com.carbonpoint.system.service.impl;

import com.carbonpoint.system.entity.EmailSendLog;
import com.carbonpoint.system.mapper.EmailSendLogMapper;
import com.carbonpoint.system.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Set;

/**
 * 邮件服务实现。
 * <p>
 * 支持两种模式：
 * - Mock 模式（开发/测试）：仅记录日志，不真实发送
 * - 生产模式：使用 Spring Mail 发送真实邮件
 * </p>
 */
@Slf4j
@Service
@Profile("test")
@RequiredArgsConstructor
public class MockEmailServiceImpl implements EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    private final EmailSendLogMapper emailSendLogMapper;

    @Value("${spring.mail.username:noreply@carbon-point.com}")
    private String fromAddress;

    /**
     * 必要邮件类型（不可频率限制，必须发送）。
     */
    private static final Set<String> REQUIRED_EMAIL_TYPES = Set.of(
            "tenant_suspended",
            "user_disabled"
    );

    /**
     * 通知类型 → 邮件主题前缀的映射。
     */
    private static final Set<String> EMAIL_ENABLED_TYPES = Set.of(
            "level_up",
            "badge_earned",
            "coupon_expiring",
            "order_fulfilled",
            "order_expired",
            "tenant_suspended",
            "user_disabled",
            "point_expired",
            "invite_expiring"
    );

    @Override
    public boolean sendEmail(Long userId, String email, String type, String subject, String content) {
        if (email == null || email.isBlank()) {
            log.debug("邮箱为空，跳过发送: userId={}, type={}", userId, type);
            return false;
        }

        if (!EMAIL_ENABLED_TYPES.contains(type)) {
            return true; // 不支持的类型，不计入频率限制
        }

        // 频率检查：非必要类型，同一用户同一类型每天最多 1 封
        if (!REQUIRED_EMAIL_TYPES.contains(type) && hasReachedDailyLimit(userId, type)) {
            log.info("邮件频率限制: userId={}, type={}，今日已达上限", userId, type);
            return false;
        }

        EmailSendLog sendLog = new EmailSendLog();
        sendLog.setUserId(userId);
        sendLog.setEmail(email);
        sendLog.setType(type);
        sendLog.setSubject(subject);
        sendLog.setContent(content);
        sendLog.setRetryCount(0);

        try {
            boolean sent = send(email, subject, content);
            if (sent) {
                sendLog.setResult("success");
                log.info("邮件发送成功: userId={}, type={}, to={}", userId, type, maskEmail(email));
            } else {
                sendLog.setResult("failed");
                sendLog.setErrorMsg("邮件网关返回失败");
                sendLog.setNextRetryAt(LocalDateTime.now().plusHours(2));
                log.warn("邮件发送失败: userId={}, type={}", userId, type);
            }
        } catch (Exception e) {
            sendLog.setResult("error");
            sendLog.setErrorMsg(e.getMessage());
            sendLog.setNextRetryAt(LocalDateTime.now().plusHours(2));
            log.error("邮件发送异常: userId={}, type={}", userId, type, e);
        }

        emailSendLogMapper.insert(sendLog);
        return "success".equals(sendLog.getResult());
    }

    @Override
    public boolean isRequiredEmail(String type) {
        return REQUIRED_EMAIL_TYPES.contains(type);
    }

    private boolean hasReachedDailyLimit(Long userId, String type) {
        return emailSendLogMapper.countTodayByUserIdAndType(userId, type) > 0;
    }

    /**
     * 发送邮件。
     * 开发环境仅记录日志，生产环境真实发送。
     */
    private boolean send(String to, String subject, String content) {
        // Mock 模式：仅记录日志
        log.info("[Email Mock] 发送邮件至 {}: 主题={}", maskEmail(to), subject);
        return true;
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return email;
        int at = email.indexOf('@');
        if (at <= 1) return email;
        return email.substring(0, 1) + "***" + email.substring(at);
    }
}
