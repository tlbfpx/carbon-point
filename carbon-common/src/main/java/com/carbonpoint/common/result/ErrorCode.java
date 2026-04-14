package com.carbonpoint.common.result;

import lombok.Getter;

/**
 * Centralized business error codes.
 * Range allocation:
 * <ul>
 *   <li>CHECKIN_*:  10001–10100</li>
 *   <li>POINT_*:    10201–10300</li>
 *   <li>ORDER_*:    10401–10500</li>
 *   <li>USER_*:     10601–10700</li>
 *   <li>MALL_*:     10801–10900</li>
 *   <li>SYSTEM_*:   19901–19999</li>
 * </ul>
 */
@Getter
public enum ErrorCode {

    // ── Common ──────────────────────────────────────────────────────────────────
    SUCCESS(200, "操作成功"),
    SYSTEM_ERROR(500, "系统内部错误"),
    PARAM_INVALID(400, "参数不合法"),
    UNAUTHORIZED(401, "未登录或登录已过期"),
    FORBIDDEN(403, "无权限访问"),
    NOT_FOUND(404, "资源不存在"),
    TOKEN_INVALID(4011, "Token 无效或已过期"),
    TOKEN_EXPIRED(4012, "Token 已过期"),

    // ── Tenant ──────────────────────────────────────────────────────────────────
    TENANT_NOT_FOUND(1001, "租户不存在"),
    TENANT_DISABLED(1002, "租户已被禁用"),
    TENANT_NAME_DUPLICATE(1003, "租户名称已存在"),

    // ── Auth ───────────────────────────────────────────────────────────────────
    AUTH_CREDENTIALS_INVALID(3001, "用户名或密码错误"),
    AUTH_ACCOUNT_LOCKED(3002, "账号已被锁定"),
    AUTH_REFRESH_TOKEN_INVALID(3003, "Refresh Token 无效"),
    AUTH_PERMISSION_DENIED(3004, "权限不足"),
    AUTH_CAPTCHA_REQUIRED(3005, "请输入图形验证码"),
    AUTH_CAPTCHA_WRONG(3006, "图形验证码错误"),
    AUTH_IP_LOCKED(3007, "IP已被锁定，请稍后再试"),
    AUTH_PASSWORD_HISTORY_REUSE(3008, "不能使用最近使用过的密码"),
    AUTH_PASSWORD_EXPIRED(3009, "密码已过期，请通过忘记密码重置"),
    AUTH_LOGIN_RISK_DETECTED(3010, "登录风险检测到异常，请验证身份"),

    // ── RBAC ───────────────────────────────────────────────────────────────────
    ROLE_NOT_FOUND(4001, "角色不存在"),
    ROLE_NAME_DUPLICATE(4002, "角色名称已存在"),
    ROLE_CANNOT_DELETE(4003, "预设角色不可删除"),
    ROLE_LAST_SUPER_ADMIN(4004, "无法操作最后一个超级管理员"),
    PERMISSION_DENIED(4005, "权限不足"),
    ROLE_SUPER_ADMIN_IMMUTABLE(4006, "超管角色不可修改"),
    ROLE_PERMISSION_EXCEED_PACKAGE(4007, "角色权限超出套餐范围"),
    ROLE_SUPER_ADMIN_ASSIGN_FORBIDDEN(4008, "超管角色不允许从企业侧分配"),
    ROLE_NOT_IN_TENANT(4009, "角色不属于用户所在租户"),

    // ── Check-in  (10001–10100) ────────────────────────────────────────────────
    CHECKIN_NOT_IN_TIME_SLOT(10001, "不在可打卡时段内"),
    CHECKIN_ALREADY_DONE(10002, "今日此时段已打卡"),
    CHECKIN_CONCURRENT_LOCK_FAIL(10003, "打卡请求并发，请稍后重试"),
    CHECKIN_RECORD_NOT_FOUND(10004, "打卡记录不存在"),
    CHECKIN_USER_NOT_FOUND(10005, "打卡用户不存在"),
    CHECKIN_TENANT_NOT_FOUND(10006, "打卡租户不存在"),

    // ── Points  (10201–10300) ──────────────────────────────────────────────────
    POINT_INSUFFICIENT(10201, "积分不足"),
    POINT_FROZEN_INSUFFICIENT(10202, "可用积分不足（包含冻结积分）"),
    POINT_OPTIMISTIC_LOCK_FAILED(10203, "积分更新冲突，请稍后重试"),
    POINT_ACCOUNT_NOT_FOUND(10204, "积分账户不存在"),
    POINT_DAILY_CAP_REACHED(10205, "今日积分已达上限"),
    POINT_RULE_NOT_FOUND(10206, "积分规则不存在"),
    POINT_RULE_TIME_CONFLICT(10207, "时段规则时间冲突"),
    POINT_RULE_DISABLED(10208, "积分规则已禁用"),

    // ── Order  (10401–10500) ───────────────────────────────────────────────────
    ORDER_PENDING_TIMEOUT(10401, "订单等待支付超时，已自动取消"),
    ORDER_COUPON_ALREADY_USED(10402, "优惠券已被使用"),
    ORDER_NOT_FOUND(10403, "订单不存在"),
    ORDER_STATUS_ERROR(10404, "订单状态异常"),
    ORDER_CANCELLED(10405, "订单已取消"),
    ORDER_EXPIRED(10406, "订单已过期"),
    EXCHANGE_POINT_NOT_ENOUGH(10407, "积分不够兑换此商品"),
    ORDER_LOCK_FAILED(10408, "订单操作冲突，请稍后重试"),

    // ── User  (10601–10700) ────────────────────────────────────────────────────
    USER_NEED_CAPTCHA(10601, "请输入图形验证码"),
    USER_NOT_FOUND(10602, "用户不存在"),
    USER_DISABLED(10603, "用户已被禁用"),
    USER_ALREADY_EXISTS(10604, "用户已存在"),
    USER_PASSWORD_WRONG(10605, "密码错误"),
    USER_PASSWORD_WEAK(10606, "密码强度不足"),
    USER_PHONE_DUPLICATE(10607, "手机号已被使用"),
    USER_NOT_IN_TENANT(10608, "用户不属于当前租户"),
    INVITE_CODE_INVALID(10609, "邀请码无效或已过期"),
    INVITE_CODE_USED(10610, "邀请码已使用次数上限"),
    BATCH_IMPORT_FAILED(10611, "批量导入失败"),
    TENANT_USER_LIMIT_REACHED(10612, "超出企业用户数上限"),
    FILE_PARSING_ERROR(10613, "文件解析失败"),

    // ── Mall  (10801–10900) ───────────────────────────────────────────────────
    MALL_PRODUCT_NOT_FOUND(10801, "商品不存在"),
    MALL_PRODUCT_OFF_SALE(10802, "商品已下架"),
    MALL_PRODUCT_STOCK_EMPTY(10803, "商品库存不足"),
    MALL_COUPON_NOT_FOUND(10804, "优惠券不存在"),
    MALL_COUPON_EXPIRED(10805, "优惠券已过期"),
    MALL_PRIVILEGE_NOT_FOUND(10806, "权益不存在"),

    // ── System  (19901–19999) ──────────────────────────────────────────────────
    SYSTEM_TOKEN_BLACKLISTED(19901, "Token 已在黑名单中，请重新登录"),
    SYSTEM_RATE_LIMIT_EXCEEDED(19902, "请求过于频繁，请稍后再试"),
    SYSTEM_LOCK_ACQUIRE_FAILED(19903, "系统繁忙，获取锁失败，请稍后重试"),
    SYSTEM_REDIS_ERROR(19904, "缓存服务异常"),
    SYSTEM_DB_ERROR(19905, "数据库服务异常"),

    // ── Report ──────────────────────────────────────────────────────────────────
    REPORT_EXPORT_FAILED(9001, "报表导出失败"),

    // ── Platform Admin ─────────────────────────────────────────────────────────
    PLATFORM_ADMIN_NOT_FOUND(11001, "平台管理员不存在"),
    PLATFORM_ADMIN_DISABLED(11002, "平台管理员已被禁用"),

    // ── Notification ───────────────────────────────────────────────────────────
    NOTIFICATION_FAILED(12001, "通知发送失败"),
    SMS_SEND_FAILED(12002, "短信发送失败"),

    // ── Package ────────────────────────────────────────────────────────────────
    PACKAGE_NOT_FOUND(13001, "套餐不存在"),
    PACKAGE_CODE_DUPLICATE(13002, "套餐编码已存在"),
    PACKAGE_HAS_TENANTS(13003, "该套餐已被企业绑定，无法删除"),
    PACKAGE_IN_USE(13004, "该套餐正在使用中，无法删除");

    private final int code;
    private final String message;

    ErrorCode(int code, String message) {
        this.code = code;
        this.message = message;
    }
}
