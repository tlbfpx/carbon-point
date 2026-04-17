## ADDED Requirements

### Requirement: 预设主题选择
企业超级管理员 SHALL 能够从预设主题列表中选择一个主题应用到企业管理后台。

#### Scenario: 选择预设主题
- **WHEN** 企业超级管理员在主题配置页面选择"科技绿"预设主题并保存
- **THEN** 系统更新 tenant_theme 表，设置 theme_type=preset，preset_theme=tech-green，前端即时应用新主题

#### Scenario: 查看预设主题预览
- **WHEN** 管理员浏览预设主题列表
- **THEN** 每个主题选项展示主题颜色预览卡片，包括主色和辅助色

### Requirement: 自定义主题颜色
企业超级管理员 SHALL 能够自定义主题的主色和辅助色，支持 HEX 颜色值输入和颜色选择器。

#### Scenario: 设置自定义主题颜色
- **WHEN** 管理员选择"自定义"主题类型，设置主色为 #e74c3c，辅助色为 #c0392b 并保存
- **THEN** 系统更新 tenant_theme 表，设置 theme_type=custom，primary_color=#e74c3c，secondary_color=#c0392b，前端即时应用自定义颜色

#### Scenario: 自定义颜色对比度检查
- **WHEN** 管理员选择的主色与白色文字对比度不足
- **THEN** 系统显示警告提示"颜色对比度不足，可能影响文字可读性"，但仍允许保存

### Requirement: 主题即时切换
主题变更后 SHALL 即时生效，无需刷新页面即可看到新主题效果。

#### Scenario: 主题切换即时生效
- **WHEN** 管理员保存主题配置后
- **THEN** 管理后台界面立即更新为新主题颜色，包括导航栏、按钮、链接等元素

### Requirement: 登录页主题展示
企业登录页 SHALL 根据租户标识展示对应企业的主题颜色。

#### Scenario: 通过租户 ID 参数展示主题
- **WHEN** 用户访问 /login?tenantId=123
- **THEN** 登录页加载租户 123 的主题配置，页面背景色、按钮颜色使用企业主题色

#### Scenario: 租户子域名识别主题
- **WHEN** 用户访问 acme.carbonpoint.com/login
- **THEN** 系统通过子域名 acme 识别对应租户，加载并应用该企业的主题配置
