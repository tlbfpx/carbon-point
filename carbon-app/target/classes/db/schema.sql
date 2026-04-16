-- ============================================================
-- Carbon Point 平台完整数据库 Schema
-- 生成日期: 2026-04-11
-- 说明: 基于 12 模块 spec + 4 份改进文档 + 荣誉体系 MVP 综合整理
-- 引擎: InnoDB / 字符集: utf8mb4 / 排序: utf8mb4_unicode_ci
-- ============================================================

-- ============================================================
-- 1. 租户与平台管理
-- ============================================================

CREATE TABLE tenants (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    name            VARCHAR(100) NOT NULL COMMENT '企业名称',
    logo            VARCHAR(500) COMMENT '企业Logo URL',
    package_type    VARCHAR(20) NOT NULL DEFAULT 'free' COMMENT '套餐: free/pro/enterprise',
    max_users       INT NOT NULL DEFAULT 50 COMMENT '最大用户数',
    status          VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '状态: active/suspended/expired',
    expires_at      DATETIME COMMENT '套餐到期时间',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    level_mode      VARCHAR(20) NOT NULL DEFAULT 'strict' COMMENT '等级模式: strict(只升不降)/flexible(每月降级)',
    deleted         TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',

    INDEX idx_status (status),
    INDEX idx_package (package_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企业租户表';

CREATE TABLE platform_admins (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    username        VARCHAR(50) NOT NULL UNIQUE COMMENT '登录用户名',
    password_hash   VARCHAR(255) NOT NULL COMMENT 'Argon2id哈希',
    display_name    VARCHAR(50) COMMENT '显示名称',
    role            VARCHAR(20) NOT NULL DEFAULT 'viewer' COMMENT '角色: super_admin/admin/viewer',
    status          VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '状态: active/disabled',
    last_login_at   DATETIME COMMENT '最后登录时间',
    last_login_ip   VARCHAR(45) COMMENT '最后登录IP',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted         TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',

    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='平台管理员表';

-- ============================================================
-- 2. 用户管理
-- ============================================================

CREATE TABLE users (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id           BIGINT NOT NULL COMMENT '所属企业',
    phone               VARCHAR(20) NOT NULL COMMENT '手机号（全局唯一）',
    password_hash       VARCHAR(255) NOT NULL COMMENT 'Argon2id哈希',
    nickname            VARCHAR(50) COMMENT '昵称',
    avatar              VARCHAR(500) COMMENT '头像URL',
    status              VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '状态: active/disabled/deleted',
    level               INT NOT NULL DEFAULT 1 COMMENT '用户等级(1-5)，由total_points自动计算',
    total_points        INT NOT NULL DEFAULT 0 COMMENT '累计积分',
    available_points    INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '可用积分（乐观锁扣减，非负）',
    frozen_points       INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '冻结积分（兑换中）',
    version             BIGINT NOT NULL DEFAULT 0 COMMENT '乐观锁版本号，扣减时校验',
    consecutive_days    INT NOT NULL DEFAULT 0 COMMENT '当前连续打卡天数',
    last_checkin_date   DATE COMMENT '最后打卡日期',
    department_id       BIGINT COMMENT '所属部门ID',
    deleted             TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_phone (phone),
    INDEX idx_tenant_status (tenant_id, status),
    INDEX idx_department (department_id),
    INDEX idx_last_checkin (last_checkin_date),
    INDEX idx_tenant_points (tenant_id, total_points DESC) COMMENT '排行榜查询'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

CREATE TABLE tenant_invitations (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL COMMENT '所属企业',
    invite_code     VARCHAR(32) NOT NULL COMMENT '加密随机邀请码',
    max_uses        INT COMMENT '最大使用次数（null=无限）',
    used_count      INT NOT NULL DEFAULT 0 COMMENT '已使用次数',
    expires_at      DATETIME NOT NULL COMMENT '过期时间',
    created_by      BIGINT NOT NULL COMMENT '创建人ID',
    deleted         TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_invite_code (invite_code),
    INDEX idx_tenant_expires (tenant_id, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企业邀请链接表';

CREATE TABLE batch_imports (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL COMMENT '所属企业',
    operator_id     BIGINT NOT NULL COMMENT '操作人ID',
    total_count     INT NOT NULL DEFAULT 0 COMMENT '总导入数',
    success_count   INT NOT NULL DEFAULT 0 COMMENT '成功数',
    fail_count      INT NOT NULL DEFAULT 0 COMMENT '失败数',
    fail_detail     JSON COMMENT '失败明细（JSON数组）',
    deleted         TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='批量导入记录表';

-- ============================================================
-- 3. RBAC 权限体系
-- ============================================================

CREATE TABLE permissions (
    code            VARCHAR(60) PRIMARY KEY COMMENT '权限编码: enterprise:member:create',
    module          VARCHAR(30) NOT NULL COMMENT '模块: enterprise:member',
    operation       VARCHAR(20) NOT NULL COMMENT '操作: create',
    description     VARCHAR(100) COMMENT '权限描述',
    sort_order      INT NOT NULL DEFAULT 0,
    deleted         TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',

    INDEX idx_module (module)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限定义表';

CREATE TABLE roles (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL COMMENT '所属企业',
    name            VARCHAR(50) NOT NULL COMMENT '角色名称',
    role_type       VARCHAR(20) NOT NULL DEFAULT 'custom' COMMENT '角色类型: super_admin/operator/custom',
    is_editable     TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否可编辑/删除: 1=可, 0=不可(超管)',
    is_preset       TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否系统预设',
    deleted         TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_tenant_name (tenant_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

CREATE TABLE role_permissions (
    role_id         BIGINT NOT NULL,
    permission_code VARCHAR(60) NOT NULL,
    deleted         TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',

    PRIMARY KEY (role_id, permission_code),
    INDEX idx_role (role_id) COMMENT '角色变更时批量查找关联',
    INDEX idx_role_permission (role_id, permission_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色-权限关联表';

CREATE TABLE user_roles (
    user_id         BIGINT NOT NULL,
    role_id         BIGINT NOT NULL,
    deleted         TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',

    PRIMARY KEY (user_id, role_id),
    INDEX idx_user (user_id),
    INDEX idx_role (role_id) COMMENT '角色变更时批量刷新缓存'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户-角色关联表';

-- ============================================================
-- 4. 积分规则引擎
-- ============================================================

CREATE TABLE point_rules (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL COMMENT '所属企业',
    type            VARCHAR(30) NOT NULL COMMENT '规则类型: time_slot/streak/special_date/level_coefficient/daily_cap',
    name            VARCHAR(100) COMMENT '规则名称',
    config          JSON NOT NULL COMMENT '规则配置（不同type结构不同）',
    enabled         TINYINT(1) NOT NULL DEFAULT 1,
    sort_order      INT NOT NULL DEFAULT 0,
    deleted         TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_tenant_type (tenant_id, type),
    INDEX idx_tenant_enabled (tenant_id, enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='积分规则表';

-- ============================================================
-- 5. 打卡系统
-- ============================================================

CREATE TABLE time_slot_rules (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL COMMENT '所属企业',
    name            VARCHAR(100) NOT NULL COMMENT '时段名称',
    start_time      TIME NOT NULL COMMENT '时段开始时间',
    end_time        TIME NOT NULL COMMENT '时段结束时间',
    base_points_min INT NOT NULL COMMENT '基础积分最小值',
    base_points_max INT NOT NULL COMMENT '基础积分最大值',
    enabled         TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
    sort_order      INT NOT NULL DEFAULT 0 COMMENT '排序',
    deleted         TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_tenant_enabled (tenant_id, enabled),
    INDEX idx_tenant_sort (tenant_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='打卡时段规则表';

CREATE TABLE check_in_records (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id             BIGINT NOT NULL,
    tenant_id           BIGINT NOT NULL,
    time_slot_rule_id   BIGINT NOT NULL COMMENT '匹配的时段规则ID',
    checkin_date        DATE NOT NULL COMMENT '打卡日期（服务器日期）',
    checkin_time        DATETIME(3) NOT NULL COMMENT '精确到毫秒，用于排行榜排序',
    base_points         INT NOT NULL COMMENT '随机基础积分',
    final_points        INT NOT NULL COMMENT '最终积分（经过所有规则计算后）',
    multiplier          DECIMAL(5,2) DEFAULT 1.0 COMMENT '特殊日期倍率',
    level_coefficient   DECIMAL(5,2) DEFAULT 1.0 COMMENT '等级系数',
    consecutive_days    INT DEFAULT 1 COMMENT '打卡后的连续天数',
    streak_bonus        INT DEFAULT 0 COMMENT '连续打卡奖励积分',
    version             BIGINT NOT NULL DEFAULT 0 COMMENT '乐观锁版本号',
    deleted             TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 防重复打卡唯一约束
    UNIQUE KEY uk_user_date_slot (user_id, checkin_date, time_slot_rule_id),
    -- 高频查询索引
    INDEX idx_tenant_date (tenant_id, checkin_date),
    INDEX idx_user_date (user_id, checkin_date),
    INDEX idx_tenant_created (tenant_id, created_at),
    INDEX idx_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='打卡记录表';

-- ============================================================
-- 6. 积分账户与流水（分区表 — 核心大表）
-- ============================================================

CREATE TABLE point_transactions (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id         BIGINT NOT NULL,
    tenant_id       BIGINT NOT NULL,
    amount          INT NOT NULL COMMENT '变动积分（正=获得，负=消耗）',
    type            VARCHAR(30) NOT NULL COMMENT '类型: check_in,streak_bonus,exchange,manual_add,manual_deduct,expire,frozen,unfrozen',
    reference_id    VARCHAR(64) COMMENT '关联业务ID（打卡记录ID/订单ID）',
    balance_after   INT NOT NULL COMMENT '变动后可用余额',
    frozen_after    INT NOT NULL DEFAULT 0 COMMENT '变动后冻结余额',
    remark          VARCHAR(200),
    expire_time     DATETIME COMMENT '积分过期时间（FIFO）',
    version         BIGINT NOT NULL DEFAULT 0 COMMENT '乐观锁版本号',
    deleted         TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_user_created (user_id, created_at),
    INDEX idx_tenant_type_created (tenant_id, type, created_at),
    INDEX idx_tenant_created (tenant_id, created_at),
    INDEX idx_reference (type, reference_id),
    INDEX idx_expire_time (expire_time),

    -- 按季度RANGE分区，每季度一个分区
    -- 需在数据量达到阈值后启用分区
    -- PARTITION BY RANGE (TO_DAYS(created_at)) (...)
    -- 历史分区可归档到冷存储
    -- 最少保留最近 12 个月热数据在线
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='积分流水表（核心大表，按季度分区）';

-- ============================================================
-- 7. 虚拟商城
-- ============================================================

CREATE TABLE products (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id           BIGINT NOT NULL COMMENT '所属企业',
    name                VARCHAR(100) NOT NULL COMMENT '商品名称',
    description         VARCHAR(500) COMMENT '商品描述',
    image               VARCHAR(500) COMMENT '商品图片URL',
    type                VARCHAR(20) NOT NULL COMMENT '类型: coupon/recharge/privilege',
    points_price        INT NOT NULL COMMENT '兑换所需积分',
    stock               INT COMMENT '库存（null=无限）',
    max_per_user         INT DEFAULT NULL COMMENT '每人限兑数量（NULL=不限）',
    validity_days       INT NOT NULL DEFAULT 30 COMMENT '有效期天数',
    fulfillment_config  JSON COMMENT '发放配置（不同type结构不同）',
    status              VARCHAR(20) NOT NULL DEFAULT 'inactive' COMMENT '状态: inactive/active/sold_out',
    sort_order          INT NOT NULL DEFAULT 0,
    version             INT NOT NULL DEFAULT 0 COMMENT '乐观锁版本号',
    deleted             TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_tenant_status (tenant_id, status, sort_order),
    INDEX idx_tenant_sort (tenant_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='虚拟商品表';

CREATE TABLE exchange_orders (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id           BIGINT NOT NULL,
    user_id             BIGINT NOT NULL,
    product_id          BIGINT NOT NULL,
    product_name        VARCHAR(100) COMMENT '商品名称（冗余存储）',
    product_type        VARCHAR(20) COMMENT '商品类型（冗余）',
    points_spent        INT NOT NULL COMMENT '消耗积分',
    coupon_code         VARCHAR(32) COMMENT '券码（coupon类型）',
    order_status        VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending/fulfilled/used/expired/cancelled',
    expires_at          DATETIME COMMENT '卡券过期时间',
    fulfilled_at        DATETIME COMMENT '发放时间',
    used_at             DATETIME COMMENT '核销时间',
    used_by             VARCHAR(20) COMMENT '核销方式: admin/self',
    deleted             TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_coupon (coupon_code),
    INDEX idx_tenant_status (tenant_id, order_status),
    INDEX idx_user_status (user_id, order_status),
    INDEX idx_expires (expires_at) COMMENT '过期检查',
    INDEX idx_tenant_user_status (tenant_id, user_id, order_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='兑换订单表';

-- ============================================================
-- 8. 部门/团队
-- ============================================================

CREATE TABLE departments (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL,
    name            VARCHAR(100) NOT NULL COMMENT '部门名称',
    leader_id       BIGINT COMMENT '部门负责人用户ID',
    deleted         TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部门表';

-- ============================================================
-- 9. 荣誉体系 — 徽章
-- ============================================================

CREATE TABLE badge_definitions (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    badge_id        VARCHAR(50) NOT NULL UNIQUE COMMENT '徽章ID',
    name            VARCHAR(50) NOT NULL COMMENT '徽章名称',
    description     VARCHAR(200) COMMENT '徽章描述',
    icon            VARCHAR(100) COMMENT '徽章图标URL',
    rarity          VARCHAR(20) NOT NULL COMMENT '稀有度: common/rare/epic',
    condition_expr  VARCHAR(200) COMMENT '获得条件表达式',
    deleted         TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='徽章定义表（全局）';

CREATE TABLE user_badges (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id         BIGINT NOT NULL,
    tenant_id       BIGINT NOT NULL DEFAULT 0 COMMENT '所属租户',
    badge_id        VARCHAR(50) NOT NULL,
    earned_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted         TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',

    UNIQUE KEY uk_user_badge (user_id, badge_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户徽章表';

-- ============================================================
-- 10. 通知/消息
-- ============================================================

CREATE TABLE notifications (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL COMMENT '所属企业（平台通知 tenant_id=0）',
    user_id         BIGINT NOT NULL COMMENT '接收用户ID',
    type            VARCHAR(30) NOT NULL COMMENT '通知类型: level_up/badge_earned/point_expiring/point_expired/...',
    title           VARCHAR(100) NOT NULL COMMENT '通知标题',
    content         TEXT NOT NULL COMMENT '通知内容（模板变量已替换）',
    reference_type  VARCHAR(30) COMMENT '关联业务类型: order/checkin/badge/...',
    reference_id    VARCHAR(64) COMMENT '关联业务ID',
    is_read         TINYINT(1) NOT NULL DEFAULT 0 COMMENT '已读标记',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_user_read (user_id, is_read, created_at DESC),
    INDEX idx_user_type (user_id, type),
    INDEX idx_tenant_created (tenant_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='站内消息表';

CREATE TABLE notification_templates (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    type            VARCHAR(30) NOT NULL COMMENT '通知类型',
    channel         VARCHAR(20) NOT NULL COMMENT '渠道: in_app/sms',
    title_template  VARCHAR(200) NOT NULL COMMENT '标题模板',
    content_template TEXT NOT NULL COMMENT '内容模板，变量格式: {var_name}',
    is_preset       TINYINT(1) NOT NULL DEFAULT 1 COMMENT '系统预设不可删除',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_type_channel (type, channel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知模板表';

-- ============================================================
-- 11. 审计与安全
-- ============================================================

CREATE TABLE audit_logs (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT COMMENT '所属企业（平台操作 tenant_id=NULL）',
    operator_id     BIGINT NOT NULL COMMENT '操作人ID',
    operator_type   VARCHAR(20) NOT NULL COMMENT '操作人类型: platform_admin/tenant_admin/user',
    action          VARCHAR(50) NOT NULL COMMENT '操作类型',
    target_type     VARCHAR(30) COMMENT '操作对象类型: user/tenant/role/product/order',
    target_id       VARCHAR(64) COMMENT '操作对象ID',
    detail          JSON COMMENT '操作详情',
    ip_address      VARCHAR(45) NOT NULL,
    user_agent      VARCHAR(500),
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_tenant_created (tenant_id, created_at),
    INDEX idx_operator (operator_id),
    INDEX idx_action (action, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审计日志表';

CREATE TABLE login_security_logs (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_type       VARCHAR(20) NOT NULL COMMENT '用户类型: user/platform_admin',
    user_id         BIGINT COMMENT '用户ID（登录失败时可能为NULL）',
    username        VARCHAR(50) COMMENT '登录用户名/手机号',
    login_method    VARCHAR(20) COMMENT '登录方式: password/sms/sso',
    result          VARCHAR(20) NOT NULL COMMENT '结果: success/wrong_password/captcha_wrong/account_locked',
    ip_address      VARCHAR(45) NOT NULL,
    user_agent      VARCHAR(500),
    device_fingerprint VARCHAR(64) COMMENT '设备指纹',
    geo_city        VARCHAR(50) COMMENT '城市',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_user_created (user_id, created_at),
    INDEX idx_ip_created (ip_address, created_at),
    INDEX idx_username_created (username, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='登录安全日志表';

CREATE TABLE password_history (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id         BIGINT NOT NULL,
    password_hash   VARCHAR(255) NOT NULL COMMENT '历史密码哈希',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_user (user_id),
    -- 仅保留最近 5 条历史，通过应用层限制
    INDEX idx_user_created (user_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='密码历史记录表';

CREATE TABLE jwt_signing_keys (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    kid             VARCHAR(64) NOT NULL COMMENT '密钥版本标识',
    secret_key      VARCHAR(256) NOT NULL COMMENT '密钥内容（加密存储）',
    status          ENUM('ACTIVE', 'RETIRED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expired_at      DATETIME COMMENT '过期时间（RETIRED后保留7天）',

    UNIQUE INDEX uk_kid (kid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='JWT签名密钥表';

-- ============================================================
-- 12. 字典管理
-- ============================================================

CREATE TABLE sys_dict (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    category        VARCHAR(50) NOT NULL COMMENT '字典分类',
    label           VARCHAR(100) NOT NULL COMMENT '显示文本',
    value           VARCHAR(200) NOT NULL COMMENT '存储值',
    sort_order      INT DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'active' COMMENT 'active/inactive',
    parent_id       BIGINT COMMENT '父级ID（树形结构）',
    css_class       VARCHAR(100) COMMENT '样式',
    extra           JSON COMMENT '扩展数据',
    is_preset       TINYINT(1) DEFAULT 0 COMMENT '系统预设不可删除',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_category_value (category, value),
    INDEX idx_category (category),
    INDEX idx_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统字典表';

-- ============================================================
-- 13. 排行榜快照（Redis 缓存的持久化备份）
-- ============================================================

CREATE TABLE leaderboard_snapshots (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL,
    snapshot_type   VARCHAR(20) NOT NULL COMMENT 'today/week/history/department',
    snapshot_date   DATE NOT NULL,
    rank_data       JSON NOT NULL COMMENT '[{rank, userId, nickname, points}]',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_tenant_type_date (tenant_id, snapshot_type, snapshot_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='排行榜快照表';

-- ============================================================
-- 14. 积分过期配置与记录（产品改进文档 §2）
-- ============================================================

CREATE TABLE point_expiration_config (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id           BIGINT NOT NULL UNIQUE,
    expiration_months   INT NOT NULL DEFAULT 12 COMMENT '过期月数',
    notify_days_before  INT NOT NULL DEFAULT 30 COMMENT '提前通知天数',
    extension_enabled   TINYINT(1) DEFAULT 1 COMMENT '允许手动延期',
    extension_months    INT DEFAULT 3 COMMENT '延期时长',
    expired_handling    VARCHAR(20) DEFAULT 'forfeit' COMMENT 'forfeit/donate',
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='积分过期配置表';

-- ============================================================
-- 15. 权限套餐
-- ============================================================

CREATE TABLE permission_packages (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    code            VARCHAR(20) NOT NULL UNIQUE COMMENT '套餐编码: free/pro/enterprise',
    name            VARCHAR(50) NOT NULL COMMENT '套餐名称',
    description     VARCHAR(200) COMMENT '套餐描述',
    max_users       INT NOT NULL DEFAULT 50 COMMENT '最大用户数',
    status          TINYINT(1) NOT NULL DEFAULT 1 COMMENT '状态: 1=启用, 0=禁用',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限套餐表';

CREATE TABLE package_permissions (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    package_id      BIGINT NOT NULL COMMENT '套餐ID',
    permission_code VARCHAR(60) NOT NULL COMMENT '权限编码',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_package_permission (package_id, permission_code),
    INDEX idx_package_id (package_id),
    INDEX idx_permission_code (permission_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='套餐权限关联表';

-- ============================================================
-- 初始化数据：权限定义
-- ============================================================
INSERT INTO permissions (code, module, operation, description, sort_order) VALUES
('enterprise:dashboard:view', 'enterprise:dashboard', 'view', '查看数据看板', 1),
('enterprise:member:list', 'enterprise:member', 'list', '查看员工列表', 10),
('enterprise:member:create', 'enterprise:member', 'create', '添加员工', 11),
('enterprise:member:import', 'enterprise:member', 'import', '批量导入员工', 12),
('enterprise:member:invite', 'enterprise:member', 'invite', '生成邀请链接', 13),
('enterprise:member:edit', 'enterprise:member', 'edit', '编辑员工信息', 14),
('enterprise:member:disable', 'enterprise:member', 'disable', '启用/停用员工', 15),
('enterprise:rule:view', 'enterprise:rule', 'view', '查看积分规则', 20),
('enterprise:rule:create', 'enterprise:rule', 'create', '创建积分规则', 21),
('enterprise:rule:edit', 'enterprise:rule', 'edit', '编辑积分规则', 22),
('enterprise:rule:delete', 'enterprise:rule', 'delete', '删除积分规则', 23),
('enterprise:rule:toggle', 'enterprise:rule', 'toggle', '启用/禁用规则', 24),
('enterprise:product:list', 'enterprise:product', 'list', '查看商品列表', 30),
('enterprise:product:create', 'enterprise:product', 'create', '创建商品', 31),
('enterprise:product:edit', 'enterprise:product', 'edit', '编辑商品', 32),
('enterprise:product:delete', 'enterprise:product', 'delete', '删除商品', 33),
('enterprise:product:toggle', 'enterprise:product', 'toggle', '上下架商品', 34),
('enterprise:product:stock', 'enterprise:product', 'stock', '管理库存', 35),
('enterprise:order:list', 'enterprise:order', 'list', '查看订单列表', 40),
('enterprise:order:fulfill', 'enterprise:order', 'fulfill', '核销卡券', 41),
('enterprise:order:cancel', 'enterprise:order', 'cancel', '取消订单', 42),
('enterprise:point:query', 'enterprise:point', 'query', '查询用户积分', 50),
('enterprise:point:add', 'enterprise:point', 'add', '手动发放积分', 51),
('enterprise:point:deduct', 'enterprise:point', 'deduct', '手动扣减积分', 52),
('enterprise:point:export', 'enterprise:point', 'export', '导出积分数据', 53),
('enterprise:report:view', 'enterprise:report', 'view', '查看数据报表', 60),
('enterprise:report:export', 'enterprise:report', 'export', '导出报表', 61);
