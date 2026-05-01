# Migration Guide: From Old Feature/Product Tables to Unified Resources

## Overview

This guide describes the migration from the old feature/product tables to the new unified resource architecture. The old code is deprecated but kept for rollback purposes.

## Timeline

- **Current**: Old code is deprecated but still functional
- **v2.3**: Old code will be removed

## Changes

### Deprecated Components

The following components are deprecated and should no longer be used:

#### Entities
- `FeatureEntity` (use `PlatformResource` instead)
- `ProductEntity` (use `PlatformResource` instead)
- `ProductFeatureEntity`
- `PackageProductEntity`
- `PackageProductFeatureEntity`
- `PlatformProduct`
- `PlatformProductFeature`
- `PackagePlatformProduct`
- `PackagePlatformProductFeature`
- `TenantProductShelfEntity`
- `PlatformMallProductEntity`

#### Mappers
- `FeatureMapper`
- `ProductMapper`
- `ProductFeatureMapper`
- `PackageProductMapper`
- `PackageProductFeatureMapper`
- `PlatformProductMapper`
- `PlatformProductFeatureMapper`
- `PackagePlatformProductMapper`
- `PackagePlatformProductFeatureMapper`
- `TenantProductShelfMapper`
- `PlatformMallProductMapper`

#### Services
- `FeatureService` and `FeatureServiceImpl`
- `ProductService` and `ProductServiceImpl`
- `FeatureGateService`
- `PlatformProductService`
- `PackagePlatformProductService`
- `TenantProductService`
- `ProductRuleTemplateService`

#### Controllers
- `FeatureController`
- `ProductController`
- `EnterpriseFeatureController`
- `PackagePlatformProductController`
- `PlatformMallProductController`
- `TenantProductController`

### New Components

Use these instead:

#### Entities
- `PlatformResource`: Represents a platform-level resource (replaces both features and products)
- `PackageResource`: Represents a resource in a package
- `TenantResourceConfig`: Represents a tenant's configuration for a resource

#### Mappers
- `PlatformResourceMapper`
- `PackageResourceMapper`
- `TenantResourceConfigMapper`

#### Services
- `ResourceRegistry`: Manages platform resources
- `TenantResourceConfigService`: Manages tenant resource configurations

## Migration Steps

### 1. Update Imports

Replace imports of deprecated classes with new ones:

```java
// Before (deprecated)
import com.carbonpoint.system.entity.FeatureEntity;
import com.carbonpoint.system.service.FeatureService;

// After
import com.carbonpoint.system.entity.PlatformResource;
import com.carbonpoint.system.service.ResourceRegistry;
```

### 2. Update Code

#### Feature/Product Creation

```java
// Before (deprecated)
FeatureEntity feature = new FeatureEntity();
feature.setCode("my-feature");
feature.setName("My Feature");
feature.setType("config");
feature.setDefaultValue("true");
featureService.createFeature(feature);

// After
PlatformResource resource = new PlatformResource();
resource.setCode("my-feature");
resource.setName("My Feature");
resource.setType(ResourceType.FEATURE);
resource.setDefaultValue("true");
resourceRegistry.create(resource);
```

#### Querying Tenant Features

```java
// Before (deprecated)
Map<String, Boolean> features = featureGateService.getTenantFeatures(tenantId);
boolean isEnabled = featureGateService.isFeatureEnabled(tenantId, "my-feature");

// After
List<TenantResourceConfig> configs = tenantResourceConfigService.getByTenantId(tenantId);
boolean isEnabled = configs.stream()
    .filter(c -> c.getResourceCode().equals("my-feature"))
    .findFirst()
    .map(TenantResourceConfig::getIsEnabled)
    .orElse(false);
```

## Rollback

To rollback, you can still use the deprecated classes until v2.3. The old tables are still present and populated via dual-write.

## Data Migration

Data migration scripts are available in `openspec/review/ddl/`:
- `V2__unified_resource_architecture.sql`: Creates new tables
- `V2.1__data_migration.sql`: Migrates data from old tables to new tables
- `rollback_quick.sql`: Quick rollback script
