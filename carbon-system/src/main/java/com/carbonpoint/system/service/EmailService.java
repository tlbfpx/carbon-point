package com.carbonpoint.system.service;

/**
 * 邮件服务接口。
 * <p>
 * 支持频率限制：同一用户同一类型每天最多 1 封邮件。
 * 发送失败时记录日志，延迟 2 小时重试。
 * </p>
 */
public interface EmailService {

    /**
     * 发送邮件。
     *
     * @param userId  用户ID
     * @param email   收件人邮箱
     * @param type    通知类型
     * @param subject 邮件主题
     * @param content 邮件正文（HTML）
     * @return 发送是否成功（频率限制返回 true 但不实际发送）
     */
    boolean sendEmail(Long userId, String email, String type, String subject, String content);

    /**
     * 检查是否为必要邮件类型（不可频率限制）。
     */
    boolean isRequiredEmail(String type);
}
