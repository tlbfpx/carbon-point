## ADDED Requirements

### Requirement: 企业 Logo 上传
具有 enterprise:admin 权限的企业超级管理员 SHALL 能够上传企业 logo 图片，支持替换和删除操作。

#### Scenario: 上传企业 logo
- **WHEN** 企业超级管理员在品牌配置页面上传符合规格的 logo 图片
- **THEN** 系统校验图片格式、尺寸和大小，保存到存储系统（OSS 或外部平台），更新 tenant_branding 表的 logo_url 字段

#### Scenario: 替换企业 logo
- **WHEN** 企业超级管理员上传新的 logo 图片
- **THEN** 系统删除旧 logo 文件（如存在），保存新 logo，更新配置

#### Scenario: 删除企业 logo
- **WHEN** 企业超级管理员点击删除 logo
- **THEN** 系统删除存储中的 logo 文件，清空 tenant_branding.logo_url，恢复使用平台默认 logo

#### Scenario: 上传不符合规格的图片
- **WHEN** 管理员上传格式不支持或尺寸过大的图片
- **THEN** 系统提示错误信息，拒绝上传，要求重新选择符合要求的图片

### Requirement: 企业品牌配置查询
企业管理员登录后，系统 SHALL 自动加载并应用当前企业的品牌配置（logo 和主题）。

#### Scenario: 管理后台加载品牌配置
- **WHEN** 企业管理员登录管理后台
- **THEN** 系统查询当前租户的 tenant_branding 配置，在顶部导航栏显示企业 logo（如有），应用对应的主题

#### Scenario: 无品牌配置时使用默认值
- **WHEN** 企业尚未配置品牌信息
- **THEN** 系统使用平台默认 logo 和默认蓝色主题

### Requirement: 品牌配置权限控制
品牌配置功能 SHALL 仅对企业超级管理员开放，普通管理员无访问权限。

#### Scenario: 超级管理员访问品牌配置
- **WHEN** 企业超级管理员登录
- **THEN** 侧边栏显示"品牌配置"菜单项，可正常访问配置页面

#### Scenario: 普通管理员无品牌配置权限
- **WHEN** 非超级管理员登录
- **THEN** 侧边栏不显示"品牌配置"菜单，直接访问配置 URL 时返回 403 权限错误
