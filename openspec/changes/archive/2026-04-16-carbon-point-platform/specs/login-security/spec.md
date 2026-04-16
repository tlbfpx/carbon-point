## ADDED Requirements

### Requirement: 图形验证码
登录流程 SHALL 在以下情况下要求用户输入图形验证码：账号连续失败 3 次、IP 连续失败 3 次、或配置为始终启用。

#### Scenario: 获取图形验证码
- **WHEN** 用户访问登录页面或登录失败达到阈值
- **THEN** 系统生成 4-6 位随机验证码，返回 captchaId 和 Base64 编码的图片，验证码存入 Redis 5 分钟过期

#### Scenario: 验证码正确验证
- **WHEN** 用户提交登录请求并携带正确的 captchaId 和 captchaCode
- **THEN** 系统验证通过，删除 Redis 中的验证码记录，继续登录流程

#### Scenario: 验证码错误
- **WHEN** 用户提交的验证码错误或已过期
- **THEN** 系统返回"验证码错误"，不进行密码验证，需重新获取验证码

#### Scenario: 验证码复杂度要求
- **WHEN** 系统生成验证码
- **THEN** 验证码使用大小写字母+数字（排除易混淆字符 0/O/1/I/l），包含干扰线 3-5 条、干扰点 100-200 个，随机混合 3-4 种字体

### Requirement: 滑动行为验证码（可选）
平台管理员登录 SHALL 支持滑动拼图验证码作为更高安全级别的验证方式。

#### Scenario: 获取滑动验证码
- **WHEN** 平台管理员访问登录页面
- **THEN** 系统返回背景图、滑块图、目标 Y 坐标和 captchaId

#### Scenario: 验证滑动位置
- **WHEN** 用户提交滑动 X 坐标和移动轨迹
- **THEN** 系统验证位置偏差在允许范围内（±2px），验证轨迹符合人类操作特征，通过后返回 verifyToken

### Requirement: 密码强度策略
所有用户密码 SHALL 满足复杂度要求，系统在设置/重置密码时进行实时校验。

#### Scenario: 密码复杂度校验通过
- **WHEN** 用户设置密码，满足：长度 8-32 位、包含大写字母/小写字母/数字/特殊符号中至少 3 种、不包含用户名/手机号/连续字符/键盘序列
- **THEN** 系统接受密码，返回"密码强度：强/良好/一般"

#### Scenario: 密码复杂度校验失败
- **WHEN** 用户设置密码不满足复杂度要求
- **THEN** 系统拒绝并提示具体原因（如"密码长度至少 8 位"、"需包含数字和特殊符号"）

#### Scenario: 弱密码字典检查
- **WHEN** 用户设置的密码在弱密码字典中（如 "123456"、"password"、"admin123"）
- **THEN** 系统拒绝并提示"密码过于简单，请使用更复杂的密码"

### Requirement: 密码加密与历史记录
用户密码 SHALL 使用 Argon2 算法哈希存储，并禁止使用最近 5 次密码。

#### Scenario: 密码使用 Argon2 加密
- **WHEN** 系统存储用户密码
- **THEN** 使用 Argon2id 算法，参数配置：salt-length=16, hash-length=32, parallelism=4, memory=65536, iterations=3

#### Scenario: 禁止重复使用历史密码
- **WHEN** 用户修改密码，新密码与最近 5 次历史密码中任意一个相同
- **THEN** 系统拒绝并提示"不能使用最近 5 次使用过的密码"

#### Scenario: 保存密码历史
- **WHEN** 用户成功修改密码
- **THEN** 系统将旧密码哈希存入 password_history 表，关联用户 ID 和时间戳

### Requirement: 密码过期策略（可选）
系统 SHALL 支持配置密码过期策略，启用后超期密码需强制修改。

#### Scenario: 密码即将过期提醒
- **WHEN** 用户登录成功，密码距离过期不足 7 天
- **THEN** 系统在登录响应中提示"您的密码将在 X 天后过期，请及时修改"

#### Scenario: 密码已过期强制修改
- **WHEN** 用户登录，密码已超过过期天数（默认 90 天）
- **THEN** 系统拒绝登录，返回"密码已过期，请通过忘记密码重置"

### Requirement: 登录限流与账户锁定
系统 SHALL 对登录失败进行限流和账户锁定，防止暴力破解。

#### Scenario: IP 维度限流
- **WHEN** 同一 IP 在 5 分钟内登录失败达到 5 次
- **THEN** 系统锁定该 IP 30 分钟，期间所有登录请求直接拒绝

#### Scenario: 账号维度限流
- **WHEN** 同一账号连续登录失败达到 5 次
- **THEN** 系统锁定该账号 30 分钟，期间该账号无法登录

#### Scenario: 失败计数清除
- **WHEN** 用户登录成功
- **THEN** 系统清除该 IP 和该账号的失败计数

#### Scenario: 登录失败响应提示剩余次数
- **WHEN** 用户登录失败，未达到锁定阈值
- **THEN** 系统返回"密码错误，还可尝试 X 次"

### Requirement: 登录安全日志
系统 SHALL 记录所有登录尝试（成功和失败）的详细信息用于安全审计。

#### Scenario: 记录登录成功日志
- **WHEN** 用户登录成功
- **THEN** 系统记录 login_security_logs：用户类型、用户 ID、用户名、IP 地址、User-Agent、设备指纹、登录方式、结果=SUCCESS、时间

#### Scenario: 记录登录失败日志
- **WHEN** 用户登录失败
- **THEN** 系统记录日志：包含失败原因（WRONG_PASSWORD/CAPTCHA_WRONG/ACCOUNT_LOCKED）

#### Scenario: 日志字段完整性
- **WHEN** 系统记录登录日志
- **THEN** 日志至少包含：用户信息、IP 地址、地理位置、设备指纹、User-Agent、登录方式、结果、失败原因、时间

### Requirement: 异常登录检测与提醒
系统 SHALL 检测异常登录行为并提供风险提示。

#### Scenario: 新设备登录检测
- **WHEN** 用户登录设备指纹与历史记录不匹配
- **THEN** 系统记录为"新设备登录"，可配置发送通知提醒用户

#### Scenario: 异地登录检测
- **WHEN** 用户登录城市与上次登录城市不同
- **THEN** 系统记录为"异地登录"，可配置要求二次验证

#### Scenario: 异常时间登录
- **WHEN** 用户在凌晨 2:00-5:00 期间登录
- **THEN** 系统标记为"异常时间登录"，记录到日志

### Requirement: 忘记密码流程优化
系统 SHALL 提供安全的密码重置流程，支持多种身份验证方式。

#### Scenario: 通过短信验证码重置密码
- **WHEN** 用户选择"忘记密码"，输入手机号，请求发送验证码
- **THEN** 系统生成 6 位验证码，发送到用户手机，验证码 10 分钟有效，存入 Redis

#### Scenario: 通过邮箱验证码重置密码
- **WHEN** 用户选择邮箱验证方式
- **THEN** 系统发送验证码到用户绑定邮箱

#### Scenario: 验证验证码
- **WHEN** 用户提交正确的验证码
- **THEN** 系统返回 resetToken（JWT，15 分钟有效），用于后续密码重置

#### Scenario: 设置新密码
- **WHEN** 用户使用有效的 resetToken 设置新密码
- **THEN** 系统验证密码强度，更新密码，保存历史记录，清除所有现有会话，通知用户密码已修改

#### Scenario: 重置密码后强制登出
- **WHEN** 用户成功重置密码
- **THEN** 系统立即失效该用户所有现有 refresh_token，需重新登录

### Requirement: 登录页面安全加固
登录页面 SHALL 实施安全措施防止信息泄露和自动化攻击。

#### Scenario: HSTS 强制 HTTPS
- **WHEN** 用户访问登录页面
- **THEN** 响应头包含 Strict-Transport-Security: max-age=31536000; includeSubDomains

#### Scenario: 内容安全策略 CSP
- **WHEN** 登录页面加载
- **THEN** 响应头包含 Content-Security-Policy，限制资源加载来源

#### Scenario: 防止点击劫持
- **WHEN** 登录页面加载
- **THEN** 响应头包含 X-Frame-Options: DENY

### Requirement: 安全策略配置化
所有安全策略 SHALL 支持配置化，可根据需求动态调整。

#### Scenario: 配置验证码策略
- **WHEN** 管理员修改安全配置
- **THEN** 可配置：是否启用验证码、验证码类型（IMAGE/SLIDE/NONE）、验证码长度、过期时间、触发失败次数

#### Scenario: 配置登录限流策略
- **WHEN** 管理员修改安全配置
- **THEN** 可配置：IP 最大失败次数、账号最大失败次数、锁定时长、时间窗口

#### Scenario: 配置密码策略
- **WHEN** 管理员修改安全配置
- **THEN** 可配置：最小/最大长度、字符种类要求、历史记录次数、过期天数

### Requirement: Token 有效期与安全配置
系统 SHALL 配置短效 access_token 和受保护的 refresh_token 轮换机制，降低 Token 泄露后的风险窗口。

#### Scenario: access_token 短有效期
- **WHEN** 用户登录成功
- **THEN** 系统签发 access_token，有效期为 **15 分钟**（推荐配置），减少泄露后被利用的时间窗口

#### Scenario: refresh_token 首次签发记录
- **WHEN** 用户首次登录成功，系统签发 refresh_token
- **THEN** 系统在 Redis 中记录 refresh_token 元数据，包含：jti（唯一标识）、user_id、tenant_id、device_fingerprint（设备指纹）、issued_ip（签发时 IP 地址）、issued_at（签发时间）、expires_at（过期时间）

#### Scenario: refresh_token 轮换安全校验
- **WHEN** 用户使用 refresh_token 申请续期
- **THEN** 系统执行以下安全校验，全部通过后才签发新 Token：
  1. **device_fingerprint 校验**：请求头中的 device_fingerprint 必须与首次签发时记录的值一致，不一致则拒绝
  2. **IP 地址校验**：当前请求 IP 与首次签发 IP 对比，IP 变更时拒绝或触发二次验证流程（参见异常登录检测场景）
  3. **Token 状态校验**：Redis 中该 jti 必须存在且未标记为已使用（防止 replay 攻击）
  4. **过期时间校验**：refresh_token 未超过过期时间

#### Scenario: refresh_token 轮换成功后旧 Token 失效
- **WHEN** refresh_token 轮换校验通过，系统签发新 Token
- **THEN** 旧 refresh_token 的 jti 立即标记为已使用（Redis 中更新状态），新 refresh_token 独立存储并关联相同 user_id

### Requirement: JWT 签名密钥轮换机制
系统 SHALL 支持 JWT 签名密钥的定期自动轮换，确保即使当前密钥泄露，历史 Token 也无法被伪造。

#### Scenario: 签名密钥安全要求
- **WHEN** 系统生成 JWT 签名密钥
- **THEN** 密钥长度最小 256 bit（HS256 算法），密钥随机生成，不可硬编码或使用弱随机数

#### Scenario: 密钥版本标识
- **WHEN** 系统签发 JWT Token
- **THEN** Token header 中包含 `kid`（Key ID）字段，标识用于签名的密钥版本号，格式为递增整数或 UUID

#### Scenario: 密钥版本管理表
- **WHEN** 系统管理 JWT 密钥
- **THEN** 在数据库或配置中心维护 jwt_signing_keys 表，包含：kid、密钥哈希（不存储明文密钥）、算法、创建时间、过期时间、状态（ACTIVE / RETIRED / EXPIRED）

#### Scenario: 密钥自动轮换
- **WHEN** 当前活跃密钥距上次轮换已达 90 天
- **THEN** 系统自动生成新密钥（kid+1），将旧密钥状态更新为 RETIRED，新 Token 使用新密钥签名

#### Scenario: 旧密钥宽限期验证
- **WHEN** 用户提交 Token 进行验证，该 Token 使用已 RETIRED 的密钥签名
- **THEN** 系统在密钥宽限期（7 天）内，仍使用对应版本的密钥验证；超过 7 天则验证失败，要求重新登录
- **NOTE**: 宽限期结束后，系统清理已过期密钥记录

#### Scenario: 多版本密钥同时验证
- **WHEN** 系统接收 JWT Token 进行验证
- **THEN** 根据 Token header 中的 `kid`，查找对应版本的密钥进行验证；如密钥不存在或已永久过期，返回 401
