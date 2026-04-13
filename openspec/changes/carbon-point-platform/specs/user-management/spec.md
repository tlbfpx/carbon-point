## 数据模型

### 用户表（User）核心字段

| 字段名 | 类型 | 描述 |
|--------|------|------|
| level | TINYINT | 用户等级 1-5（1=青铜 2=白银 3=黄金 4=铂金 5=钻石） |
| total_points | BIGINT | 累计获得积分（不含已消耗），仅增加不减少 |
| consecutive_days | INT | 当前连续打卡天数，归零后重新计算 |

> **说明：** `level` 为存储字段，与 `total_points` 保持同步，由 point-engine 模块负责维护。

---

## ADDED Requirements

### Requirement: 用户注册强制短信验证码
用户注册 SHALL 通过短信验证码确保手机号真实性，防止恶意批量注册。

#### Scenario: 注册流程完整验证
- **WHEN** 用户提交手机号+密码，发起注册请求
- **THEN** 系统执行以下步骤：
  1. 系统发送短信验证码（6位数字，5分钟有效）到用户手机
  2. 用户输入验证码后提交注册
  3. 系统验证成功后创建账号，返回登录 Token
- **AND** 同一手机号 5 分钟内只能请求 3 次验证码
- **AND** 验证码错误 3 次后需重新获取（该验证码立即失效）

#### Scenario: 注册验证码发送频率限制
- **WHEN** 同一手机号在 5 分钟内已请求 3 次验证码
- **THEN** 系统拒绝再次发送，返回"请稍后再试"，前端倒计时 5 分钟

#### Scenario: 注册验证码错误限制
- **WHEN** 用户输入的验证码错误
- **THEN** 系统记录错误次数，错误满 3 次后当前验证码立即失效，用户需重新获取

#### Scenario: 注册验证码校验通过
- **WHEN** 用户提交正确验证码完成注册
- **THEN** 系统删除 Redis 中的验证码记录，创建用户账号

### Requirement: 用户注册与企业绑定
用户 SHALL 通过企业邀请链接注册账号，注册时自动绑定对应企业。一人仅可属于一个企业。

#### Scenario: 通过邀请链接注册
- **WHEN** 用户打开企业邀请链接的 H5 页面，填写手机号、密码、昵称完成注册
- **THEN** 系统创建用户记录并自动绑定到邀请链接对应的企业，用户可立即使用该企业的积分体系

#### Scenario: 邀请链接过期或已满
- **WHEN** 用户打开的邀请链接已过期或使用次数已达上限
- **THEN** 系统提示"邀请链接已失效"，不允许注册

### Requirement: 管理员批量导入用户
企业管理员 SHALL 能够通过上传 Excel 文件（包含手机号和姓名）批量创建用户账号，用户自动绑定该企业。批量导入实施严格的安全校验。

#### Scenario: 批量导入文件安全校验
- **WHEN** 企业管理员上传 Excel 文件
- **THEN** 系统执行以下安全校验，全部通过后才开始解析：
  - 文件大小 ≤ 5MB
  - 文件格式仅支持 .xlsx
  - 数据行数 ≤ 1000 行（不含表头）
  - 前端校验 + 后端校验双重校验

#### Scenario: 批量导入手机号格式与去重校验
- **WHEN** 系统解析 Excel 中的手机号列
- **THEN** 执行以下校验：
  - 正则校验：`^1[3-9]\d{9}$`，不符合则标记为格式错误
  - 批次内去重：同一批次中出现重复手机号，跳过重复行并记录

#### Scenario: 批量导入解析安全
- **WHEN** 后端解析 Excel 文件
- **THEN** 使用 SAX 模式解析（防止 XXE 攻击），不加载整个文件到内存

#### Scenario: 批量导入幂等性
- **WHEN** 同一 Excel 文件重复上传
- **THEN** 系统生成新的 batch_id，不覆盖原有数据；已有账号的手机号跳过创建

#### Scenario: 批量导入成功
- **WHEN** 企业管理员上传包含 100 条手机号+姓名的合规 Excel 文件
- **THEN** 系统批量创建 100 个用户账号（默认密码），全部绑定该企业，返回导入成功记录

#### Scenario: 批量导入部分失败
- **WHEN** 上传的 Excel 中有 5 条手机号格式错误
- **THEN** 系统创建 95 个成功账号，返回导入结果（成功数 95、失败数 5、失败明细含原因）

#### Scenario: 批量导入失败明细展示
- **WHEN** 批量导入存在失败行
- **THEN** 系统返回失败明细表，格式如下：

| 行号 | 手机号 | 失败原因 |
|------|--------|----------|
| 3 | 138xxxx | 手机号格式错误 |
| 7 | 139yyyy | 号码已存在 |
| 15 | 137zzzz | 重复手机号（同一批次） |

#### Scenario: 导入用户数超过企业限制
- **WHEN** 导入后用户总数将超过企业套餐的最大用户数限制
- **THEN** 系统拒绝导入，提示"超出企业用户数上限"

### Requirement: 用户登录认证
用户 SHALL 通过手机号+密码或手机号+验证码登录，登录后获取 JWT Token（access_token + refresh_token）。

#### Scenario: 正常登录
- **WHEN** 用户输入正确的手机号和密码
- **THEN** 系统返回 access_token（15分钟有效）和 refresh_token（30天有效），Token 中包含 user_id、tenant_id、角色信息，同时记录签发 IP 和设备指纹用于后续 refresh_token 轮换校验

#### Scenario: Token 续期
- **WHEN** access_token 过期但 refresh_token 有效
- **THEN** 系统签发新的 access_token，用户无感知续期

### Requirement: 用户启停管理
企业管理员 SHALL 能够启用或停用用户账号。停用后用户无法登录但数据保留。

#### Scenario: 停用用户
- **WHEN** 企业管理员停用某用户
- **THEN** 系统删除 Redis 中该用户所有活跃 refresh_token（按 user_id 索引批量删除），该用户所有 Token 立即失效，无法登录，积分数据保留

### Requirement: 用户信息管理
用户 SHALL 能够查看和修改自己的昵称、头像。企业管理员能够查看用户列表和编辑用户基本信息。

#### Scenario: 用户修改昵称
- **WHEN** 用户在 H5 个人中心修改昵称
- **THEN** 系统更新用户昵称，立即生效

### Requirement: 用户凭证变更后 Token 主动失效
用户密码修改成功后，系统 SHALL 立即使该用户所有现有 Token 失效，防止密码泄露后会话被持久利用。

#### Scenario: 密码修改后 Token 失效
- **WHEN** 用户成功修改密码（主动修改或通过忘记密码重置）
- **THEN** 系统将该用户所有活跃 refresh_token 的 jti 加入 Redis 黑名单（设置 TTL 为 refresh_token 剩余有效期），旧 Token 立即无法续期

#### Scenario: 密码修改后旧 Token 被拒绝
- **WHEN** 用户使用密码修改前的 refresh_token 尝试续期
- **THEN** 系统检测到该 jti 已在黑名单中，返回 401 Unauthorized，用户需重新登录

### Requirement: 用户停用后 Token 立即失效
用户账号被停用后，系统 SHALL 立即撤销其所有活跃会话，防止已停用账号通过缓存 Token 继续访问。

#### Scenario: 用户停用后 Token 立即失效
- **WHEN** 企业管理员停用某用户
- **THEN** 系统删除 Redis 中该用户所有活跃 refresh_token（按 user_id 索引批量删除），该用户所有 refresh_token 续期请求均返回 401

#### Scenario: 停用用户尝试使用现有 Token 登录
- **WHEN** 已停用用户使用其缓存的 access_token 或 refresh_token 发起请求
- **THEN** 系统检测到账号状态为停用，access_token 验证通过后仍返回 403，refresh_token 续期返回 401
