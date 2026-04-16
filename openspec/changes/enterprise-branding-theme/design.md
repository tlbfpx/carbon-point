## Context

Carbon Point 是多租户 SaaS 碳积分打卡平台，企业管理后台当前使用统一的默认蓝色主题和平台 logo，缺乏个性化能力。企业客户希望自定义管理后台的界面颜色风格和显示自身品牌 logo，提升品牌认同感和员工使用体验。

## Goals / Non-Goals

**Goals:**
- 支持企业上传、替换、删除 logo 图片
- 企业 logo 在管理后台顶部导航栏、登录页等位置显示
- 提供多种预设主题方案供企业选择
- 支持自定义主题主色和辅助色
- 企业品牌配置按租户隔离，互不影响
- 登录页根据企业标识展示对应品牌
- 主题切换即时生效，无需刷新页面

**Non-Goals:**
- 完全自定义 CSS 样式（风险过高，仅支持颜色配置）
- 用户端 H5 主题定制（当前仅企业后台）
- 平台运营后台主题定制（保持平台统一风格）
- 主题模板市场（当前仅内置预设主题）

## Decisions

### 1. 数据模型：tenant_branding 表存储品牌配置

**选择**: 新增 tenant_branding 表，与 tenants 表 1:1 关系，存储 logo URL、主题类型、自定义颜色等配置。

**理由**:
- 品牌配置与租户一一对应，1:1 关系最合适
- 独立表避免 tenants 表过于臃肿
- 便于后续扩展更多品牌配置字段

**表结构**:
```sql
CREATE TABLE tenant_branding (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id BIGINT UNIQUE NOT NULL COMMENT '租户ID',
  logo_url VARCHAR(500) COMMENT '企业logo URL',
  theme_type VARCHAR(32) NOT NULL DEFAULT 'default' COMMENT '主题类型: preset|custom',
  preset_theme VARCHAR(32) COMMENT '预设主题: default-blue|tech-green|vibrant-orange|deep-purple',
  primary_color VARCHAR(16) COMMENT '自定义主色 #HEX',
  secondary_color VARCHAR(16) COMMENT '自定义辅助色 #HEX',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
```

### 2. Logo 存储：OSS + CDN 或对接外部 logo 管理平台

**选择**: 支持两种方式：1) 本平台上传到 OSS，通过 CDN 加速访问；2) 对接现有外部 logo 管理平台，存储 logo URL。

**理由**:
- OSS 方案适合独立部署场景，专业可靠
- 对接外部平台方案适合已有统一 logo 管理系统的场景
- 数据库仅存储 URL，不存储二进制数据，保持轻量

**图片规格要求**:
- 格式: PNG、JPG、SVG
- 尺寸: 建议 200x60px（横向 logo）或 80x80px（方形 logo）
- 文件大小: 不超过 500KB
- 背景: 建议透明背景 PNG

### 3. 主题实现：CSS 变量 + 动态样式注入

**选择**: 使用 CSS 自定义属性（变量）定义主题颜色，前端通过动态注入 style 标签实现主题切换。

**理由**:
- CSS 变量原生支持，无需额外库
- 动态注入 style 标签可在运行时修改主题，无需重新加载
- Ant Design 5 原生支持 CSS 变量主题配置

**预设主题定义**:
```javascript
// 预设主题配置
const presetThemes = {
  'default-blue': { primary: '#1890ff', secondary: '#40a9ff' },
  'tech-green': { primary: '#52c41a', secondary: '#73d13d' },
  'vibrant-orange': { primary: '#fa8c16', secondary: '#ffa940' },
  'deep-purple': { primary: '#722ed1', secondary: '#9254de' }
};
```

### 4. 登录页品牌识别：租户子域名 + 租户 ID 参数

**选择**: 支持两种方式识别租户品牌：1) 企业专属子域名（如 acme.carbonpoint.com）；2) URL 参数传递租户 ID（如 /login?tenantId=123）。

**理由**:
- 子域名方式体验最佳，企业可独立品牌
- URL 参数方式简单灵活，适合初期
- 两种方式互为补充，满足不同场景

### 5. 品牌配置权限：企业超级管理员

**选择**: 品牌配置功能仅对企业超级管理员开放，普通管理员无权限修改。

**理由**:
- 品牌配置属于企业级设置，需要高权限控制
- 避免普通管理员误操作导致品牌混乱
- 与现有 RBAC 权限体系一致

## Risks / Trade-offs

- **[Logo 图片安全]** → 上传时校验图片格式和大小，病毒扫描，设置防盗链；如对接外部平台，校验 URL 合法性
- **[自定义颜色可访问性]** → 提供颜色对比度检查，确保文字可读性，不合规时提示警告
- **[主题切换性能]** → CSS 变量切换性能开销极小，首次加载时预加载预设主题
- **[子域名路由复杂度]** → 初期先实现 URL 参数方式，子域名方式作为后续优化
- **[旧数据兼容]** → 企业开通时自动创建默认品牌配置，使用默认主题和平台 logo 作为 fallback

## Migration Plan

1. 数据库迁移：创建 tenant_branding 表
2. 数据初始化：为现有企业创建默认品牌配置记录
3. 后端 API 开发：品牌配置 CRUD、logo 上传（或对接外部平台接口）
4. 前端开发：品牌配置页面、主题切换、logo 展示、登录页品牌展示
5. 灰度发布：先在测试企业验证，再全量发布
6. 回滚方案：如遇问题，可通过配置开关禁用新功能，回退到默认品牌

## Open Questions

- 是否需要为 logo 提供裁剪功能？（当前 MVP 版本暂不实现，后续评估）
- 是否需要主题历史版本记录？（当前无需，仅保留当前配置）
