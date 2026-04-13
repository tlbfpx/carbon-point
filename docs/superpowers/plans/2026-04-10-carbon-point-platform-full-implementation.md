# Carbon Point Platform Full Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Carbon Point multi-tenant SaaS carbon point check-in platform from scratch, including backend Spring Boot application and frontend React applications with full features as specified in all module specs.

**Current Status (2026-04-13):** 项目已有部分代码实现。Phase 0 评审修复已完成大部分，Phase 1 实现 checklist 列出了 7 项当前待完成的关键任务。详见 [tasks.md](../openspec/changes/carbon-point-platform/tasks.md)。

**Architecture:** Backend uses Spring Boot 3.x + Java 21 with Maven multi-module structure. MyBatis-Plus provides ORM with automatic multi-tenancy isolation via TenantLineInnerInterceptor. Frontend uses React 18 + Ant Design 5 + Vite in a pnpm Monorepo with three applications (user H5, enterprise admin, platform admin) sharing common packages. JWT authentication with access/refresh tokens.

**Tech Stack:**
- Backend: Spring Boot 3.x, Java 21, Maven, MyBatis-Plus, Spring Security, JWT, MySQL, Redis
- Frontend: React 18, TypeScript, Ant Design 5, Vite, pnpm, React Query, Zustand
- Deployment: Docker, separate deployment for backend, H5, and dashboard

---

## Table of Contents

- [Chunk 1: Project Initialization & Infrastructure](#chunk-1-project-initialization--infrastructure)
- [Chunk 2: Database Schema & Common Module](#chunk-2-database-schema--common-module)
- [Chunk 3: Multi-tenant & Enterprise Tenant Management](#chunk-3-multi-tenant--enterprise-tenant-management)
- [Chunk 4: User Management](#chunk-4-user-management)
- [Chunk 5: RBAC Permission System](#chunk-5-rbac-permission-system)
- [Chunk 6: Point Rule Engine](#chunk-6-point-rule-engine)
- [Chunk 7: Check-in System](#chunk-7-check-in-system)
- [Chunk 8: Point Account](#chunk-8-point-account)
- [Chunk 9: Virtual Mall](#chunk-9-virtual-mall)
- [Chunk 10: Reporting Module](#chunk-10-reporting-module)
- [Chunk 11: Platform Admin Backend](#chunk-11-platform-admin-backend)
- [Chunk 12: Frontend Project Setup](#chunk-12-frontend-project-setup)
- [Chunk 13: H5 User App Frontend](#chunk-13-h5-user-app-frontend)
- [Chunk 14: Enterprise & Platform Admin Dashboard Frontend](#chunk-14-enterprise--platform-admin-dashboard-frontend)
- [Chunk 15: Integration Testing & Deployment](#chunk-15-integration-testing--deployment)

---

## Chunk 1: Project Initialization & Infrastructure

### File Structure

| Module | Files | Responsibility |
|--------|-------|----------------|
| carbon-common | `carbon-common/src/main/java/com/carbonpoint/common/` | Common utilities, response wrapper, exception handling, constants |
| carbon-system | `carbon-system/src/main/java/com/carbonpoint/system/` | Tenant, user, RBAC, authentication |
| carbon-checkin | `carbon-checkin/src/main/java/com/carbonpoint/checkin/` | Check-in business |
| carbon-points | `carbon-points/src/main/java/com/carbonpoint/points/` | Point engine and point account |
| carbon-mall | `carbon-mall/src/main/java/com/carbonpoint/mall/` | Virtual mall and exchange orders |
| carbon-report | `carbon-report/src/main/java/com/carbonpoint/report/` | Data reporting and dashboards |
| carbon-app | `carbon-app/src/main/java/com/carbonpoint/app/` | Spring Boot application entry point |

### Task 1: Initialize Maven Multi-module Project

**Files:**
- Create: `pom.xml` (root parent)
- Create: `carbon-common/pom.xml`
- Create: `carbon-system/pom.xml`
- Create: `carbon-checkin/pom.xml`
- Create: `carbon-points/pom.xml`
- Create: `carbon-mall/pom.xml`
- Create: `carbon-report/pom.xml`
- Create: `carbon-app/pom.xml`
- Create: `carbon-app/src/main/resources/application.yml`

- [ ] **Step 1: Write failing test for project structure**

```java
package com.carbonpoint.app;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class CarbonPointApplicationTests {

    @Test
    void contextLoads() {
        assertTrue(true);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `mvn test -pl carbon-app -Dtest=CarbonPointApplicationTests`
Expected: FAIL because application class doesn't exist

- [ ] **Step 3: Create root pom.xml with module structure**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.carbonpoint</groupId>
    <artifactId>carbon-point-parent</artifactId>
    <version>1.0.0-SNAPSHOT</version>
    <packaging>pom</packaging>
    <name>carbon-point-parent</name>
    <description>Carbon Point Parent POM</description>

    <properties>
        <maven.compiler.source>21</maven.compiler.source>
        <maven.compiler.target>21</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <spring-boot.version>3.2.0</spring-boot.version>
        <mybatis-plus.version>3.5.5</mybatis-plus.version>
        <jjwt.version>0.12.3</jjwt.version>
        <redisson.version>3.25.0</redisson.version>
        <poi.version>5.2.5</poi.version>
    </properties>

    <modules>
        <module>carbon-common</module>
        <module>carbon-system</module>
        <module>carbon-checkin</module>
        <module>carbon-points</module>
        <module>carbon-mall</module>
        <module>carbon-report</module>
        <module>carbon-app</module>
    </modules>

    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-dependencies</artifactId>
                <version>${spring-boot.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
            <dependency>
                <groupId>com.baomidou</groupId>
                <artifactId>mybatis-plus-boot-starter</artifactId>
                <version>${mybatis-plus.version}</version>
            </dependency>
        </dependencies>
    </dependencyManagement>

    <build>
        <pluginManagement>
            <plugins>
                <plugin>
                    <groupId>org.springframework.boot</groupId>
                    <artifactId>spring-boot-maven-plugin</artifactId>
                    <version>${spring-boot.version}</version>
                </plugin>
            </plugins>
        </pluginManagement>
    </build>
</project>
```

- [ ] **Step 4: Create carbon-common/pom.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <parent>
        <groupId>com.carbonpoint</groupId>
        <artifactId>carbon-point-parent</artifactId>
        <version>1.0.0-SNAPSHOT</version>
    </parent>

    <modelVersion>4.0.0</modelVersion>
    <artifactId>carbon-common</artifactId>
    <name>carbon-common</name>
    <description>Common utilities and shared components</description>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>com.baomidou</groupId>
            <artifactId>mybatis-plus-boot-starter</artifactId>
        </dependency>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
    </dependencies>
</project>
```

- [ ] **Step 5: Create other module pom.xml files and Spring Boot application class**

```java
package com.carbonpoint.app;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.carbonpoint.**.mapper")
public class CarbonPointApplication {
    public static void main(String[] args) {
        SpringApplication.run(CarbonPointApplication.class, args);
    }
}
```

- [ ] **Step 6: Configure application.yml with datasource, Redis, MyBatis-Plus**

```yaml
server:
  port: 8080

spring:
  application:
    name: carbon-point
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
    url: jdbc:mysql://localhost:3306/carbon_point?useUnicode=true&characterEncoding=utf-8&useSSL=false&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true
    username: root
    password: root
  redis:
    host: localhost
    port: 6379
    password:
    database: 0

mybatis-plus:
  configuration:
    map-underscore-to-camel-case: true
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
  global-config:
    db-config:
      id-type: auto
```

- [ ] **Step 7: Run test again to verify it passes**

Run: `mvn test -pl carbon-app -Dtest=CarbonPointApplicationTests`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add pom.xml */pom.xml carbon-app/src/main/java/com/carbonpoint/app/CarbonPointApplication.java carbon-app/src/main/resources/application.yml carbon-app/src/test/java/com/carbonpoint/app/CarbonPointApplicationTests.java
git commit -m "chore: initialize maven multi-module project"
```

### Task 2: Configure MyBatis-Plus Multi-tenant Interceptor

**Files:**
- Create: `carbon-common/src/main/java/com/carbonpoint/common/config/MyBatisPlusConfig.java`
- Create: `carbon-common/src/main/java/com/carbonpoint/common/tenant/TenantContext.java`
- Create: `carbon-common/src/main/java/com/carbonpoint/common/tenant/CustomTenantLineHandler.java`
- Create: `carbon-common/src/main/java/com/carbonpoint/common/annotation/InterceptorIgnore.java`

- [ ] **Step 1: Write failing test for tenant context**

```java
package com.carbonpoint.common.tenant;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class TenantContextTest {

    @Test
    void testSetAndGetTenantId() {
        TenantContext.setTenantId(1L);
        assertEquals(1L, TenantContext.getTenantId());
        TenantContext.clear();
        assertNull(TenantContext.getTenantId());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `mvn test -pl carbon-common -Dtest=TenantContextTest`
Expected: FAIL because class doesn't exist

- [ ] **Step 3: Implement TenantContextHolder**

```java
package com.carbonpoint.common.tenant;

public class TenantContext {
    private static final ThreadLocal<Long> TENANT_ID_HOLDER = new ThreadLocal<>();

    public static void setTenantId(Long tenantId) {
        TENANT_ID_HOLDER.set(tenantId);
    }

    public static Long getTenantId() {
        return TENANT_ID_HOLDER.get();
    }

    public static void clear() {
        TENANT_ID_HOLDER.remove();
    }
}
```

- [ ] **Step 4: Implement @InterceptorIgnore annotation**

```java
package com.carbonpoint.common.annotation;

import java.lang.annotation.*;

@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface InterceptorIgnore {
    boolean tenantLine() default true;
}
```

- [ ] **Step 5: Implement CustomTenantLineHandler for MyBatis-Plus**

```java
package com.carbonpoint.common.tenant;

import com.baomidou.mybatisplus.extension.plugins.handler.TenantLineHandler;
import com.carbonpoint.common.annotation.InterceptorIgnore;
import net.sf.jsqlparser.expression.Expression;
import net.sf.jsqlparser.expression.LongValue;

public class CustomTenantLineHandler implements TenantLineHandler {

    @Override
    public Expression getTenantId() {
        Long tenantId = TenantContext.getTenantId();
        if (tenantId != null) {
            return new LongValue(tenantId);
        }
        return null;
    }

    @Override
    public boolean ignoreTable(String tableName) {
        // Platform tables don't need tenant isolation
        return "tenants".equals(tableName)
            || "platform_admins".equals(tableName)
            || "permissions".equals(tableName);
    }
}
```

- [ ] **Step 6: Configure MyBatisPlusConfig with tenant interceptor**

```java
package com.carbonpoint.common.config;

import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.TenantLineInnerInterceptor;
import com.carbonpoint.common.tenant.CustomTenantLineHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MyBatisPlusConfig {

    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(new TenantLineInnerInterceptor(new CustomTenantLineHandler()));
        return interceptor;
    }
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `mvn test -pl carbon-common -Dtest=TenantContextTest`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add carbon-common/src/main/java/com/carbonpoint/common/config/ carbon-common/src/main/java/com/carbonpoint/common/tenant/ carbon-common/src/main/java/com/carbonpoint/common/annotation/
git commit -m "feat: add multi-tenant interceptor and tenant context"
```

### Task 3: Implement Unified Response Wrapper & Global Exception Handling

**Files:**
- Create: `carbon-common/src/main/java/com/carbonpoint/common/result/Result.java`
- Create: `carbon-common/src/main/java/com/carbonpoint/common/result/ErrorCode.java`
- Create: `carbon-common/src/main/java/com/carbonpoint/common/exception/BusinessException.java`
- Create: `carbon-common/src/main/java/com/carbonpoint/common/exception/GlobalExceptionHandler.java`

- [ ] **Step 1: Write Result class with generic type**

```java
package com.carbonpoint.common.result;

import lombok.Data;

@Data
public class Result<T> {
    private int code;
    private String message;
    private T data;

    public static <T> Result<T> success(T data) {
        Result<T> result = new Result<>();
        result.setCode(200);
        result.setMessage("success");
        result.setData(data);
        return result;
    }

    public static <T> Result<T> success() {
        return success(null);
    }

    public static <T> Result<T> error(int code, String message) {
        Result<T> result = new Result<>();
        result.setCode(code);
        result.setMessage(message);
        return result;
    }

    public static <T> Result<T> error(ErrorCode errorCode) {
        return error(errorCode.getCode(), errorCode.getMessage());
    }
}
```

- [ ] **Step 2: Define ErrorCode enum**

```java
package com.carbonpoint.common.result;

import lombok.Getter;

@Getter
public enum ErrorCode {
    // System
    SYSTEM_ERROR(500, "系统内部错误"),
    PARAM_ERROR(400, "参数错误"),
    UNAUTHORIZED(401, "未授权"),
    FORBIDDEN(403, "禁止访问"),

    // Tenant
    TENANT_NOT_FOUND(1001, "租户不存在"),
    TENANT_SUSPENDED(1002, "租户已停用"),

    // User
    USER_NOT_FOUND(2001, "用户不存在"),
    USER_DISABLED(2002, "用户已停用"),
    INVALID_PASSWORD(2003, "密码错误"),
    INVALID_INVITATION(2004, "邀请链接无效"),
    USER_LIMIT_EXCEEDED(2005, "超出用户数量限制"),

    // Check-in
    NOT_IN_CHECKIN_PERIOD(3001, "当前不在打卡时段"),
    ALREADY_CHECKED_IN(3002, "今日该时段已打卡"),

    // Point
    INSUFFICIENT_POINT(4001, "积分不足"),
    POINT_OVER_DAILY_LIMIT(4002, "已达到今日积分上限"),
    OVERLAPPING_PERIOD(4003, "时段时间重叠"),

    // Product
    PRODUCT_NOT_FOUND(5001, "商品不存在"),
    PRODUCT_OUT_OF_STOCK(5002, "商品已售完"),
    EXCHANGE_LIMIT_EXCEEDED(5003, "已达到兑换上限"),

    // Permission
    PERMISSION_DENIED(6001, "权限不足"),
    LAST_ADMIN_CANNOT_DELETE(6002, "至少保留一个超级管理员");

    private final int code;
    private final String message;

    ErrorCode(int code, String message) {
        this.code = code;
        this.message = message;
    }
}
```

- [ ] **Step 3: Implement BusinessException**

```java
package com.carbonpoint.common.exception;

import com.carbonpoint.common.result.ErrorCode;
import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException {
    private final int code;

    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.code = errorCode.getCode();
    }

    public BusinessException(int code, String message) {
        super(message);
        this.code = code;
    }
}
```

- [ ] **Step 4: Implement GlobalExceptionHandler**

```java
package com.carbonpoint.common.exception;

import com.carbonpoint.common.result.Result;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public Result<?> handleBusinessException(BusinessException e) {
        log.warn("Business exception: {}", e.getMessage());
        return Result.error(e.getCode(), e.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public Result<?> handleException(Exception e) {
        log.error("System exception", e);
        return Result.error(500, "系统内部错误");
    }
}
```

- [ ] **Step 5: Run test to verify Result and ErrorCode**\n\n```java\npackage com.carbonpoint.common.result;\n\nimport org.junit.jupiter.api.Test;\nimport static org.junit.jupiter.api.Assertions.*;\n\nclass ResultTest {\n\n    @Test\n    void testSuccess() {\n        Result<String> result = Result.success(\"test\");\n        assertEquals(200, result.getCode());\n        assertEquals(\"test\", result.getData());\n    }\n\n    @Test\n    void testError() {\n        Result<?> result = Result.error(ErrorCode.PARAM_ERROR);\n        assertEquals(ErrorCode.PARAM_ERROR.getCode(), result.getCode());\n        assertEquals(ErrorCode.PARAM_ERROR.getMessage(), result.getMessage());\n    }\n}\n```\n\nRun: `mvn test -pl carbon-common -Dtest=ResultTest`\nExpected: PASS\n\n- [ ] **Step 6: Commit**\n\n```bash\ngit add carbon-common/src/main/java/com/carbonpoint/common/result/ carbon-common/src/main/java/com/carbonpoint/common/exception/ carbon-common/src/test/java/com/carbonpoint/common/result/\ngit commit -m \"feat: add unified response and global exception handling\"\n```\n\n### Task 4: Configure Spring Security and JWT Authentication\n\n**Files:**\n- Create: `carbon-common/src/main/java/com/carbonpoint/common/jwt/JwtUtil.java`\n- Create: `carbon-common/src/main/java/com/carbonpoint/common/jwt/JwtAuthenticationFilter.java`\n- Create: `carbon-common/src/main/java/com/carbonpoint/common/config/SecurityConfig.java`\n\n- [ ] **Step 1: Add JJWT and Spring Security dependencies to carbon-common/pom.xml**\n\nAdd inside `<dependencies>`:\n\n```xml\n<dependency>\n    <groupId>org.springframework.boot</groupId>\n    <artifactId>spring-boot-starter-security</artifactId>\n</dependency>\n<dependency>\n    <groupId>io.jsonwebtoken</groupId>\n    <artifactId>jjwt-api</artifactId>\n    <version>${jjwt.version}</version>\n</dependency>\n<dependency>\n    <groupId>io.jsonwebtoken</groupId>\n    <artifactId>jjwt-impl</artifactId>\n    <version>${jjwt.version}</version>\n    <scope>runtime</scope>\n</dependency>\n<dependency>\n    <groupId>io.jsonwebtoken</groupId>\n    <artifactId>jjwt-jackson</artifactId>\n    <version>${jjwt.version}</version>\n    <scope>runtime</scope>\n</dependency>\n```\n\n- [ ] **Step 2: Implement JwtUtil**\n\n```java\npackage com.carbonpoint.common.jwt;\n\nimport io.jsonwebtoken.Claims;\nimport io.jsonwebtoken.Jwts;\nimport io.jsonwebtoken.security.Keys;\nimport org.springframework.beans.factory.annotation.Value;\nimport org.springframework.stereotype.Component;\n\nimport java.security.Key;\nimport java.util.Date;\nimport java.util.Base64;\n\n@Component\npublic class JwtUtil {\n\n    @Value(\"${jwt.secret}\")\n    private String secret;\n\n    @Value(\"${jwt.access-expiration}\")\n    private Long accessExpiration;\n\n    @Value(\"${jwt.refresh-expiration}\")\n    private Long refreshExpiration;\n\n    private Key getSigningKey() {\n        byte[] keyBytes = Base64.getDecoder().decode(secret);\n        return Keys.hmacShaKeyFor(keyBytes);\n    }\n\n    public String generateAccessToken(Long userId, Long tenantId, String roles) {\n        Date now = new Date();\n        Date expiryDate = new Date(now.getTime() + accessExpiration * 1000);\n\n        return Jwts.builder()\n                .setSubject(String.valueOf(userId))\n                .claim(\"tenantId\", tenantId)\n                .claim(\"roles\", roles)\n                .setIssuedAt(now)\n                .setExpiration(expiryDate)\n                .signWith(getSigningKey())\n                .compact();\n    }\n\n    public Claims parseToken(String token) {\n        return Jwts.parserBuilder()\n                .setSigningKey(getSigningKey())\n                .build()\n                .parseClaimsJws(token)\n                .getBody();\n    }\n\n    public Long getUserIdFromToken(String token) {\n        Claims claims = parseToken(token);\n        return Long.parseLong(claims.getSubject());\n    }\n\n    public Long getTenantIdFromToken(String token) {\n        Claims claims = parseToken(token);\n        return claims.get(\"tenantId\", Long.class);\n    }\n\n    public boolean isTokenExpired(String token) {\n        Claims claims = parseToken(token);\n        return claims.getExpiration().before(new Date());\n    }\n}\n```\n\nEOF
- [ ] **Step 3: Implement JwtAuthenticationFilter**

```java
package com.carbonpoint.common.jwt;

import com.carbonpoint.common.tenant.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String token = getTokenFromRequest(request);

        if (StringUtils.hasText(token) && !jwtUtil.isTokenExpired(token)) {
            Long userId = jwtUtil.getUserIdFromToken(token);
            Long tenantId = jwtUtil.getTenantIdFromToken(token);

            TenantContext.setTenantId(tenantId);

            String roles = jwtUtil.parseToken(token).get("roles", String.class);
            List<SimpleGrantedAuthority> authorities = Arrays.stream(roles.split(","))
                    .map(SimpleGrantedAuthority::new)
                    .collect(Collectors.toList());

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(userId, null, authorities);
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
            SecurityContextHolder.clearContext();
        }
    }

    private String getTokenFromRequest(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (StringUtils.hasText(bearer) && bearer.startsWith("Bearer ")) {
            return bearer.substring(7);
        }
        return null;
    }
}
```

- [ ] **Step 4: Configure SecurityConfig**

```java
package com.carbonpoint.common.config;

import com.carbonpoint.common.jwt.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**", "/api/public/**", "/platform/auth/**").permitAll()
                        .anyRequest().authenticated()
                );

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
```

- [ ] **Step 5: Add JWT configuration to application.yml**

Add to `carbon-app/src/main/resources/application.yml`:

```yaml
jwt:
  secret: your-jwt-secret-key-change-in-production-base64-encoded
  access-expiration: 7200 # 2 hours in seconds
  refresh-expiration: 2592000 # 30 days in seconds
```

- [ ] **Step 6: Run test for JwtUtil**

```java
package com.carbonpoint.common.jwt;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class JwtUtilTest {

    @Autowired
    private JwtUtil jwtUtil;

    @Test
    void testGenerateAndParseToken() {
        String token = jwtUtil.generateAccessToken(1L, 100L, "ROLE_ADMIN,ROLE_USER");
        assertNotNull(token);
        assertFalse(jwtUtil.isTokenExpired(token));
        assertEquals(1L, jwtUtil.getUserIdFromToken(token));
        assertEquals(100L, jwtUtil.getTenantIdFromToken(token));
    }
}
```

Run: `mvn test -pl carbon-common -Dtest=JwtUtilTest`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add carbon-common/pom.xml carbon-common/src/main/java/com/carbonpoint/common/jwt/ carbon-common/src/main/java/com/carbonpoint/common/config/SecurityConfig.java carbon-app/src/main/resources/application.yml carbon-common/src/test/java/com/carbonpoint/common/jwt/
git commit -m "feat: add spring security config and jwt utilities"
```


### Task 5: Implement MyBatis-Plus Auto Fill for created_at, updated_at, tenant_id

**Files:**
- Create: `carbon-common/src/main/java/com/carbonpoint/common/handler/MyMetaObjectHandler.java`

- [ ] **Step 1: Implement meta object handler**

```java
package com.carbonpoint.common.handler;

import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;
import com.carbonpoint.common.tenant.TenantContext;
import org.apache.ibatis.reflection.MetaObject;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class MyMetaObjectHandler implements MetaObjectHandler {

    @Override
    public void insertFill(MetaObject metaObject) {
        strictInsertFill(metaObject, "createdAt", LocalDateTime::now, LocalDateTime.class);
        strictInsertFill(metaObject, "updatedAt", LocalDateTime::now, LocalDateTime.class);

        Long tenantId = TenantContext.getTenantId();
        if (tenantId != null && hasGetter(metaObject, "tenantId")) {
            strictInsertFill(metaObject, "tenantId", () -> tenantId, Long.class);
        }
    }

    @Override
    public void updateFill(MetaObject metaObject) {
        strictUpdateFill(metaObject, "updatedAt", LocalDateTime::now, LocalDateTime.class);
    }

    private boolean hasGetter(MetaObject metaObject, String propertyName) {
        return metaObject.getGetterMap().containsKey(propertyName);
    }
}
```

- [ ] **Step 2: Verify configuration and commit**

```bash
git add carbon-common/src/main/java/com/carbonpoint/common/handler/
git commit -m "feat: add mybatis-plus auto fill handler"
```

## Chunk 1 Complete

---

## Chunk 2: Database Schema & Common Module Complete

---

## Chunk 2: Database Schema Creation

### Task 1: Create database schema file with all tables

**Files:**
- Create: `carbon-app/src/main/resources/db/schema.sql`

```sql
-- Create database
CREATE DATABASE IF NOT EXISTS carbon_point DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE carbon_point;

-- 1. Tenants (enterprise tenants)
CREATE TABLE tenants (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    logo_url VARCHAR(500),
    package_type VARCHAR(20) NOT NULL COMMENT 'FREE/PRO/ENTERPRISE',
    max_users INT NOT NULL DEFAULT 100,
    expire_time DATETIME NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT 'active/suspended',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status(status)
);

-- 2. Platform Admins
CREATE TABLE platform_admins (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(200) NOT NULL,
    nickname VARCHAR(50),
    role VARCHAR(20) NOT NULL COMMENT 'super_admin/admin/viewer',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Permissions (system-wide, no tenant_id)
CREATE TABLE permissions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    parent_id BIGINT NULL,
    name VARCHAR(50) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL COMMENT 'menu/button/api',
    path VARCHAR(200),
    sort_order INT DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_parent_id(parent_id)
);

-- 4. Users
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id BIGINT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    password VARCHAR(200) NOT NULL,
    nickname VARCHAR(50),
    avatar_url VARCHAR(500),
    total_points INT NOT NULL DEFAULT 0,
    available_points INT NOT NULL DEFAULT 0,
    consecutive_days INT NOT NULL DEFAULT 0,
    level INT NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_tenant_phone(tenant_id, phone),
    INDEX idx_tenant_id(tenant_id),
    INDEX idx_status(status)
);

-- 5. Tenant Invitations
CREATE TABLE tenant_invitations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id BIGINT NOT NULL,
    invite_code VARCHAR(50) NOT NULL UNIQUE,
    expired_at DATETIME,
    max_uses INT,
    used_count INT NOT NULL DEFAULT 0,
    created_by BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant_id(tenant_id),
    INDEX idx_invite_code(invite_code)
);

-- 6. Batch Imports
CREATE TABLE batch_imports (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id BIGINT NOT NULL,
    file_name VARCHAR(200) NOT NULL,
    total_count INT NOT NULL,
    success_count INT NOT NULL,
    fail_count INT NOT NULL,
    fail_detail TEXT,
    created_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant_id(tenant_id)
);

-- 7. Roles
CREATE TABLE roles (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(200),
    is_default BOOLEAN DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant_id(tenant_id)
);

-- 8. Role Permissions
CREATE TABLE role_permissions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    role_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_role_permission(role_id, permission_id),
    INDEX idx_role_id(role_id)
);

-- 9. User Roles
CREATE TABLE user_roles (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_role(user_id, role_id),
    INDEX idx_user_id(user_id)
);

-- 10. Point Rules
CREATE TABLE point_rules (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id BIGINT NOT NULL,
    type VARCHAR(30) NOT NULL COMMENT 'period/continuous/special_date/level/daily_limit',
    name VARCHAR(100),
    config JSON NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant_type(tenant_id, type),
    INDEX idx_enabled(enabled)
);

-- 11. Check-in Records
CREATE TABLE check_in_records (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    rule_id BIGINT NOT NULL,
    checkin_date DATE NOT NULL,
    checkin_time DATETIME NOT NULL,
    base_points INT NOT NULL,
    final_points INT NOT NULL,
    multiplier_rate DECIMAL(4,2) NOT NULL DEFAULT 1.0,
    level_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.0,
    extra_points INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_date_rule(user_id, checkin_date, rule_id),
    INDEX idx_tenant_user(tenant_id, user_id)
);

-- 12. Point Transactions
CREATE TABLE point_transactions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    type VARCHAR(30) NOT NULL COMMENT 'check_in/continuous_reward/manual_add/manual_deduct/exchange',
    amount INT NOT NULL,
    before_balance INT NOT NULL,
    after_balance INT NOT NULL,
    related_id BIGINT COMMENT 'check-in/order/etc id',
    remark VARCHAR(200),
    operated_by BIGINT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant_user(tenant_id, user_id),
    INDEX idx_type(type)
);

-- 13. Products
CREATE TABLE products (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    type VARCHAR(20) NOT NULL COMMENT 'coupon/recharge/privilege',
    point_price INT NOT NULL,
    stock INT COMMENT 'null for unlimited',
    limit_per_user INT COMMENT 'null for no limit',
    expire_days INT,
    fulfillment_config JSON,
    status VARCHAR(20) NOT NULL DEFAULT 'inactive' COMMENT 'inactive/active/sold_out',
    sort_order INT DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant_status(tenant_id, status)
);

-- 14. Exchange Orders
CREATE TABLE exchange_orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    point_price INT NOT NULL,
    code VARCHAR(100) COMMENT 'generated coupon code for coupon type',
    recharge_phone VARCHAR(20),
    status VARCHAR(20) NOT NULL COMMENT 'pending/fulfilled/used/expired/cancelled',
    expired_at DATETIME,
    used_at DATETIME,
    used_by BIGINT COMMENT 'admin id who fulfilled',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant_user(tenant_id, user_id),
    INDEX idx_status(status),
    INDEX idx_code(code)
);

-- 15. Operation Logs (platform admin)
CREATE TABLE platform_operation_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    admin_id BIGINT NOT NULL,
    admin_name VARCHAR(50),
    operation_type VARCHAR(50),
    operation_object VARCHAR(200),
    operation_desc TEXT,
    ip_address VARCHAR(50),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_admin_id(admin_id)
);
```


### Task 2: Insert initial permission data

```sql
-- Insert default permissions
INSERT INTO permissions (parent_id, name, code, type, path, sort_order) VALUES
-- Enterprise Dashboard
(NULL, '企业看板', 'enterprise:dashboard', 'menu', '/dashboard', 1),
(1, '查看看板', 'enterprise:dashboard:view', 'api', NULL, 1),

-- Enterprise Member Management
(NULL, '员工管理', 'enterprise:member', 'menu', '/member', 2),
(2, '员工列表', 'enterprise:member:list', 'api', NULL, 1),
(2, '创建员工', 'enterprise:member:create', 'api', NULL, 2),
(2, '导入员工', 'enterprise:member:import', 'api', NULL, 3),
(2, '邀请链接', 'enterprise:member:invite', 'api', NULL, 4),
(2, '编辑员工', 'enterprise:member:edit', 'api', NULL, 5),
(2, '禁用员工', 'enterprise:member:disable', 'api', NULL, 6),

-- Rules Management
(NULL, '规则配置', 'enterprise:rule', 'menu', '/rule', 3),
(8, '查看规则', 'enterprise:rule:view', 'api', NULL, 1),
(8, '创建规则', 'enterprise:rule:create', 'api', NULL, 2),
(8, '编辑规则', 'enterprise:rule:edit', 'api', NULL, 3),
(8, '删除规则', 'enterprise:rule:delete', 'api', NULL, 4),
(8, '启用禁用', 'enterprise:rule:toggle', 'api', NULL, 5),

-- Product Management
(NULL, '商品管理', 'enterprise:product', 'menu', '/product', 4),
(14, '商品列表', 'enterprise:product:list', 'api', NULL, 1),
(14, '创建商品', 'enterprise:product:create', 'api', NULL, 2),
(14, '编辑商品', 'enterprise:product:edit', 'api', NULL, 3),
(14, '删除商品', 'enterprise:product:delete', 'api', NULL, 4),
(14, '上下架', 'enterprise:product:toggle', 'api', NULL, 5),
(14, '库存管理', 'enterprise:product:stock', 'api', NULL, 6),

-- Order Management
(NULL, '订单管理', 'enterprise:order', 'menu', '/order', 5),
(21, '订单列表', 'enterprise:order:list', 'api', NULL, 1),
(21, '核销卡券', 'enterprise:order:fulfill', 'api', NULL, 2),
(21, '取消订单', 'enterprise:order:cancel', 'api', NULL, 3),

-- Point Operation
(NULL, '积分运营', 'enterprise:point', 'menu', '/point', 6),
(25, '查询积分', 'enterprise:point:query', 'api', NULL, 1),
(25, '发放积分', 'enterprise:point:add', 'api', NULL, 2),
(25, '扣减积分', 'enterprise:point:deduct', 'api', NULL, 3),
(25, '导出流水', 'enterprise:point:export', 'api', NULL, 4),

-- Reports
(NULL, '数据报表', 'enterprise:report', 'menu', '/report', 7),
(30, '查看报表', 'enterprise:report:view', 'api', NULL, 1),
(30, '导出报表', 'enterprise:report:export', 'api', NULL, 2),

-- Role Permission Management
(NULL, '角色权限', 'enterprise:role', 'menu', '/role', 8),
(33, '角色列表', 'enterprise:role:list', 'api', NULL, 1),
(33, '创建角色', 'enterprise:role:create', 'api', NULL, 2),
(33, '编辑角色', 'enterprise:role:edit', 'api', NULL, 3),
(33, '删除角色', 'enterprise:role:delete', 'api', NULL, 4),
(33, '分配权限', 'enterprise:role:assign-permission', 'api', NULL, 5),
(33, '分配用户', 'enterprise:role:assign-user', 'api', NULL, 6);

-- Create default platform super admin (username: admin, password: admin123 encoded with BCrypt)
INSERT INTO platform_admins (username, password, nickname, role, status) VALUES
('admin', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iAt6z2Xy', 'Super Admin', 'super_admin', 'active');
```

- [ ] **Step 1: Add insert statements to schema.sql**
- [ ] **Step 2: Run database schema creation**
  ```bash
  mysql -u root -p < carbon-app/src/main/resources/db/schema.sql
  ```
- [ ] **Step 3: Commit**

- [ ] **Step 1: Add insert statements to schema.sql**
- [ ] **Step 2: Run database schema creation**
  ```bash
  mysql -u root -p < carbon-app/src/main/resources/db/schema.sql
  ```
- [ ] **Step 3: Commit**

```bash
git add carbon-app/src/main/resources/db/schema.sql
git commit -m "chore: create complete database schema with initial data"
```

## Chunk 2 Complete

---

## Chunk 3: Multi-tenant & Enterprise Tenant Management

**Module:** `carbon-system`

### File Structure
- `carbon-system/src/main/java/com/carbonpoint/system/entity/` - Entity classes
- `carbon-system/src/main/java/com/carbonpoint/system/mapper/` - MyBatis-Plus mappers
- `carbon-system/src/main/java/com/carbonpoint/system/service/` - Business logic
- `carbon-system/src/main/java/com/carbonpoint/system/controller/` - REST controllers

### Task 1: Create Tenant Entity and Mapper

**Files:**
- Create: `carbon-system/src/main/java/com/carbonpoint/system/entity/Tenant.java`
- Create: `carbon-system/src/main/java/com/carbonpoint/system/mapper/TenantMapper.java`

- [ ] **Step 1: Entity class**

```java
package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("tenants")
public class Tenant {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String logoUrl;
    private String packageType;
    private Integer maxUsers;
    private LocalDateTime expireTime;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```

- [ ] **Step 2: Mapper interface**

```java
package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.system.entity.Tenant;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface TenantMapper extends BaseMapper<Tenant> {
}
```

- [ ] **Step 3: Commit**

```bash
git add carbon-system/src/main/java/com/carbonpoint/system/entity/ carbon-system/src/main/java/com/carbonpoint/system/mapper/
git commit -m "feat: add tenant entity and mapper"
```

