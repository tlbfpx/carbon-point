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
    SUCCESS("0000", "操作成功"),
    SYSTEM_ERROR("SYSTEM001", "系统内部错误"),
    PARAM_INVALID("SYSTEM002", "参数不合法"),
    UNAUTHORIZED("SYSTEM003", "未登录或登录已过期"),
    FORBIDDEN("SYSTEM004", "无权限访问"),
    NOT_FOUND("SYSTEM005", "资源不存在"),
    TOKEN_INVALID("SYSTEM006", "Token 无效或已过期"),
    TOKEN_EXPIRED("SYSTEM007", "Token 已过期"),

    // ── Tenant ──────────────────────────────────────────────────────────────────
    TENANT_NOT_FOUND("SYSTEM010", "租户不存在"),
    TENANT_DISABLED("SYSTEM011", "租户已被禁用"),
    TENANT_NAME_DUPLICATE("SYSTEM012", "租户名称已存在"),

    // ── Auth ───────────────────────────────────────────────────────────────────
    AUTH_CREDENTIALS_INVALID("USER001", "用户名或密码错误"),
    AUTH_ACCOUNT_LOCKED("USER002", "账号已被锁定"),
    AUTH_REFRESH_TOKEN_INVALID("USER003", "Refresh Token 无效"),
    AUTH_PERMISSION_DENIED("USER004", "权限不足"),
    AUTH_CAPTCHA_REQUIRED("USER005", "请输入图形验证码"),
    AUTH_CAPTCHA_WRONG("USER006", "图形验证码错误"),
    AUTH_IP_LOCKED("USER007", "IP已被锁定，请稍后再试"),
    AUTH_PASSWORD_HISTORY_REUSE("USER008", "不能使用最近使用过的密码"),
    AUTH_PASSWORD_EXPIRED("USER009", "密码已过期，请通过忘记密码重置"),
    AUTH_LOGIN_RISK_DETECTED("USER010", "登录风险检测到异常，请验证身份"),

    // ── RBAC ───────────────────────────────────────────────────────────────────
    ROLE_NOT_FOUND("USER011", "角色不存在"),
    ROLE_NAME_DUPLICATE("USER012", "角色名称已存在"),
    ROLE_CANNOT_DELETE("USER013", "预设角色不可删除"),
    ROLE_LAST_SUPER_ADMIN("USER014", "无法操作最后一个超级管理员"),
    PERMISSION_DENIED("USER015", "权限不足"),
    ROLE_SUPER_ADMIN_IMMUTABLE("USER016", "超管角色不可修改"),
    ROLE_PERMISSION_EXCEED_PACKAGE("USER017", "角色权限超出套餐范围"),
    ROLE_SUPER_ADMIN_ASSIGN_FORBIDDEN("USER018", "超管角色不允许从企业侧分配"),
    ROLE_NOT_IN_TENANT("USER019", "角色不属于用户所在租户"),

    // ── Check-in  (10001–10100) ────────────────────────────────────────────────
    CHECKIN_NOT_IN_TIME_SLOT("CHECKIN001", "不在可打卡时段内"),
    CHECKIN_ALREADY_DONE("CHECKIN002", "今日此时段已打卡"),
    CHECKIN_CONCURRENT_LOCK_FAIL("CHECKIN003", "打卡请求并发，请稍后重试"),
    CHECKIN_RECORD_NOT_FOUND("CHECKIN004", "打卡记录不存在"),
    CHECKIN_USER_NOT_FOUND("CHECKIN005", "打卡用户不存在"),
    CHECKIN_TENANT_NOT_FOUND("CHECKIN006", "打卡租户不存在"),

    // ── Points  (10201–10300) ──────────────────────────────────────────────────
    POINT_INSUFFICIENT("POINT001", "积分不足"),
    POINT_FROZEN_INSUFFICIENT("POINT002", "可用积分不足（包含冻结积分）"),
    POINT_OPTIMISTIC_LOCK_FAILED("POINT003", "积分更新冲突，请稍后重试"),
    POINT_ACCOUNT_NOT_FOUND("POINT004", "积分账户不存在"),
    POINT_DAILY_CAP_REACHED("POINT005", "今日积分已达上限"),
    POINT_RULE_NOT_FOUND("POINT006", "积分规则不存在"),
    POINT_RULE_TIME_CONFLICT("POINT007", "时段规则时间冲突"),
    POINT_RULE_DISABLED("POINT008", "积分规则已禁用"),

    // ── Order  (10401–10500) ───────────────────────────────────────────────────
    ORDER_PENDING_TIMEOUT("ORDER001", "订单等待支付超时，已自动取消"),
    ORDER_COUPON_ALREADY_USED("ORDER002", "优惠券已被使用"),
    ORDER_NOT_FOUND("ORDER003", "订单不存在"),
    ORDER_STATUS_ERROR("ORDER004", "订单状态异常"),
    ORDER_CANCELLED("ORDER005", "订单已取消"),
    ORDER_EXPIRED("ORDER006", "订单已过期"),
    EXCHANGE_POINT_NOT_ENOUGH("ORDER007", "积分不够兑换此商品"),
    ORDER_LOCK_FAILED("ORDER008", "订单操作冲突，请稍后重试"),

    // ── User  (10601–10700) ────────────────────────────────────────────────────
    USER_NEED_CAPTCHA("USER020", "请输入图形验证码"),
    USER_NOT_FOUND("USER021", "用户不存在"),
    USER_DISABLED("USER022", "用户已被禁用"),
    USER_ALREADY_EXISTS("USER023", "用户已存在"),
    USER_PASSWORD_WRONG("USER024", "密码错误"),
    USER_PASSWORD_WEAK("USER025", "密码强度不足"),
    USER_PHONE_DUPLICATE("USER026", "手机号已被使用"),
    USER_NOT_IN_TENANT("USER027", "用户不属于当前租户"),
    INVITE_CODE_INVALID("USER028", "邀请码无效或已过期"),
    INVITE_CODE_USED("USER029", "邀请码已使用次数上限"),
    BATCH_IMPORT_FAILED("USER030", "批量导入失败"),
    TENANT_USER_LIMIT_REACHED("USER031", "超出企业用户数上限"),
    FILE_PARSING_ERROR("USER032", "文件解析失败"),

    // ── Mall  (10801–10900) ───────────────────────────────────────────────────
    MALL_PRODUCT_NOT_FOUND("MALL001", "商品不存在"),
    MALL_PRODUCT_OFF_SALE("MALL002", "商品已下架"),
    MALL_PRODUCT_STOCK_EMPTY("MALL003", "商品库存不足"),
    MALL_COUPON_NOT_FOUND("MALL004", "优惠券不存在"),
    MALL_COUPON_EXPIRED("MALL005", "优惠券已过期"),
    MALL_PRIVILEGE_NOT_FOUND("MALL006", "权益不存在"),

    // ── System  (19901–19999) ──────────────────────────────────────────────────
    SYSTEM_TOKEN_BLACKLISTED("SYSTEM020", "Token 已在黑名单中，请重新登录"),
    SYSTEM_RATE_LIMIT_EXCEEDED("SYSTEM021", "请求过于频繁，请稍后再试"),
    SYSTEM_LOCK_ACQUIRE_FAILED("SYSTEM022", "系统繁忙，获取锁失败，请稍后重试"),
    SYSTEM_REDIS_ERROR("SYSTEM023", "缓存服务异常"),
    SYSTEM_DB_ERROR("SYSTEM024", "数据库服务异常"),

    // ── Report ──────────────────────────────────────────────────────────────────
    REPORT_EXPORT_FAILED("SYSTEM030", "报表导出失败"),

    // ── Platform Admin ─────────────────────────────────────────────────────────
    PLATFORM_ADMIN_NOT_FOUND("SYSTEM040", "平台管理员不存在"),
    PLATFORM_ADMIN_DISABLED("SYSTEM041", "平台管理员已被禁用"),

    // ── Notification ───────────────────────────────────────────────────────────
    NOTIFICATION_FAILED("SYSTEM050", "通知发送失败"),
    SMS_SEND_FAILED("SYSTEM051", "短信发送失败"),

    // ── Package ────────────────────────────────────────────────────────────────
    PACKAGE_NOT_FOUND("SYSTEM060", "套餐不存在"),
    PACKAGE_CODE_DUPLICATE("SYSTEM061", "套餐编码已存在"),
    PACKAGE_HAS_TENANTS("SYSTEM062", "该套餐已被企业绑定，无法删除"),
    PACKAGE_IN_USE("SYSTEM063", "该套餐正在使用中，无法删除"),

    // ── Walking  (11001–11100) ──────────────────────────────────────────────────
    WALKING_ALREADY_CLAIMED("WALKING001", "今日步数已领取积分"),
    WALKING_NO_STEP_DATA("WALKING002", "无法获取步数数据"),
    WALKING_BELOW_THRESHOLD("WALKING003", "步数未达到领取门槛");

    private final String code;
    private final String message;

    ErrorCode(String code, String message) {
        this.code = code;
        this.message = message;
    }
}
