package com.carbonpoint.system.service;

import com.carbonpoint.system.entity.SmsSendLog;
import com.carbonpoint.system.mapper.SmsSendLogMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * 短信服务。
 * <p>
 * 支持频率限制：同一用户同一类型每天最多 1 条短信。
 * 发送失败时记录日志，延迟 2 小时重试。
 * </p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SmsService {

    private final SmsSendLogMapper smsSendLogMapper;

    /**
     * 通知类型→短信模板类型的映射。
     */
    private static final Map<String, String> TYPE_TO_SMS_TEMPLATE = Map.of(
            "point_expiring", "积分过期预警",
            "point_expired", "积分已过期",
            "tenant_suspended", "企业停用通知",
            "user_disabled", "账户停用通知"
    );

    /**
     * 必要通知类型（不可关闭、必须短信）。
     */
    private static final java.util.Set<String> REQUIRED_SMS_TYPES = java.util.Set.of(
            "tenant_suspended",
            "user_disabled"
    );

    /**
     * 发送短信。
     *
     * @param userId  用户ID
     * @param phone   手机号
     * @param type    通知类型
     * @param content 短信内容
     * @return 发送是否成功（频率限制返回 true 但不实际发送）
     */
    public boolean sendSms(Long userId, String phone, String type, String content) {
        // 频率检查：同一用户同一类型每天最多 1 条
        if (!REQUIRED_SMS_TYPES.contains(type) && hasReachedDailyLimit(userId, type)) {
            log.info("短信频率限制: userId={}, type={}，今日已达上限", userId, type);
            return false;
        }

        SmsSendLog sendLog = new SmsSendLog();
        sendLog.setUserId(userId);
        sendLog.setPhone(phone);
        sendLog.setType(type);
        sendLog.setTemplateType(TYPE_TO_SMS_TEMPLATE.getOrDefault(type, type));
        sendLog.setContent(content);
        sendLog.setRetryCount(0);

        try {
            boolean sent = send(phone, content);
            if (sent) {
                sendLog.setResult("success");
                log.info("短信发送成功: userId={}, type={}", userId, type);
            } else {
                sendLog.setResult("failed");
                sendLog.setErrorMsg("短信网关返回失败");
                sendLog.setNextRetryAt(LocalDateTime.now().plusHours(2));
                log.warn("短信发送失败: userId={}, type={}", userId, type);
            }
        } catch (Exception e) {
            sendLog.setResult("error");
            sendLog.setErrorMsg(e.getMessage());
            sendLog.setNextRetryAt(LocalDateTime.now().plusHours(2));
            log.error("短信发送异常: userId={}, type={}", userId, type, e);
        }

        smsSendLogMapper.insert(sendLog);
        return "success".equals(sendLog.getResult());
    }

    private boolean hasReachedDailyLimit(Long userId, String type) {
        return smsSendLogMapper.countTodayByUserIdAndType(userId, type) > 0;
    }

    /**
     * 调用短信网关发送短信。
     * TODO: 接入真实短信网关（阿里云/腾讯云/梦网等）
     */
    private boolean send(String phone, String content) {
        // 模拟发送成功
        log.info("[SMS Mock] 发送短信至 {}: {}", phone, content);
        return true;
    }

    public boolean isRequiredSms(String type) {
        return REQUIRED_SMS_TYPES.contains(type);
    }
}
