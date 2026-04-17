## ADDED Requirements

### Requirement: 企业登录页品牌展示
企业管理后台登录页 SHALL 根据租户标识展示对应企业的 logo 和主题颜色。

#### Scenario: 通过 URL 参数展示品牌
- **WHEN** 用户访问 /login?tenantId=123
- **THEN** 登录页加载租户 123 的品牌配置，页面背景色、按钮颜色使用企业主题色，顶部显示企业 logo（如有）

#### Scenario: 通过子域名展示品牌
- **WHEN** 用户访问 acme.carbonpoint.com/login
- **THEN** 系统通过子域名 acme 识别对应租户，加载并展示该企业的品牌配置

#### Scenario: 未指定租户时使用默认品牌
- **WHEN** 用户访问未带租户标识的登录页 /login
- **THEN** 登录页使用平台默认 logo 和默认蓝色主题
