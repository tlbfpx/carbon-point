# API 优化指南

## 已完成的优化

### 1. ✅ N+1 查询修复

**问题**：`PackageServiceImpl.getPackageDetail()` 在循环中查询产品和功能

**解决方案**：
- 批量查询所有产品
- 批量查询所有功能配置
- 批量查询所有 FeatureEntity
- 在内存中组装数据

**性能改进**：从 (1 + 2N) 次查询降为 4 次查询

---

## 建议的前端优化

### 2. API 调用并行化

**问题**：当前串行调用多个 API

**优化示例**：

```typescript
// ❌ 串行调用（较慢）
const resources = await request.get('/api/enterprise/resources');
const info = await request.get('/api/enterprise/resources/info');

// ✅ 并行调用（较快）
const [resourcesRes, infoRes] = await Promise.all([
  request.get('/api/enterprise/resources'),
  request.get('/api/enterprise/resources/info'),
]);
```

### 3. 乐观更新

**问题**：每次操作都重新加载所有数据

**优化示例**：

```typescript
// ❌ 重新加载所有
const handleToggle = async (resource, checked) => {
  await request.put(`/api/enterprise/resources/${resource.id}`, { enabled: checked });
  loadResources(); // 重新加载所有
};

// ✅ 乐观更新
const handleToggle = async (resource, checked) => {
  // 先更新本地状态
  setResources(prev => prev.map(r => 
    r.id === resource.id ? { ...r, enabled: checked } : r
  ));
  
  try {
    // 异步更新服务器
    await request.put(`/api/enterprise/resources/${resource.id}`, { enabled: checked });
    message.success('更新成功');
  } catch (error) {
    // 失败时回滚
    loadResources();
    message.error('更新失败');
  }
};
```

### 4. useMemo 优化

**问题**：每次重新渲染都重新计算菜单树

**优化示例**：

```typescript
import { useMemo } from 'react';

// ❌ 每次都重新计算
const menuTree = buildMenuTree(resources, userPermissions);

// ✅ 使用 useMemo 缓存
const menuTree = useMemo(() => {
  return buildMenuTree(resources, userPermissions);
}, [resources, userPermissions]); // 仅在依赖项变化时重新计算
```

---

## 创建的文件

### 后端
- ✅ `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/enums/PackageStatus.java`
- ✅ `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/enums/TenantPackageStatus.java`
- ✅ `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/enums/ChangeType.java`
- ✅ `saas-backend/carbon-system/src/main/java/com/carbonpoint/system/enums/ResourceType.java`

### 前端
- ✅ `saas-frontend/platform-frontend/src/constants/resource.ts`

### 修复的代码
- ✅ `PackageServiceImpl.getPackageDetail()` - N+1 查询优化
- ✅ `PackageServiceImpl.loadFeatureEntities()` - 批量查询优化
