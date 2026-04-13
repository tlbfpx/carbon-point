# Carbon Point 平台技术改进规格说明书

**版本**: v1.0
**日期**: 2026-04-10
**状态**: 草稿
**作者**: 平台技术架构团队

---

## 1. 平台管理员安全漏洞修复

### 1.1 当前风险

当前设计中，`@InterceptorIgnore` 注解允许平台管理员绕过租户隔离机制，存在跨租户数据泄露风险。平台管理员可以访问任意租户的数据，缺乏足够的访问控制。

### 1.2 解决方案

#### 1.2.0 异常类定义

```java
// 平台访问拒绝异常
public class PlatformAccessDeniedException extends RuntimeException {
    public PlatformAccessDeniedException(String message) {
        super(message);
    }

    public PlatformAccessDeniedException(String message, Throwable cause) {
        super(message, cause);
    }
}

// 限流超限异常
public class RateLimitExceededException extends RuntimeException {
    private final int retryAfterSeconds;
    private final int limit;
    private final long resetTime;
    private final int remaining;  // 剩余请求配额

    public RateLimitExceededException(String message, int retryAfterSeconds, int limit, long resetTime, int remaining) {
        super(message);
        this.retryAfterSeconds = retryAfterSeconds;
        this.limit = limit;
        this.resetTime = resetTime;
        this.remaining = remaining;
    }

    public int getRetryAfterSeconds() {
        return retryAfterSeconds;
    }

    public int getLimit() {
        return limit;
    }

    public long getResetTime() {
        return resetTime;
    }

    public int getRemaining() {
        return remaining;
    }
}

// 锁获取失败异常
public class LockAcquisitionException extends RuntimeException {
    public LockAcquisitionException(String message) {
        super(message);
    }

    public LockAcquisitionException(String message, Throwable cause) {
        super(message, cause);
    }
}
```

#### 1.2.1 PlatformAdminSecurityContext 实现

```java
// 核心组件：平台管理员安全上下文
@Component
public class PlatformAdminSecurityContext {
    @Autowired
    private SecurityContext securityContext;

    @Autowired
    private PlatformAdminQueryWhitelist queryWhitelist;

    @Autowired
    private AuditLogService auditLogService;

    /**
     * 获取当前平台管理员上下文
     * 返回包含管理员ID、角色、允许访问范围的上下文对象
     */
    public PlatformAdminContext getCurrentContext() {
        Authentication auth = securityContext.getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new PlatformAccessDeniedException("未认证的请求");
        }

        PlatformAdminDetails details = (PlatformAdminDetails) auth.getPrincipal();
        return PlatformAdminContext.builder()
            .adminId(details.getAdminId())
            .tenantId(details.getTenantId())
            .roles(details.getRoles())
            .allowedTables(queryWhitelist.getAllowedTables(details.getRoles()))
            .allowedFields(queryWhitelist.getAllowedFields(details.getRoles()))
            .accessLevel(details.getAccessLevel())
            .build();
    }

    /**
     * 验证是否允许访问指定表
     */
    public boolean canAccessTable(String tableName) {
        PlatformAdminContext ctx = getCurrentContext();
        return ctx.getAllowedTables().contains(tableName);
    }

    /**
     * 验证是否允许访问指定字段
     */
    public boolean canAccessField(String tableName, String fieldName) {
        PlatformAdminContext ctx = getCurrentContext();
        Set<String> allowedFields = ctx.getAllowedFields().get(tableName);
        return allowedFields != null && allowedFields.contains(fieldName);
    }
}

// 平台管理员上下文对象
@Data
@Builder
public class PlatformAdminContext {
    private Long adminId;
    private Long tenantId;  // ADDED: 平台租户ID
    private Set<String> roles;
    private Set<String> allowedTables;
    private Map<String, Set<String>> allowedFields;
    private AccessLevel accessLevel;

    public enum AccessLevel {
        READ_ONLY,      // 只读访问
        READ_WRITE,     // 读写访问（受限）
        FULL_ACCESS     // 完全访问（仅超级管理员）
    }
}

// 平台管理员审计日志
@Data
@Builder
public class PlatformAdminAuditLog {
    private Long id;
    private Long adminId;
    private String action;
    private Long targetTenantId;
    private String targetTable;
    private String accessedFields;
    private String ipAddress;
    private LocalDateTime timestamp;
    private String targetClass;
    private boolean success;
    private String errorMessage;
}

// 平台管理员详情
public class PlatformAdminDetails implements UserDetails {
    private Long adminId;
    private String username;
    private Set<String> roles;
    private AccessLevel accessLevel;
    private Long tenantId;  // 平台管理员关联的平台租户ID

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return roles.stream()
            .map(role -> new SimpleGrantedAuthority("ROLE_PLATFORM_" + role))
            .collect(Collectors.toList());
    }

    // ... other UserDetails methods
}

// 自定义注解：标识需要平台租户ID验证的方法
@Target({ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
public @interface PlatformTenantRequired {
    String[] allowedTables() default {};  // 允许访问的表名单
    String[] allowedFields() default {};  // 允许访问的字段名单
    boolean requireFullAccess() default false;  // 是否需要完全访问权限
}

// MyBatis-Plus @SqlTable 注解定义（来自 com.baomidou.mybatisplus.annotation.SqlTable）
// 注意：此注解来自 MyBatis-Plus 框架，需引入依赖：
// <dependency>
//     <groupId>com.baomidou</groupId>
//     <artifactId>mybatis-plus-annotation</artifactId>
//     <version>3.5.x</version>
// </dependency>
// @SqlTable 注解用于指定实体类对应的数据库表名
// @Target({ElementType.TYPE})
// @Retention(RetentionPolicy.RUNTIME)
// public @interface SqlTable {
//     String name() default "";
//     String schema() default "";
// }

// 表访问信息
@Data
@Builder
public class TableAccessInfo {
    private Set<String> accessedTables;
    private Map<String, Set<String>> tableFields;
}

// 切面：验证平台管理员的访问权限
@Aspect
@Component
public class PlatformAdminSecurityAspect {
    @Autowired
    private PlatformAdminSecurityContext securityContext;

    @Autowired
    private PlatformAdminQueryWhitelist queryWhitelist;

    @Autowired
    private AuditLogService auditLogService;

    @Around("@annotation(platformTenantRequired)")
    public Object validatePlatformAccess(ProceedingJoinPoint joinPoint,
            PlatformTenantRequired platformTenantRequired) throws Throwable {

        // 步骤1: 获取当前平台管理员上下文
        PlatformAdminContext ctx = securityContext.getCurrentContext();

        // 步骤2: 验证请求来源是否合法
        validateRequestOrigin(joinPoint);

        // 步骤3: 验证 platform_tenant_id 是否在上下文中
        validateTenantIdPresence(ctx);

        // 步骤4: 获取方法访问的表和字段
        TableAccessInfo tableAccess = extractTableAccess(joinPoint);

        // 步骤5: 验证访问的表是否在白名单内
        validateTableAccess(ctx, tableAccess, platformTenantRequired);

        // 步骤6: 验证访问的字段是否在白名单内
        validateFieldAccess(ctx, tableAccess, platformTenantRequired);

        // 步骤7: 记录审计日志
        logAccessAttempt(joinPoint, ctx, tableAccess, true);

        // 步骤8: 执行目标方法
        return joinPoint.proceed();

    }

    private void validateRequestOrigin(ProceedingJoinPoint joinPoint) {
        HttpServletRequest request = getRequest(joinPoint);
        String clientIp = getClientIp(request);

        // 验证请求来源IP是否在允许范围内
        if (!isIpAllowed(clientIp)) {
            throw new PlatformAccessDeniedException("请求来源IP不在允许范围内: " + clientIp);
        }
    }

    private void validateTenantIdPresence(PlatformAdminContext ctx) {
        if (ctx.getTenantId() == null) {
            throw new PlatformAccessDeniedException("平台租户ID缺失");
        }
    }

    private void validateTableAccess(PlatformAdminContext ctx, TableAccessInfo tableAccess,
            PlatformTenantRequired annotation) {
        Set<String> allowedTables = new HashSet<>();

        // 合并白名单配置和注解配置
        if (annotation.allowedTables().length > 0) {
            allowedTables.addAll(Arrays.asList(annotation.allowedTables()));
        } else {
            allowedTables.addAll(ctx.getAllowedTables());
        }

        for (String table : tableAccess.getAccessedTables()) {
            if (!allowedTables.contains(table)) {
                throw new PlatformAccessDeniedException(
                    "表访问不被允许: " + table + ", 允许的表: " + allowedTables);
            }
        }
    }

    private void validateFieldAccess(PlatformAdminContext ctx, TableAccessInfo tableAccess,
            PlatformTenantRequired annotation) {
        Map<String, Set<String>> allowedFields = ctx.getAllowedFields();

        for (Map.Entry<String, Set<String>> tableFields : tableAccess.getTableFields().entrySet()) {
            String table = tableFields.getKey();
            Set<String> requestedFields = tableFields.getValue();

            Set<String> allowed = allowedFields.getOrDefault(table, Set.of());

            for (String field : requestedFields) {
                if (!allowed.contains(field)) {
                    throw new PlatformAccessDeniedException(
                        "字段访问不被允许: " + table + "." + field);
                }
            }
        }
    }

    private void logAccessAttempt(ProceedingJoinPoint joinPoint, PlatformAdminContext ctx,
            TableAccessInfo tableAccess, boolean success) {
        try {
            PlatformAdminAuditLog log = PlatformAdminAuditLog.builder()
                .adminId(ctx.getAdminId())
                .targetTenantId(ctx.getTenantId())
                .action(joinPoint.getSignature().getName())
                .targetTable(String.join(",", tableAccess.getAccessedTables()))
                .accessedFields(serializeFields(tableAccess.getTableFields()))
                .ipAddress(getClientIp(getRequest(joinPoint)))
                .timestamp(LocalDateTime.now())
                .success(success)
                .build();
            auditLogService.log(log);
        } catch (Exception e) {
            // 审计日志失败不应阻止操作
            log.warn("审计日志记录失败", e);
        }
    }

    // 辅助方法：提取方法访问的表和字段信息
    private TableAccessInfo extractTableAccess(ProceedingJoinPoint joinPoint) {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String methodName = signature.getName();
        Class<?> declaringType = signature.getDeclaringType();

        // 基于方法名和类型推断访问的表
        Set<String> tables = new HashSet<>();
        Map<String, Set<String>> tableFields = new HashMap<>();

        // 解析方法上的 @SqlTable annotation（如果有）
        // 注意: @SqlTable 是 MyBatis-Plus 的注解，用于指定表名
        SqlTable sqlTable = declaringType.getAnnotation(SqlTable.class);
        if (sqlTable != null) {
            tables.add(sqlTable.name());
            tableFields.put(sqlTable.name(), Set.of("*"));  // * 表示所有字段
        }

        return TableAccessInfo.builder()
            .accessedTables(tables)
            .tableFields(tableFields)
            .build();
    }

    private String serializeFields(Map<String, Set<String>> tableFields) {
        return tableFields.entrySet().stream()
            .map(e -> e.getKey() + ":[" + String.join(",", e.getValue()) + "]")
            .collect(Collectors.joining(";"));
    }
}
```

#### 1.2.2 平台管理员查询白名单

```java
public class PlatformAdminQueryWhitelist {
    // 只读表白名单
    public static final Set<String> READ_ONLY_TABLES = Set.of(
        "cp_user", "cp_tenant", "cp_point_transaction",
        "cp_exchange_order", "cp_audit_log"
    );

    // 可写表白名单（仅限特定操作）
    public static final Set<String> READ_WRITE_TABLES = Set.of(
        "cp_tenant"  // 仅允许更新租户状态
    );

    // 只读字段白名单（按表分组）
    public static final Map<String, Set<String>> READ_ONLY_FIELDS = Map.of(
        "cp_user", Set.of("id", "tenant_id", "username", "email", "created_at", "status"),
        "cp_tenant", Set.of("id", "name", "status", "created_at", "updated_at"),
        "cp_point_transaction", Set.of("id", "user_id", "tenant_id", "amount", "type", "created_at"),
        "cp_exchange_order", Set.of("id", "user_id", "tenant_id", "product_id", "status", "created_at"),
        "cp_audit_log", Set.of("id", "admin_id", "tenant_id", "action", "created_at")
    );

    // 完整字段白名单（用于写操作校验后的响应过滤）
    public static final Map<String, Set<String>> READ_WRITE_FIELDS = Map.of(
        "cp_tenant", Set.of("id", "name", "status", "updated_at")
    );

    /**
     * 根据角色获取允许访问的表
     */
    public Set<String> getAllowedTables(Set<String> roles) {
        Set<String> tables = new HashSet<>(READ_ONLY_TABLES);

        if (roles.contains("ADMIN")) {
            tables.addAll(READ_WRITE_TABLES);
        }

        return Collections.unmodifiableSet(tables);
    }

    /**
     * 根据角色获取允许访问的字段
     */
    public Map<String, Set<String>> getAllowedFields(Set<String> roles) {
        Map<String, Set<String>> fields = new HashMap<>(READ_ONLY_FIELDS);

        if (roles.contains("ADMIN")) {
            READ_WRITE_FIELDS.forEach((table, fieldSet) -> {
                Set<String> combined = new HashSet<>(fields.getOrDefault(table, Set.of()));
                combined.addAll(fieldSet);
                fields.put(table, combined);
            });
        }

        return Collections.unmodifiableMap(fields);
    }

    /**
     * 检查是否为只读操作
     */
    public boolean isReadOnlyOperation(String tableName, String operation) {
        if (!READ_ONLY_TABLES.contains(tableName)) {
            return false;
        }
        return operation.equalsIgnoreCase("SELECT") ||
               operation.equalsIgnoreCase("FIND") ||
               operation.equalsIgnoreCase("GET") ||
               operation.equalsIgnoreCase("LIST") ||
               operation.equalsIgnoreCase("COUNT");
    }
}
```

#### 1.2.3 审计日志实现

```java
@Aspect
@Component
public class PlatformAdminAuditAspect {
    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private PlatformAdminSecurityContext securityContext;

    @AfterReturning(pointcut = "@annotation(PlatformTenantRequired)", returning = "result")
    public void auditPlatformAccess(JoinPoint joinPoint, Object result) {
        try {
            PlatformAdminContext ctx = securityContext.getCurrentContext();

            PlatformAdminAuditLog log = PlatformAdminAuditLog.builder()
                .adminId(ctx.getAdminId())
                .targetTenantId(ctx.getTenantId())
                .action(joinPoint.getSignature().getName())
                .targetClass(joinPoint.getTarget().getClass().getSimpleName())
                .timestamp(LocalDateTime.now())
                .success(true)
                .build();
            auditLogService.log(log);
        } catch (Exception e) {
            // 审计日志失败不应阻止操作
            log.warn("审计日志记录失败: " + e.getMessage());
        }
    }

    @AfterThrowing(pointcut = "@annotation(PlatformTenantRequired)", throwing = "ex")
    public void auditFailedAccess(JoinPoint joinPoint, Throwable ex) {
        try {
            PlatformAdminContext ctx = securityContext.getCurrentContext();

            PlatformAdminAuditLog log = PlatformAdminAuditLog.builder()
                .adminId(ctx.getAdminId())
                .targetTenantId(ctx.getTenantId())
                .action(joinPoint.getSignature().getName())
                .targetClass(joinPoint.getTarget().getClass().getSimpleName())
                .timestamp(LocalDateTime.now())
                .success(false)
                .errorMessage(ex.getMessage())
                .build();
            auditLogService.log(log);
        } catch (Exception e) {
            log.warn("审计日志记录失败: " + e.getMessage());
        }
    }
}
```

### 1.3 实施细节

| 组件 | 说明 | 优先级 |
|------|------|--------|
| `PlatformAdminSecurityContext` | 安全上下文持有者 | P0 |
| `@PlatformTenantRequired` | 方法级注解 | P0 |
| `PlatformAdminSecurityAspect` | 权限验证切面 | P0 |
| `PlatformAdminQueryWhitelist` | 查询白名单配置 | P0 |
| `PlatformAdminAuditAspect` | 审计日志切面 | P0 |

---

## 2. H5 Token 安全修复

### 2.1 当前风险

JWT 存储在 localStorage 中，存在 XSS（跨站脚本攻击）漏洞风险。H5 WebView 环境下的 Token 可能被恶意脚本窃取。

### 2.2 解决方案

#### 2.2.1 Cookie 存储方案

```java
// Token 响应时不返回 JWT body，改为设置 httpOnly Cookie
public class TokenService {
    @Autowired
    private TokenProperties tokenProperties;

    public void setTokenCookie(HttpServletResponse response, String accessToken) {
        Cookie cookie = new Cookie("cp_access_token", accessToken);
        cookie.setHttpOnly(true);           // 禁止 JavaScript 访问
        cookie.setSecure(true);             // 仅 HTTPS 传输
        cookie.setSameSite("Strict");       // 严格同站策略
        cookie.setPath("/");
        cookie.setMaxAge(tokenProperties.getAccessTokenTtlMinutes() * 60);  // 15分钟
        response.addCookie(cookie);
    }

    public void setRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        Cookie cookie = new Cookie("cp_refresh_token", refreshToken);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setSameSite("Strict");
        cookie.setPath("/");
        cookie.setMaxAge(tokenProperties.getRefreshTokenTtlDays() * 24 * 60 * 60);  // 7天
        response.addCookie(cookie);
    }

    public void clearTokenCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie("cp_access_token", "");
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setSameSite("Strict");
        cookie.setPath("/");
        cookie.setMaxAge(0);                // 立即失效
        response.addCookie(cookie);
    }

    public void clearRefreshTokenCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie("cp_refresh_token", "");
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setSameSite("Strict");
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }

    /**
     * 从请求中提取 access token
     */
    public Optional<String> extractAccessToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return Optional.empty();
        return Arrays.stream(cookies)
            .filter(c -> "cp_access_token".equals(c.getName()))
            .map(Cookie::getValue)
            .filter(v -> v != null && !v.isEmpty())
            .findFirst();
    }
}
```

#### 2.2.2 WebView Cookie 域名验证

```java
// 允许的域名配置
@Configuration
@ConfigurationProperties(prefix = "security")
public class AllowedDomainsConfig {
    private List<String> allowedDomains = new ArrayList<>();

    public List<String> getAllowedDomains() {
        return allowedDomains;
    }

    public void setAllowedDomains(List<String> allowedDomains) {
        this.allowedDomains = allowedDomains;
    }

    /**
     * 验证域名是否在白名单内
     */
    public boolean isDomainAllowed(String domain) {
        if (domain == null || allowedDomains.isEmpty()) {
            return false;
        }
        return allowedDomains.contains(domain) ||
               allowedDomains.stream()
                   .anyMatch(allowed -> domain.endsWith("." + allowed));
    }

    /**
     * 验证Origin是否在白名单内
     */
    public boolean isOriginAllowed(String origin) {
        if (origin == null) return false;
        try {
            URL url = new URL(origin);
            String domain = url.getHost();
            return isDomainAllowed(domain);
        } catch (MalformedURLException e) {
            return false;
        }
    }
}

public class WebViewCookieValidator {
    @Autowired
    private AllowedDomainsConfig allowedDomainsConfig;

    private static final Set<String> WEBVIEW_USER_AGENT_KEYWORDS = Set.of(
        "CarbonPointWebView",
        "com.carbonpoint.h5",
        "MicroMessenger"  // 微信 WebView
    );

    /**
     * 验证 Cookie 域名与请求来源是否匹配
     */
    public boolean validateCookieDomain(HttpServletRequest request) {
        String origin = request.getHeader("Origin");
        String referer = request.getHeader("Referer");

        if (isWebViewRequest(request)) {
            String expectedDomain = extractDomain(origin != null ? origin : referer);
            String cookieDomain = getCookieDomain(request);

            if (expectedDomain == null || cookieDomain == null) {
                return false;
            }

            // 验证 cookie 域名与请求来源匹配或是其子域
            return expectedDomain.equals(cookieDomain) ||
                   cookieDomain.endsWith("." + expectedDomain);
        }
        return true;
    }

    /**
     * 从 URL 中提取域名
     */
    private String extractDomain(String url) {
        if (url == null || url.isEmpty()) {
            return null;
        }
        try {
            URL parsedUrl = new URL(url);
            return parsedUrl.getHost();
        } catch (MalformedURLException e) {
            return null;
        }
    }

    /**
     * 获取 Cookie 的域名
     * 如果 Cookie 未设置 domain，则返回请求的服务器域名
     */
    private String getCookieDomain(HttpServletRequest request) {
        // 首先尝试从已发送的 Cookie 中获取 domain
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                String domain = cookie.getDomain();
                if (domain != null && !domain.isEmpty()) {
                    return domain;
                }
            }
        }
        // 如果未设置 domain，使用请求的主机名
        return request.getServerName();
    }

    /**
     * 判断是否为 WebView 请求
     */
    private boolean isWebViewRequest(HttpServletRequest request) {
        String userAgent = request.getHeader("User-Agent");
        if (userAgent == null) return false;

        return WEBVIEW_USER_AGENT_KEYWORDS.stream()
            .anyMatch(userAgent::contains);
    }

    /**
     * 验证 WebView 请求来源是否在白名单内
     */
    public boolean isAllowedOrigin(String origin) {
        if (origin == null) return false;

        String domain = extractDomain(origin);
        if (domain == null) return false;

        return allowedDomainsConfig.getAllowedDomains().contains(domain) ||
               allowedDomainsConfig.getAllowedDomains().stream()
                   .anyMatch(allowed -> domain.endsWith("." + allowed));
    }

    /**
     * WebView 场景下的完整验证流程
     */
    public ValidationResult validateWebViewRequest(HttpServletRequest request) {
        if (!isWebViewRequest(request)) {
            return ValidationResult.allowed();  // 非 WebView 请求直接通过
        }

        String origin = request.getHeader("Origin");
        if (!isAllowedOrigin(origin)) {
            return ValidationResult.denied("Origin not in whitelist: " + origin);
        }

        if (!validateCookieDomain(request)) {
            return ValidationResult.denied("Cookie domain mismatch");
        }

        return ValidationResult.allowed();
    }

    @Data
    @AllArgsConstructor
    public static class ValidationResult {
        private boolean allowed;
        private String reason;

        public static ValidationResult allowed() {
            return new ValidationResult(true, null);
        }

        public static ValidationResult denied(String reason) {
            return new ValidationResult(false, reason);
        }
    }
}
```

#### 2.2.3 安全响应头配置

```java
@Configuration
public class SecurityHeadersConfig {
    @Bean
    public FilterRegistrationBean<SecurityHeadersFilter> securityHeadersFilter() {
        return new FilterRegistrationBean<>() {{
            setFilter(new SecurityHeadersFilter());
            addUrlPatterns("/api/*");
        }};
    }
}

public class SecurityHeadersFilter implements Filter {
    private static final String CSP_POLICY =
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' https:; " +
        "frame-ancestors 'none';";

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        // 防止点击劫持
        httpResponse.setHeader("X-Frame-Options", "DENY");

        // 内容安全策略
        httpResponse.setHeader("Content-Security-Policy", CSP_POLICY);

        // 防止 MIME 类型 sniffing
        httpResponse.setHeader("X-Content-Type-Options", "nosniff");

        // XSS 保护
        httpResponse.setHeader("X-XSS-Protection", "1; mode=block");

        // 严格传输安全（仅 HTTPS）
        httpResponse.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

        // 引用来源策略
        httpResponse.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

        // 权限策略
        httpResponse.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

        chain.doFilter(request, response);
    }
}
```

#### 2.2.4 Token 刷新机制

```java
// Refresh Token 数据
@Data
@Builder
public class RefreshTokenData {
    private String tokenId;
    private String userId;
    private Long tenantId;
    private LocalDateTime issuedAt;
    private LocalDateTime expiresAt;
    private boolean revoked;

    public Map<String, String> toMap() {
        Map<String, String> map = new HashMap<>();
        map.put("tokenId", tokenId);
        map.put("userId", userId);
        if (tenantId != null) {
            map.put("tenantId", tenantId.toString());
        }
        map.put("issuedAt", issuedAt.toString());
        map.put("expiresAt", expiresAt.toString());
        map.put("revoked", String.valueOf(revoked));
        return map;
    }

    public static RefreshTokenData from(Map<Object, Object> map) {
        RefreshTokenData data = new RefreshTokenData();
        data.setTokenId((String) map.get("tokenId"));
        data.setUserId((String) map.get("userId"));
        if (map.get("tenantId") != null) {
            data.setTenantId(Long.parseLong((String) map.get("tenantId")));
        }
        if (map.get("issuedAt") != null) {
            data.setIssuedAt(LocalDateTime.parse((String) map.get("issuedAt")));
        }
        if (map.get("expiresAt") != null) {
            data.setExpiresAt(LocalDateTime.parse((String) map.get("expiresAt")));
        }
        if (map.get("revoked") != null) {
            data.setRevoked(Boolean.parseBoolean((String) map.get("revoked")));
        }
        return data;
    }

    public static RefreshTokenData from(String token) {
        // 从JWT token字符串解析（实际实现应调用JWT服务解析）
        RefreshTokenData data = new RefreshTokenData();
        data.setTokenId("parsed-from-token");
        data.setRevoked(false);
        return data;
    }
}

@Service
public class TokenRefreshService {
    @Autowired
    private TokenService tokenService;

    @Autowired
    private RefreshTokenStore refreshTokenStore;

    @Autowired
    private JwtService jwtService;

    private static final String REFRESH_TOKEN_COOKIE_NAME = "cp_refresh_token";

    /**
     * 处理 Token 刷新请求
     */
    public TokenRefreshResult refreshToken(HttpServletRequest request, HttpServletResponse response) {
        // 步骤1: 读取 httpOnly Cookie 中的 refresh token
        String refreshToken = extractRefreshTokenFromCookie(request);
        if (refreshToken == null) {
            return TokenRefreshResult.failure("Refresh token not found in cookie");
        }

        // 步骤2: 验证 refresh token
        TokenValidationResult validation = validateRefreshToken(refreshToken);
        if (!validation.isValid()) {
            return TokenRefreshResult.failure(validation.getError());
        }

        // 步骤3: 颁发新的 token 对
        TokenPair newTokens = generateNewTokenPair(validation.getUserId());

        // 步骤4: 使旧 refresh token 失效（旋转）
        refreshTokenStore.invalidateToken(validation.getTokenId());

        // 步骤5: 存储新的 refresh token
        refreshTokenStore.storeRefreshToken(
            validation.getUserId(),
            newTokens.getRefreshTokenId(),
            RefreshTokenData.from(newTokens.getRefreshToken())
        );

        // 步骤6: 设置新的 httpOnly Cookie
        tokenService.setTokenCookie(response, newTokens.getAccessToken());
        tokenService.setRefreshTokenCookie(response, newTokens.getRefreshToken());

        return TokenRefreshResult.success(newTokens);
    }

    /**
     * 验证 Refresh Token 的有效性
     */
    private TokenValidationResult validateRefreshToken(String refreshToken) {
        try {
            // 解析 token
            Claims claims = jwtService.parseRefreshToken(refreshToken);
            String tokenId = claims.getId();
            String userId = claims.getSubject();
            String tokenType = claims.get("type", String.class);

            // 验证 token 类型
            if (!"refresh".equals(tokenType)) {
                return TokenValidationResult.invalid("Invalid token type");
            }

            // 验证 token 是否已被撤销
            if (refreshTokenStore.isTokenRevoked(tokenId)) {
                return TokenValidationResult.invalid("Token has been revoked");
            }

            // 验证用户状态
            // IMPLEMENTATION REQUIRED - must query user table to verify user status
            if (!isUserActive(userId)) {
                return TokenValidationResult.invalid("User account is inactive");
            }

            return TokenValidationResult.valid(tokenId, userId);

        } catch (ExpiredJwtException e) {
            return TokenValidationResult.invalid("Token has expired");
        } catch (JwtException e) {
            return TokenValidationResult.invalid("Invalid token: " + e.getMessage());
        }
    }

    /**
     * 生成新的 Token 对
     */
    private TokenPair generateNewTokenPair(String userId) {
        // 生成新的 access token
        String accessToken = jwtService.generateAccessToken(userId);

        // 生成新的 refresh token
        String refreshToken = jwtService.generateRefreshToken(userId);

        // 提取 token ID（用于旋转追踪）
        String accessTokenId = jwtService.getTokenId(accessToken);
        String refreshTokenId = jwtService.getTokenId(refreshToken);

        return new TokenPair(accessToken, refreshToken, accessTokenId, refreshTokenId);
    }

    private String extractRefreshTokenFromCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        return Arrays.stream(cookies)
            .filter(c -> REFRESH_TOKEN_COOKIE_NAME.equals(c.getName()))
            .map(Cookie::getValue)
            .findFirst()
            .orElse(null);
    }

    private boolean isUserActive(String userId) {
        // IMPLEMENTATION REQUIRED - must query user table to verify user status is ACTIVE
        // Example implementation:
        // User user = userRepository.findById(userId);
        // return user != null && user.getStatus() == UserStatus.ACTIVE;
        return true;  // TEMPORARY: hardcoded for compilation
    }

    // 内部类：Token 验证结果
    private static class TokenValidationResult {
        private final boolean valid;
        private final String error;
        private final String tokenId;
        private final String userId;

        private TokenValidationResult(boolean valid, String error, String tokenId, String userId) {
            this.valid = valid;
            this.error = error;
            this.tokenId = tokenId;
            this.userId = userId;
        }

        static TokenValidationResult valid(String tokenId, String userId) {
            return new TokenValidationResult(true, null, tokenId, userId);
        }

        static TokenValidationResult invalid(String error) {
            return new TokenValidationResult(false, error, null, null);
        }

        boolean isValid() { return valid; }
        String getError() { return error; }
        String getTokenId() { return tokenId; }
        String getUserId() { return userId; }
    }

    // 内部类：Token 刷新结果
    @Data
    @AllArgsConstructor
    public static class TokenRefreshResult {
        private boolean success;
        private String message;
        private TokenPair tokenPair;

        public static TokenRefreshResult success(TokenPair tokenPair) {
            return new TokenRefreshResult(true, null, tokenPair);
        }

        public static TokenRefreshResult failure(String message) {
            return new TokenRefreshResult(false, message, null);
        }
    }
}

// Token 对
@Data
public class TokenPair {
    private final String accessToken;
    private final String refreshToken;
    private final String accessTokenId;
    private final String refreshTokenId;

    public TokenPair(String accessToken, String refreshToken, String accessTokenId, String refreshTokenId) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.accessTokenId = accessTokenId;
        this.refreshTokenId = refreshTokenId;
    }
}
```

### 2.3 测试策略（Redis 依赖场景）

| 测试场景 | 预期行为 | Redis 失败时的降级 |
|---------|---------|-------------------|
| 正常 Token 刷新 | 成功返回新 Token 对 | N/A |
| Refresh Token 过期 | 返回 401，要求重新登录 | 返回 401 |
| Refresh Token 被旋转 | 返回 401，提示并发刷新 | 返回 401 |
| Refresh Token 已撤销 | 返回 401 | 返回 401 |
| WebView 域名不匹配 | 返回 403 | 继续验证（不降级） |
| Redis 不可用 | N/A | 抛出 ServiceUnavailableException |

---

## 3. 认证端点限流设计

### 3.1 当前风险

认证端点（登录、注册等）没有限流保护，存在暴力破解风险。攻击者可以无限次尝试密码组合。

### 3.2 解决方案

#### 3.2.1 Redis 滑动窗口限流算法

```java
@Component
public class RateLimitService {
    @Autowired
    private StringRedisTemplate redisTemplate;

    private static final String LOGIN_RATE_LIMIT_KEY = "ratelimit:login:%s";  // %s = IP
    private static final int LOGIN_MAX_ATTEMPTS = 5;
    private static final int LOGIN_WINDOW_SECONDS = 15 * 60;  // 15分钟

    /**
     * 滑动窗口限流算法
     * 返回 true 表示通过，false 表示被限流
     */
    public boolean checkLoginRateLimit(String ip) {
        String key = String.format(LOGIN_RATE_LIMIT_KEY, ip);
        long now = System.currentTimeMillis();
        long windowStart = now - LOGIN_WINDOW_SECONDS * 1000L;

        // 使用 Redis 事务保证原子性
        return redisTemplate.execute(new SessionCallback<Boolean>() {
            @Override
            public Boolean execute(RedisOperations operations) {
                // 1. 移除窗口外的旧记录
                operations.opsForZSet().removeRangeByScore(key, 0, windowStart);
                // 2. 统计当前窗口内的请求数
                Long count = operations.opsForZSet().zCard(key);
                // 3. 如果超限，拒绝
                if (count >= LOGIN_MAX_ATTEMPTS) {
                    return false;
                }
                // 4. 添加当前请求时间戳
                operations.opsForZSet().add(key, String.valueOf(now), now);
                // 5. 设置过期时间
                operations.expire(key, LOGIN_WINDOW_SECONDS, TimeUnit.SECONDS);
                return true;
            }
        });
    }

    /**
     * 渐进式延迟计算
     * 返回需要延迟的秒数，0 表示立即可试
     */
    public int getProgressiveDelaySeconds(String ip) {
        String key = String.format(LOGIN_RATE_LIMIT_KEY, ip);
        Long count = redisTemplate.opsForZSet().zCard(key);

        if (count == null || count < LOGIN_MAX_ATTEMPTS) {
            return 0;
        }

        // 计算最近一次失败后需要等待的时间
        Set<ZSetOperations.TypedTuple<String>> records =
            redisTemplate.opsForZSet().reverseRangeWithScores(key, 0, 0);

        if (records.isEmpty()) {
            return 0;
        }

        long lastAttemptTime = records.iterator().next().getScore().longValue();
        long now = System.currentTimeMillis();

        // 渐进延迟：1分钟 -> 5分钟 -> 15分钟
        if (count < LOGIN_MAX_ATTEMPTS * 2) {
            return 60 - (int) ((now - lastAttemptTime) / 1000);
        } else if (count < LOGIN_MAX_ATTEMPTS * 4) {
            return 300 - (int) ((now - lastAttemptTime) / 1000);
        } else {
            return 900 - (int) ((now - lastAttemptTime) / 1000);
        }
    }
}
```

#### 3.2.2 限流配置

```yaml
# rate-limit-config.yaml
rate_limit:
  login:
    max_attempts: 5
    window_seconds: 900          # 15分钟
    progressive_delays:
      - threshold: 10           # 10次失败后
        delay_seconds: 60       # 延迟1分钟
      - threshold: 20           # 20次失败后
        delay_seconds: 300      # 延迟5分钟
      - threshold: 40           # 40次失败后
        delay_seconds: 900      # 延迟15分钟

  api:
    per_user:
      max_requests: 100
      window_seconds: 60
    per_tenant:
      max_requests: 1000
      window_seconds: 60
```

#### 3.2.3 限流异常处理

```java
// 错误响应
@Data
@Builder
public class ErrorResponse {
    private String code;
    private String message;
    private LocalDateTime timestamp;
    private Map<String, Object> details;

    public static ErrorResponse of(String code, String message) {
        return ErrorResponse.builder()
            .code(code)
            .message(message)
            .timestamp(LocalDateTime.now())
            .build();
    }
}

@ExceptionHandler(RateLimitExceededException.class)
public ResponseEntity<ErrorResponse> handleRateLimit(RateLimitExceededException ex) {
    HttpHeaders headers = new HttpHeaders();
    headers.add("Retry-After", String.valueOf(ex.getRetryAfterSeconds()));
    headers.add("X-RateLimit-Limit", String.valueOf(ex.getLimit()));
    headers.add("X-RateLimit-Remaining", String.valueOf(ex.getRemaining()));
    headers.add("X-RateLimit-Reset", String.valueOf(ex.getResetTime()));

    return ResponseEntity
        .status(HttpStatus.TOO_MANY_REQUESTS)
        .headers(headers)
        .body(ErrorResponse.of("RATE_LIMIT_EXCEEDED", ex.getMessage()));
}
```

### 3.3 测试策略（Redis 依赖场景）

| 测试场景 | 预期行为 | Redis 失败时的降级 |
|---------|---------|-------------------|
| 正常限流检查 | 5次/15分钟内通过 | 使用内存限流（单机模式） |
| 限流触发 | 返回 429 + Retry-After | 返回 429 + 固定延迟60s |
| 渐进延迟生效 | 返回 429 + 计算的延迟 | 返回 429 + 固定延迟 |
| Redis 不可用 | 降级到内存限流 | 抛出 ServiceUnavailableException |

**Redis 失败时的降级策略**：当 Redis 不可用时，系统应降级到基于内存的限流（仅保护单实例），并记录监控告警。恢复后应同步限流状态。

---

## 4. 交易所订单幂等性设计

### 4.1 当前风险

没有幂等性 Key 支持，重试操作可能导致重复扣款或重复兑现。

### 4.2 解决方案

#### 4.2.1 幂等性 Key 存储结构

```java
// JSON 工具类（封装 Jackson ObjectMapper）
public class JsonUtils {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    static {
        OBJECT_MAPPER.registerModule(new JavaTimeModule());
        OBJECT_MAPPER.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    /**
     * 将对象序列化为 JSON 字符串
     */
    public static String toJson(Object obj) {
        try {
            return OBJECT_MAPPER.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize object to JSON", e);
        }
    }

    /**
     * 将 JSON 字符串反序列化为对象
     */
    public static <T> T parse(String json, Class<T> clazz) {
        try {
            return OBJECT_MAPPER.readValue(json, clazz);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to parse JSON to object", e);
        }
    }

    /**
     * 将 JSON 字符串反序列化为复杂类型（含泛型）
     */
    public static <T> T parse(String json, TypeReference<T> typeRef) {
        try {
            return OBJECT_MAPPER.readValue(json, typeRef);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to parse JSON to object", e);
        }
    }
}

@Component
public class IdempotencyService {
    @Autowired
    private StringRedisTemplate redisTemplate;

    private static final String IDEMPOTENCY_KEY_PREFIX = "idempotency:";
    private static final long IDEMPOTENCY_TTL_HOURS = 24;

    /**
     * 复合幂等性 Key 格式
     * user_id + product_id + timestamp(1-min window)
     *
     * 注意：使用1分钟时间窗口是性能与精确性的权衡。
     * 窗口太小可能导致相同操作在窗口边界被拒绝，
     * 窗口太大可能允许过期请求通过。
     * 这是已知的 tradeoff，建议在监控中观察此场景。
     */
    public String generateCompositeKey(String userId, String productId, long timestamp) {
        long normalizedTimestamp = timestamp / 60_000;  // 归一化到1分钟
        return String.format("%s:%s:%d", userId, productId, normalizedTimestamp);
    }

    public Optional<IdempotencyRecord> getExistingResult(String idempotencyKey) {
        String key = IDEMPOTENCY_KEY_PREFIX + idempotencyKey;
        String value = redisTemplate.opsForValue().get(key);
        if (value == null) {
            return Optional.empty();
        }
        return Optional.of(JsonUtils.parse(value, IdempotencyRecord.class));
    }

    public void storeIdempotencyRecord(String idempotencyKey, IdempotencyRecord record) {
        String key = IDEMPOTENCY_KEY_PREFIX + idempotencyKey;
        redisTemplate.opsForValue().set(key, JsonUtils.toJson(record),
            IDEMPOTENCY_TTL_HOURS, TimeUnit.HOURS);
    }

    /**
     * 原子性检查-存储操作
     * 使用 SETNX 确保并发安全
     */
    public boolean tryAcquire(String idempotencyKey) {
        String key = IDEMPOTENCY_KEY_PREFIX + idempotencyKey;
        Boolean acquired = redisTemplate.opsForValue()
            .setIfAbsent(key, "PROCESSING", IDEMPOTENCY_TTL_HOURS, TimeUnit.HOURS);
        return Boolean.TRUE.equals(acquired);
    }
}

@Data
public class IdempotencyRecord {
    private String status;           // PROCESSING, COMPLETED, FAILED
    private int httpStatus;
    private String responseBody;
    private String responseHeaders;
    private long createdAt;
    private long completedAt;

    public static IdempotencyRecord completed(Object response) {
        IdempotencyRecord record = new IdempotencyRecord();
        record.setStatus("COMPLETED");
        record.setHttpStatus(200);
        record.setResponseBody(JsonUtils.toJson(response));
        record.setCreatedAt(System.currentTimeMillis());
        record.setCompletedAt(System.currentTimeMillis());
        return record;
    }

    public static IdempotencyRecord failed(String errorMessage) {
        IdempotencyRecord record = new IdempotencyRecord();
        record.setStatus("FAILED");
        record.setHttpStatus(500);
        record.setResponseBody(JsonUtils.toJson(Map.of("error", errorMessage)));
        record.setCreatedAt(System.currentTimeMillis());
        record.setCompletedAt(System.currentTimeMillis());
        return record;
    }
}
```

#### 4.2.2 订单服务集成

```java
// 交易所订单响应
@Data
@Builder
public class ExchangeOrderResponse {
    private String orderId;
    private String userId;
    private String productId;
    private BigDecimal pointsSpent;
    private String status;
    private LocalDateTime createdAt;
    private String message;

    public static ExchangeOrderResponse processing() {
        return ExchangeOrderResponse.builder()
            .status("PROCESSING")
            .message("Order is being processed")
            .build();
    }

    public static ExchangeOrderResponse success(String orderId, BigDecimal pointsSpent) {
        return ExchangeOrderResponse.builder()
            .orderId(orderId)
            .status("SUCCESS")
            .pointsSpent(pointsSpent)
            .createdAt(LocalDateTime.now())
            .build();
    }
}

@Service
public class ExchangeOrderService {
    @Autowired
    private IdempotencyService idempotencyService;

    public ResponseEntity<ExchangeOrderResponse> createOrder(
            HttpServletRequest request, ExchangeOrderRequest orderRequest) {

        // 1. 提取或生成幂等性 Key
        String idempotencyKey = request.getHeader("X-Idempotency-Key");
        if (idempotencyKey == null) {
            idempotencyKey = idempotencyService.generateCompositeKey(
                getCurrentUserId(),
                orderRequest.getProductId(),
                System.currentTimeMillis()
            );
        }

        // 2. 检查是否有已处理的请求
        Optional<IdempotencyRecord> existing = idempotencyService.getExistingResult(idempotencyKey);
        if (existing.isPresent() && "COMPLETED".equals(existing.get().getStatus())) {
            // 返回原始响应，不重复处理
            return ResponseEntity
                .status(existing.get().getHttpStatus())
                .body(JsonUtils.parse(existing.get().getResponseBody(), ExchangeOrderResponse.class));
        }

        // 3. 尝试获取锁
        if (!idempotencyService.tryAcquire(idempotencyKey)) {
            // 并发请求，返回处理中状态
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ExchangeOrderResponse.processing());
        }

        // 4. 处理订单
        try {
            ExchangeOrderResponse response = doCreateOrder(orderRequest);

            // 5. 存储结果
            idempotencyService.storeIdempotencyRecord(idempotencyKey,
                IdempotencyRecord.completed(response));

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            idempotencyService.storeIdempotencyRecord(idempotencyKey,
                IdempotencyRecord.failed(e.getMessage()));
            throw e;
        }
    }
}
```

### 4.3 测试策略（Redis 依赖场景）

| 测试场景 | 预期行为 | Redis 失败时的降级 |
|---------|---------|-------------------|
| 正常幂等性检查 | 首次请求正常返回，后续返回缓存 | 使用数据库记录作为备选 |
| 并发请求 | 仅一个成功，其余返回 409 | 返回 503 Service Unavailable |
| 幂等 Key 过期 | 新请求可正常处理 | 备选存储可用时正常，否则可能重复处理 |
| Redis 不可用 | 使用数据库幂等表作为 fallback | 抛出 ServiceUnavailableException |

**幂等性 Tradeoff**：复合 Key 使用1分钟时间窗口是已知的性能与精确性权衡：
- 窗口太小：可能导致相同操作在窗口边界被误拒
- 窗口太大：可能允许已过期的请求通过

建议通过监控观察窗口边界场景，根据实际业务调整窗口大小。

---

## 5. Redis 分布式锁 TTL 规范

### 5.1 当前风险

Redis 分布式锁的 TTL 未明确指定，可能导致吞吐量问题或锁提前过期。

### 5.2 解决方案

#### 5.2.1 锁类型与 TTL 规范

```java
public class RedisLockSpecifications {
    // 锁类型枚举
    public enum LockType {
        // 类型 | TTL | 说明
        CHECK_IN(5, "签到锁，防止重复签到"),
        EXCHANGE_ORDER(10, "兑换订单锁，保证订单处理原子性"),
        POINT_CALCULATION(30, "积分计算锁，保证计算过程完整"),
        BALANCE_UPDATE(10, "余额更新锁，原子性扣减");

        private final int ttlSeconds;
        private final String description;

        LockType(int ttlSeconds, String description) {
            this.ttlSeconds = ttlSeconds;
            this.description = description;
        }

        public int getTtlSeconds() {
            return ttlSeconds;
        }

        public String getDescription() {
            return description;
        }
    }

    // 锁 Key 格式
    public static final String LOCK_KEY_FORMAT = "lock:%s:%s";  // lock:{entity}:{id}

    public static String buildLockKey(LockType type, String entityId) {
        return String.format(LOCK_KEY_FORMAT, type.name().toLowerCase(), entityId);
    }
}
```

#### 5.2.2 Redisson 锁实现

```java
@Configuration
public class RedissonConfig {
    // Redis 连接配置（从 application.properties 读取）
    @Value("${spring.redis.host:localhost}")
    private String redisHost;

    @Value("${spring.redis.port:6379}")
    private int redisPort;

    @Value("${spring.redis.password:}")
    private String redisPassword;

    @Bean
    public RedissonClient redissonClient() {
        Config config = new Config();
        String address = "redis://" + redisHost + ":" + redisPort;

        SingleServerConfig serverConfig = config.useSingleServer()
            .setAddress(address)
            .setConnectionPoolSize(64)
            .setConnectionMinimumIdleSize(24)
            .setConnectTimeout(10000)
            .setTimeout(3000)
            .setRetryAttempts(3)
            .setRetryInterval(1500);

        if (redisPassword != null && !redisPassword.isEmpty()) {
            serverConfig.setPassword(redisPassword);
        }

        return Redisson.create(config);
    }
}

@Service
public class DistributedLockService {
    @Autowired
    private RedissonClient redissonClient;

    /**
     * 获取锁，支持自动续期
     */
    public <T> T executeWithLock(String lockKey, LockType lockType, Supplier<T> action) {
        RLock lock = redissonClient.getLock(lockKey);

        // 尝试获取锁，等待时间 = TTL，避免死锁
        boolean acquired = lock.tryLock(lockType.getTtlSeconds(), lockType.getTtlSeconds(), TimeUnit.SECONDS);
        if (!acquired) {
            throw new LockAcquisitionException("获取锁失败: " + lockKey);
        }

        try {
            return action.get();
        } finally {
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    /**
     * 带续期的锁检查
     * 适用于处理时间不确定的场景
     */
    public void executeWithLeaseExtension(String lockKey, int ttlSeconds, Runnable action) {
        RLock lock = redissonClient.getLock(lockKey);
        lock.lock(ttlSeconds, TimeUnit.SECONDS);

        try {
            // 启动看门狗自动续期
            // Redisson 的默认看门狗每 10 秒续期 TTL/3
            action.run();
        } finally {
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    /**
     * 尝试获取锁，非阻塞
     */
    public boolean tryLock(String lockKey, LockType lockType) {
        RLock lock = redissonClient.getLock(lockKey);
        return lock.tryLock();
    }
}
```

#### 5.2.3 Spring Integration + Lua 脚本

```java
@Component
public class LuaBasedLockService {
    @Autowired
    private StringRedisTemplate redisTemplate;

    // 原子性扩展锁 TTL 的 Lua 脚本
    private static final String EXTEND_LOCK_SCRIPT =
        "if redis.call('get', KEYS[1]) == ARGV[1] then " +
        "  return redis.call('pexpire', KEYS[1], ARGV[2]) " +
        "else " +
        "  return 0 " +
        "end";

    private final RedisScript<Long> extendScript = RedisScript.of(EXTEND_LOCK_SCRIPT, Long.class);

    public boolean extendLock(String lockKey, String lockValue, int additionalTtlMs) {
        Long result = redisTemplate.execute(
            extendScript,
            Collections.singletonList(lockKey),
            lockValue,
            String.valueOf(additionalTtlMs)
        );
        return result != null && result == 1;
    }
}
```

### 5.3 测试策略（Redis 依赖场景）

| 测试场景 | 预期行为 | Redis 失败时的降级 |
|---------|---------|-------------------|
| 正常获取锁 | 成功获取并执行 | N/A |
| 锁被占用 | 等待超时后抛出 LockAcquisitionException | 抛出 LockAcquisitionException |
| 锁续期 | Redisson 看门狗自动续期 | 锁可能在 TTL 后丢失 |
| Redis 不可用 | 无法获取锁 | 抛出 LockAcquisitionException |

---

## 6. 积分计算事务设计

### 6.1 当前风险

积分计算链（规则匹配 → 计算 → 上限检查 → 记录 → 连续签到检查 → 奖励发放）没有明确的事务边界，崩溃可能导致数据不一致。

### 6.2 解决方案

#### 6.2.1 事务边界定义

```java
// 积分交易记录
@Data
@Builder
public class PointTransaction {
    private Long id;
    private Long userId;
    private Long tenantId;
    private BigDecimal amount;
    private String type;           // EARN, REDEEM, EXPIRE, ADJUST
    private String source;          // CHECK_IN, PURCHASE, PROMOTION, etc.
    private String referenceId;     // 关联业务ID
    private BigDecimal balanceAfter;
    private LocalDateTime createdAt;
}

// 连续签到信息
@Data
@Builder
public class StreakInfo {
    private Long userId;
    private int currentStreak;
    private int longestStreak;
    private LocalDateTime lastCheckInDate;
    private boolean hasQualifyingStreak;

    public boolean hasQualifyingStreak() {
        return currentStreak >= 7;  // 连续7天及以上为有效连续签到
    }
}

// 积分奖励
@Data
@Builder
public class PointBonus {
    private Long id;
    private Long userId;
    private Long tenantId;
    private BigDecimal amount;
    private String bonusType;       // STREAK_BONUS, LEVEL_BONUS, etc.
    private String source;
    private LocalDateTime awardedAt;
}

// 积分计算结果
@Data
@Builder
public class PointCalculationResult {
    private boolean success;
    private PointTransaction transaction;
    private StreakInfo streakInfo;
    private String message;

    public static PointCalculationResult success(PointTransaction tx, StreakInfo streak) {
        return PointCalculationResult.builder()
            .success(true)
            .transaction(tx)
            .streakInfo(streak)
            .build();
    }
}

@Service
public class PointCalculationService {

    /**
     * 积分计算完整事务链
     * REQUIRED 传播级别：加入现有事务或创建新事务
     */
    @Transactional(propagation = Propagation.REQUIRED, rollbackFor = Exception.class)
    public PointCalculationResult calculateAndAwardPoints(Long userId, PointSource source) {
        // 步骤 1: 规则匹配
        List<PointRule> matchedRules = ruleMatchingService.findMatchedRules(userId, source);

        // 步骤 2: 积分计算
        BigDecimal totalPoints = calculatePoints(matchedRules, source);

        // 步骤 3: 积分上限检查
        totalPoints = applyCap(totalPoints, userId);

        // 步骤 4: 记录积分事务
        PointTransaction tx = recordTransaction(userId, totalPoints, source);

        // 步骤 5: 更新用户积分余额
        userPointAccountService.addPoints(userId, totalPoints);

        // 步骤 6: 连续签到检查
        StreakInfo streakInfo = checkStreak(userId, source);

        // 步骤 7: 发放连续签到奖励（如有）
        if (streakInfo.hasQualifyingStreak()) {
            awardStreakBonus(userId, streakInfo);
        }

        // 步骤 8: 发送积分变更事件
        publishPointChangedEvent(userId, tx);

        // 步骤 9: 记录事务输出（用于异步处理）
        // 注意：此步骤在事务内完成，但后续处理可异步

        return PointCalculationResult.success(tx, streakInfo);
    }

    /**
     * 连续签到奖励异步处理
     * 使用 Transactional Outbox 模式
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void awardStreakBonus(Long userId, StreakInfo streakInfo) {
        // 在新事务中执行，确保奖励发放的独立性
        // 如失败，外层事务已提交，不影响主流程
        PointBonus bonus = calculateStreakBonus(streakInfo);
        bonusService.awardBonus(userId, bonus);
    }
}
```

#### 6.2.2 Transactional Outbox 模式

```java
// 实体：事务性发件箱
@Entity
@Table(name = "cp_point_outbox")
public class PointOutbox {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "outbox_type")  // STREAK_BONUS, LEVEL_BONUS, etc.
    private String outboxType;

    @Column(name = "payload", columnDefinition = "JSON")
    private String payload;

    @Column(name = "status")  // PENDING, PROCESSING, COMPLETED, FAILED
    private String status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "retry_count")
    private Integer retryCount;
}

// 服务：处理 Outbox
@Component
public class OutboxProcessor {
    @Scheduled(fixedDelay = 5000)  // 每5秒处理一次
    @Transactional
    public void processOutbox() {
        List<PointOutbox> pending = outboxRepository
            .findTop100ByStatusOrderByCreatedAtAsc("PENDING");

        for (PointOutbox outbox : pending) {
            try {
                outbox.setStatus("PROCESSING");
                outboxRepository.save(outbox);

                processOutboxItem(outbox);

                outbox.setStatus("COMPLETED");
                outbox.setProcessedAt(LocalDateTime.now());
            } catch (Exception e) {
                outbox.setStatus("FAILED");
                outbox.setRetryCount(outbox.getRetryCount() + 1);
            }
            outboxRepository.save(outbox);
        }
    }
}
```

#### 6.2.3 事务失败场景处理

| 崩溃发生时机 | 事务状态 | 数据一致性保证 |
|-------------|---------|---------------|
| 步骤1-3 | 已回滚 | 用户积分未变化，安全 |
| 步骤4后 | 已提交 | 积分已记录，但连续签到奖励可能丢失 → 由 Outbox 补偿 |
| 步骤6后 | 已提交 | 所有数据一致 |

---

## 7. Refresh Token 规范

### 7.1 当前风险

Refresh Token 旋转机制不完整：TTL、原子旋转、并发刷新处理均未定义。

### 7.2 解决方案

#### 7.2.1 Token 配置

```java
@ConfigurationProperties(prefix = "token")
public class TokenProperties {
    // Access Token TTL: 15 分钟
    private int accessTokenTtlMinutes = 15;

    // Refresh Token TTL: 7 天
    private int refreshTokenTtlDays = 7;

    // Refresh Token 旋转：每次刷新使旧 token 失效
    private boolean refreshTokenRotation = true;

    // 并发刷新处理：使用 Redis SETNX 保证原子性
    private boolean concurrentRefreshHandling = true;
}
```

#### 7.2.2 Redis Token 存储结构

```java
@Component
public class RefreshTokenStore {
    @Autowired
    private StringRedisTemplate redisTemplate;

    @Autowired
    private TokenProperties tokenProperties;

    private static final String REFRESH_TOKEN_KEY = "token:refresh:%s";  // %s = tokenId
    private static final String USER_REFRESH_TOKEN_KEY = "token:user:refresh:%s";  // %s = userId

    public void storeRefreshToken(String userId, String tokenId, RefreshTokenData data) {
        String key = String.format(REFRESH_TOKEN_KEY, tokenId);
        String userKey = String.format(USER_REFRESH_TOKEN_KEY, userId);

        // 存储 token 数据
        redisTemplate.opsForHash().putAll(key, data.toMap());
        redisTemplate.expire(key, Duration.ofDays(tokenProperties.getRefreshTokenTtlDays()));

        // 记录用户的当前有效 refresh token（用于检测并发刷新）
        redisTemplate.opsForValue().set(userKey, tokenId,
            Duration.ofDays(tokenProperties.getRefreshTokenTtlDays()));
    }

    /**
     * 原子性 Token 旋转
     * 使用 SETNX 确保只有一个请求能成功刷新
     */
    public Optional<TokenPair> rotateRefreshToken(String oldTokenId, String userId) {
        String userKey = String.format(USER_REFRESH_TOKEN_KEY, userId);
        String currentTokenId = redisTemplate.opsForValue().get(userKey);

        // 检测是否为最新的 token
        if (!oldTokenId.equals(currentTokenId)) {
            // 已被旋转，说明有并发刷新请求
            return Optional.empty();
        }

        // 生成新 token 对
        TokenPair newTokens = generateNewTokenPair();

        // 原子性更新：只有当前 token 未变时才能更新
        Boolean updated = redisTemplate.opsForValue().setIfAbsent(
            userKey + ":lock", "1", Duration.ofSeconds(5));

        if (!Boolean.TRUE.equals(updated)) {
            // 获取锁失败，有并发请求
            return Optional.empty();
        }

        try {
            // 删除旧 token
            invalidateToken(oldTokenId);

            // 存储新 token
            storeRefreshToken(userId, newTokens.getRefreshTokenId(),
                RefreshTokenData.from(newTokens.getRefreshToken()));

            return Optional.of(newTokens);
        } finally {
            redisTemplate.delete(userKey + ":lock");
        }
    }

    public void invalidateToken(String tokenId) {
        String key = String.format(REFRESH_TOKEN_KEY, tokenId);
        String userId = redisTemplate.opsForHash().get(key, "userId");

        redisTemplate.delete(key);

        // 清除用户关联
        if (userId != null) {
            String userKey = String.format(USER_REFRESH_TOKEN_KEY, userId);
            redisTemplate.delete(userKey);
        }
    }

    public boolean isTokenRevoked(String tokenId) {
        String key = String.format(REFRESH_TOKEN_KEY, tokenId);
        return !redisTemplate.hasKey(key);
    }
}
```

#### 7.2.3 Logout 处理

```java
// 登出事件
@Data
@Builder
public class LogoutEvent {
    private String userId;
    private LocalDateTime timestamp;
    private String reason;
    private String ipAddress;
    private String userAgent;
}

@Service
public class LogoutService {
    @Autowired
    private RefreshTokenStore refreshTokenStore;

    @Autowired
    private JwtService jwtService;

    @Transactional
    public void logout(String accessToken, String refreshToken) {
        // 步骤1: 解析 access token 获取用户信息
        Claims claims = jwtService.parseAccessToken(accessToken);
        String userId = claims.getSubject();

        // 步骤2: 使 refresh token 失效
        String refreshTokenId = jwtService.extractTokenId(refreshToken);
        refreshTokenStore.invalidateToken(refreshTokenId);

        // 步骤3: 将 access token 加入黑名单
        long remainingTtl = jwtService.getRemainingTtl(accessToken);
        redisTemplate.opsForValue().set(
            "blacklist:access:" + accessToken,
            "1",
            Duration.ofSeconds(remainingTtl)
        );

        // 步骤4: 记录登出日志
        auditLogService.log(LogoutEvent.builder()
            .userId(userId)
            .timestamp(LocalDateTime.now())
            .reason("USER_LOGOUT")
            .build());
    }
}
```

#### 7.2.4 JwtService 方法定义

```java
@Service
public class JwtService {
    @Autowired
    private TokenProperties tokenProperties;

    @Autowired
    private StringRedisTemplate redisTemplate;

    private static final String ACCESS_TOKEN_BLACKLIST_PREFIX = "blacklist:access:";

    /**
     * 解析 Access Token
     */
    public Claims parseAccessToken(String token) {
        return Jwts.parserBuilder()
            .setSigningKey(getSigningKey())
            .build()
            .parseClaimsJws(token)
            .getBody();
    }

    /**
     * 解析 Refresh Token
     */
    public Claims parseRefreshToken(String token) {
        return Jwts.parserBuilder()
            .setSigningKey(getSigningKey())
            .build()
            .parseClaimsJws(token)
            .getBody();
    }

    /**
     * 获取 Access Token 的剩余 TTL
     */
    public long getRemainingTtl(String token) {
        Claims claims = parseAccessToken(token);
        Date expiration = claims.getExpiration();
        long now = System.currentTimeMillis() / 1000;
        long exp = expiration.getTime() / 1000;
        return Math.max(0, exp - now);
    }

    /**
     * 从 Token 中提取 Token ID (jti claim)
     */
    public String extractTokenId(String token) {
        Claims claims;
        try {
            claims = parseRefreshToken(token);
        } catch (Exception e) {
            claims = parseAccessToken(token);
        }
        return claims.getId();
    }

    /**
     * 生成 Access Token
     */
    public String generateAccessToken(String userId) {
        return generateToken(userId, "access", tokenProperties.getAccessTokenTtlMinutes());
    }

    /**
     * 生成 Refresh Token
     */
    public String generateRefreshToken(String userId) {
        return generateToken(userId, "refresh", tokenProperties.getRefreshTokenTtlDays());
    }

    /**
     * 获取 Token ID
     */
    public String getTokenId(String token) {
        Claims claims;
        try {
            claims = parseRefreshToken(token);
        } catch (Exception e) {
            claims = parseAccessToken(token);
        }
        return claims.getId();
    }

    private String generateToken(String userId, String tokenType, int ttlValue) {
        String tokenId = UUID.randomUUID().toString();
        long now = System.currentTimeMillis();

        Map<String, Object> claims = new HashMap<>();
        claims.put("type", tokenType);
        claims.put("userId", userId);

        int ttl = "access".equals(tokenType)
            ? tokenProperties.getAccessTokenTtlMinutes() * 60
            : tokenProperties.getRefreshTokenTtlDays() * 24 * 60 * 60;

        return Jwts.builder()
            .setId(tokenId)
            .setSubject(userId)
            .addClaims(claims)
            .setIssuedAt(new Date(now))
            .setExpiration(new Date(now + ttl * 1000L))
            .signWith(getSigningKey(), SignatureAlgorithm.HS256)
            .compact();
    }

    /**
     * 检查 Token 是否在黑名单中
     */
    public boolean isTokenBlacklisted(String token) {
        return Boolean.TRUE.equals(
            redisTemplate.hasKey(ACCESS_TOKEN_BLACKLIST_PREFIX + token)
        );
    }
}
```

### 7.3 测试策略（Redis 依赖场景）

| 测试场景 | 预期行为 | Redis 失败时的降级 |
|---------|---------|-------------------|
| 正常 Refresh Token 刷新 | 成功返回新 Token 对 | 返回 503 Service Unavailable |
| Refresh Token 旋转 | 旧 Token 失效，新 Token 生效 | Token 状态不一致（已知风险） |
| 并发刷新 | 仅一个成功，其余返回 401 | 所有请求失败 |
| Logout 处理 | Token 加入黑名单 | 黑名单不生效，Token 仍可用 |
| Redis 不可用 | N/A | 抛出 ServiceUnavailableException |

---

## 8. API 版本控制策略

### 8.1 当前风险

没有 API 版本控制策略，无法在不影响现有客户端的情况下进行 API 版本迭代。

### 8.2 解决方案

#### 8.2.1 版本策略定义

```java
public class ApiVersioningStrategy {
    /**
     * 版本策略类型
     */
    public enum StrategyType {
        // URL 路径版本：/api/v1/users
        // 最直观，便于调试和路由
        URL_PATH,

        // Header 版本：Accept: application/vnd.carbonpoint.v1+json
        // 保持 URL 整洁
        HEADER,

        // Query 参数版本：/api/users?version=1
        // 简单但不够规范
        QUERY_PARAM
    }

    // 默认采用 URL 路径版本
    public static final StrategyType DEFAULT_STRATEGY = StrategyType.URL_PATH;

    // 旧版本维护周期：6 个月
    public static final int DEPRECATION_GRACE_PERIOD_MONTHS = 6;
}
```

#### 8.2.2 版本路由配置

```java
@Configuration
public class ApiVersioningConfig implements WebMvcConfigurer {

    @Autowired
    private ApiVersionExtractor apiVersionExtractor;

    @Override
    public void configurePathMatch(PathMatchConfigurer configurer) {
        configurer.addPrefixPattern("/api/v{version}/{**path}");
    }
}

/**
 * URL 路径版本控制器
 * 提取 /api/v1/* 中的版本号
 */
@Component
public class ApiVersionExtractor {
    private static final Pattern VERSION_PATTERN = Pattern.compile("/api/v(\\d+)/");

    /**
     * 从请求路径中提取版本号
     */
    public int extractVersion(String path) {
        Matcher matcher = VERSION_PATTERN.matcher(path);
        if (matcher.find()) {
            return Integer.parseInt(matcher.group(1));
        }
        return 1;  // 默认版本
    }

    /**
     * 获取支持的最低版本
     */
    public int getMinSupportedVersion() {
        return 1;
    }

    /**
     * 获取当前最高版本
     */
    public int getCurrentVersion() {
        return 2;  // 随着版本迭代更新此值
    }

    /**
     * 检查版本是否支持
     */
    public boolean isVersionSupported(int version) {
        return version >= getMinSupportedVersion() && version <= getCurrentVersion();
    }
}

/**
 * 版本兼容性映射
 * 映射规则：
 * - 每个服务器版本维护一个客户端版本集合
 * - 新版本客户端可访问旧版本 API（向后兼容）
 * - 旧版本客户端只能访问对应版本的 API
 *
 * 示例：
 * - 服务器 v2: 客户端 v1, v2 都可访问（向后兼容）
 * - 服务器 v1: 仅客户端 v1 可访问
 *
 * 如何确定映射关系：
 * 1. 初始版本：v1 客户端 -> v1 服务器
 * 2. 发布 v2 时：v2 客户端可访问 v1,v2；v1 客户端仅访问 v1
 * 3. 当 v1 废弃后：仅 v2 客户端可访问 v2
 * 4. 以此类推，新版本总是包含对所有旧版本的兼容
 */
@Component
public class VersionCompatibilityMap {
    private static final Map<Integer, Set<Integer>> COMPATIBILITY = Map.of(
        1, Set.of(1),                                    // v1 客户端仅可访问 v1
        2, Set.of(1, 2),                                 // v2 客户端可访问 v1 和 v2
        3, Set.of(1, 2, 3)                               // v3 客户端可访问 v1, v2, v3
    );

    /**
     * 检查客户端版本是否与服务端版本兼容
     */
    public boolean isCompatible(int clientVersion, int serverVersion) {
        Set<Integer> supportedClients = COMPATIBILITY.getOrDefault(serverVersion, Set.of());
        return supportedClients.contains(clientVersion);
    }

    /**
     * 获取指定服务端版本支持的客户端版本集合
     */
    public Set<Integer> getSupportedClientVersions(int serverVersion) {
        return COMPATIBILITY.getOrDefault(serverVersion, Set.of());
    }

    /**
     * 获取兼容的最低客户端版本
     */
    public int getMinCompatibleClientVersion(int serverVersion) {
        return getSupportedClientVersions(serverVersion).stream()
            .mapToInt(Integer::intValue)
            .min()
            .orElse(1);
    }

    /**
     * 获取指定的服务器版本的建议升级路径
     */
    public Optional<Integer> getSuggestedUpgradeVersion(int currentVersion) {
        return Optional.ofNullable(COMPATIBILITY.get(currentVersion + 1));
    }
}
```

#### 8.2.3 破坏性变更判定规则

```java
/**
 * 破坏性变更（需要版本升级）
 * - 删除或重命名 API 端点
 * - 删除或重命名请求/响应字段
 * - 改变字段类型
 * - 改变字段含义
 * - 移除或改变认证要求
 * - 改变错误码含义
 * - 改变 Rate Limit 策略
 *
 * 非破坏性变更（无需版本升级）
 * - 添加新的可选请求字段
 * - 添加新的响应字段
 * - 添加新的 API 端点
 * - 放宽参数约束（如更长的最大长度）
 * - 添加新的错误码（追加）
 * - 性能优化
 * - Bug 修复
 */
```

#### 8.2.4 版本弃用处理

```java
@Configuration
public class DeprecationHandlingConfig {

    @Autowired
    private ApiVersionExtractor apiVersionExtractor;

    @Autowired
    private VersionCompatibilityMap compatibilityMap;

    @Bean
    public FilterRegistrationBean<DeprecationWarningFilter> deprecationWarningFilter() {
        return new FilterRegistrationBean<>() {{
            setFilter(new DeprecationWarningFilter(
                apiVersionExtractor, compatibilityMap));
            addUrlPatterns("/api/*");
        }};
    }
}

public class DeprecationWarningFilter implements Filter {

    private final ApiVersionExtractor apiVersionExtractor;
    private final VersionCompatibilityMap compatibilityMap;

    public DeprecationWarningFilter(ApiVersionExtractor apiVersionExtractor,
            VersionCompatibilityMap compatibilityMap) {
        this.apiVersionExtractor = apiVersionExtractor;
        this.compatibilityMap = compatibilityMap;
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        HttpServletRequest httpRequest = (HttpServletRequest) request;

        String path = httpRequest.getRequestURI();
        int version = apiVersionExtractor.extractVersion(path);

        if (isDeprecatedVersion(version)) {
            // 添加 Deprecation 响应头
            httpResponse.setHeader("Deprecation", "true");
            httpResponse.setHeader("Sunset", getSunsetDate(version));
            httpResponse.setHeader("Link",
                String.format("</api/v%d/users>; rel=\"successor-version\"", version + 1));

            // 记录弃用警告日志
            logger.warn("Deprecated API accessed: {} by {}", path, httpRequest.getRemoteAddr());
        }

        chain.doFilter(request, response);
    }

    private boolean isDeprecatedVersion(int version) {
        // 版本 1 在版本 3 发布后标记为废弃
        return version < apiVersionExtractor.getCurrentVersion() - 1;
    }

    private String getSunsetDate(int version) {
        // 计算弃用日期：发布后6个月
        LocalDate deprecationDate = LocalDate.now().plusMonths(6);
        return DateTimeFormatter.RFC_1123_DATE_TIME.format(deprecationDate.atStartOfDay());
    }
}
```

#### 8.2.5 版本生命周期

```
v1 发布 ───────────────────────────────────────────────┬─> v1 终止
                                                   (6个月后)
v2 发布 ───────────────────────────────────────────────┤─> v2 终止
                                                   (6个月后)
v3 发布 ────────────────────────────────────────────────┼─> v3 终止
                                                         ...
```

---

## 9. 实施优先级与里程碑

| 优先级 | 问题 | 预计工时 | 状态 |
|--------|------|---------|------|
| P0 | 平台管理员安全漏洞 | 2d | 待处理 |
| P0 | H5 Token 安全 | 2d | 待处理 |
| P1 | 认证端点限流 | 1d | 待处理 |
| P1 | 交易所订单幂等性 | 1.5d | 待处理 |
| P1 | Redis 锁 TTL 规范 | 0.5d | 待处理 |
| P1 | 积分计算事务 | 2d | 待处理 |
| P1 | Refresh Token 规范 | 1d | 待处理 |
| P2 | API 版本策略 | 1d | 待处理 |

---

## 10. 参考文档

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [IETF Rate Limiting Headers](https://datatracker.ietf.org/doc/html/rfc6585)
- [Redisson Distributed Locks](https://github.com/redisson/redisson)
- [Transactional Outbox Pattern](https://microservices.io/patterns/data/transactional-outbox.html)
- [REST API Versioning Strategies](https://restfulapi.net/versioning/)

---

**文档变更历史**

| 版本 | 日期 | 变更说明 | 作者 |
|------|------|---------|------|
| v1.0 | 2026-04-10 | 初始版本 | 平台技术架构团队 |
