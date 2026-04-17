package com.carbonpoint.system.service.impl;

import com.carbonpoint.system.entity.EmailSendLog;
import com.carbonpoint.system.mapper.EmailSendLogMapper;
import com.carbonpoint.system.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * 邮件服务实现。
 * <p>
 * 支持频率限制：同一用户同一类型每天最多 1 封邮件。
 * 发送失败时记录日志，延迟 2 小时重试。
 * </p>
 * <p>
 * TODO: 接入真实邮件网关（阿里云邮件推送 / 腾讯云 SES / SendGrid 等）
 * 当前实现为模拟发送，生产环境需要替换为真实的邮件服务调用。
 * </p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

    private final EmailSendLogMapper emailSendLogMapper;

    /**
     * 通知类型→邮件模板类型的映射。
     */
    private static final Map<String, String> TYPE_TO_EMAIL_TEMPLATE = Map.of(
            "point_expiring", "积分过期预警",
            "point_expired", "积分已过期",
            "level_up", "等级升级通知",
            "order_fulfilled", "订单履约完成",
            "tenant_suspended", "企业停用通知",
            "user_disabled", "账户停用通知"
    );

    /**
     * 必要通知类型（不可关闭、必须邮件）。
     */
    private static final java.util.Set<String> REQUIRED_EMAIL_TYPES = java.util.Set.of(
            "tenant_suspended",
            "user_disabled"
    );

    @Override
    public boolean sendEmail(Long userId, String email, String type, String subject, String content) {
        // 频率检查：同一用户同一类型每天最多 1 封
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
                log.info("邮件发送成功: userId={}, type={}", userId, type);
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

    private boolean hasReachedDailyLimit(Long userId, String type) {
        return emailSendLogMapper.countTodayByUserIdAndType(userId, type) > 0;
    }

    /**
     * 调用邮件网关发送邮件。
     * TODO: 接入真实邮件网关（阿里云邮件推送 / 腾讯云 SES / SendGrid 等）
     *
     * @param email   收件人邮箱
     * @param subject 邮件主题
     * @param content 邮件正文（HTML）
     * @return 发送是否成功
     */
    private boolean send(String email, String subject, String content) {
        // 模拟发送成功
        log.info("[Email Mock] 发送邮件至 {}: {}", email, subject);
        return true;
    }

    @Override
    public boolean isRequiredEmail(String type) {
        return REQUIRED_EMAIL_TYPES.contains(type);
    }
}
