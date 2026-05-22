# 统一资源架构长期演进路线图

## 📋 执行原则

1. **非侵入式** - 新功能作为现有系统的补充，不破坏旧功能
2. **双写并行** - 新旧数据共存，逐步迁移
3. **可逆切换** - 可随时回退到旧架构
4. **增量验证** - 每个阶段都要有完整的测试和验证

---

## 🗓️ 四阶段演进计划

### 🟢 阶段一：基础设施准备（预计1-2周）

**目标**：建立基础能力，不改变现有功能

#### 完成内容：
- ✅ 创建统一资源架构 DDL（已完成）
- ✅ 创建枚举类（已完成）
- ✅ N+1 查询优化（已完成）

#### 待做事项：

1. **数据库表创建（只读模式）**
   ```sql
   -- 只创建表，不插入数据
   -- 代码中暂不使用这些表
   ```

2. **创建资源注册表**
   - 新建 `ResourceRegistry` 接口和实现
   - 仅用于读取，不写入新表
   - 从现有 `Feature`、`Product` 表读取数据

3. **创建配置开关**
   ```yaml
   feature:
     unified-resources: false  # 默认关闭
   ```

---

### 🟢 阶段二：读路径迁移（预计2-3周）

**目标**：新系统先接管数据读取，旧系统继续处理写入

#### 完成内容：

1. **创建 PlatformResourceRepository**
   ```java
   // 同时读取新表和旧表进行对比验证
   public interface PlatformResourceRepository {
       List<PlatformResource> findAll();
       
       // 验证方法
       boolean validateConsistency();
   }
   ```

2. **增强 MenuService**
   ```java
   public interface MenuService {
       // 现有方法（继续使用）
       List<MenuItemVO> getTenantMenu(Long tenantId);
       
       // 新增：资源驱动的菜单（实验性质）
       List<MenuNode> getResourceDrivenMenu(Long tenantId);
   }
   ```

3. **前端添加功能开关**
   ```typescript
   // 添加实验性功能入口
   // 仅对特定用户/租户可见
   ```

#### 验证指标：
- 新旧系统查询结果一致性 ≥ 99.9%
- 新 API 响应时间 ≤ 旧 API 响应时间的 110%
- 无任何生产问题

---

### 🟢 阶段三：双写并行（预计2-3周）

**目标**：写入同时走新旧两个路径，以旧路径为准

#### 完成内容：

1. **创建 TenantResourceConfigService**
   ```java
   public interface TenantResourceConfigService {
       // 双写：同时写新表和旧表
       void updateConfig(Long tenantId, String resourceCode, Object config);
       
       // 读优先从新表，降级到旧表
       TenantResourceConfig getConfig(Long tenantId, String resourceCode);
   }
   ```

2. **在 PackageService 中添加资源配置能力**
   - 向后兼容的 API 设计
   - 现有功能完全不受影响

3. **数据同步脚本**
   ```sql
   -- 从旧表批量导入到新表
   -- 增量同步机制
   ```

#### 验证指标：
- 新旧数据自动同步延迟 ≤ 5秒
- 同步失败有明确告警和回滚机制
- 至少运行2周无重大问题

---

### 🟢 阶段四：完全切换（预计1-2周）

**目标**：新系统成为主路径，旧系统降级为只读

#### 完成内容：

1. **配置开关切换**
   ```yaml
   feature:
     unified-resources: true  # 开启新架构
     legacy-system: true      # 保留旧系统只读
   ```

2. **清理旧代码**（谨慎，保留回滚能力）
   - 标记为 @Deprecated
   - 保留3个版本再删除
   - 完整的迁移文档

3. **最终验证**
   - 性能压测
   - 安全审计
   - 完整的回滚验证

---

## 🔍 技术实现要点

### 1. Feature Toggle 设计

```java
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
public @interface UnifiedResourceFeature {
    boolean enabled() default false;
    String fallback() default "";
}
```

### 2. 双写策略

```java
@Service
@RequiredArgsConstructor
public class DualWriteService {
    
    public void write(ResourceConfig config) {
        // 1. 先写旧表（主）
        writeLegacy(config);
        
        // 2. 再写新表（异步，失败不影响主流程）
        try {
            asyncWriteNew(config);
        } catch (Exception e) {
            log.warn("New system write failed, but legacy succeeded", e);
        }
    }
}
```

### 3. 数据一致性验证

```java
@Scheduled(cron = "0 0 2 * * ?")  // 每天凌晨2点
public void validateDataConsistency() {
    List<ConsistencyIssue> issues = consistencyChecker.checkAll();
    if (!issues.isEmpty()) {
        alertService.sendAlert(issues);
    }
}
```

---

## 📊 里程碑检查清单

### 阶段一检查清单
- [ ] 新数据库表创建完成（无数据）
- [ ] ResourceRegistry 创建完成
- [ ] 配置开关可用
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] Code Review 通过

### 阶段二检查清单
- [ ] 资源读接口完成
- [ ] 新旧数据对比工具完成
- [ ] 一致性验证 ≥ 99.9%
- [ ] 性能满足要求
- [ ] 灰度发布 5% 流量

### 阶段三检查清单
- [ ] 双写逻辑完成
- [ ] 同步机制可靠
- [ ] 监控告警到位
- [ ] 运行2周无问题
- [ ] 灰度扩大到 50%

### 阶段四检查清单
- [ ] 开关切换完成
- [ ] 性能压测通过
- [ ] 安全审计通过
- [ ] 回滚演练成功
- [ ] 100% 流量切换
- [ ] 文档完整更新

---

## ⚠️ 风险与应对

### 风险1：数据不一致
**应对**：双写期间持续验证，发现不一致立即暂停并修复

### 风险2：性能回退
**应对**：保留旧系统随时可切换，性能基准测试前置

### 风险3：团队学习成本
**应对**：分模块培训，详细文档，代码审查

### 风险4：业务影响
**应对**：所有变更都有开关，可 1分钟 内回滚

---

## 🎯 成功标准

1. ✅ 功能完整度 100% - 覆盖旧系统所有功能
2. ✅ 性能改进 ≥ 20% - 查询速度更快
3. ✅ 代码复杂度降低 ≥ 30% - 更易维护
4. ✅ 可扩展性大幅提升 - 易于添加新资源类型
5. ✅ 零生产事故 - 迁移过程稳定

---

## 📅 预估总时间

**合计：6-10周（约1.5-2.5个月）**

- 阶段一：1-2周
- 阶段二：2-3周
- 阶段三：2-3周
- 阶段四：1-2周
- **Buffer（安全冗余）**：2周

---

**路线图创建完成！** 🚀
