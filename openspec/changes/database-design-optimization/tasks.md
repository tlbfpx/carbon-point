## 1. Add logical delete field (deleted) to all business entities

- [ ] 1.1 Add `@TableLogic private Integer deleted;` to `User` (carbon-system)
- [ ] 1.2 Add `@TableLogic private Integer deleted;` to `Tenant` (carbon-system)
- [ ] 1.3 Add `@TableLogic private Integer deleted;` to `Role` (carbon-system)
- [ ] 1.4 Add `@TableLogic private Integer deleted;` to `Permission` (carbon-system)
- [ ] 1.5 Add `@TableLogic private Integer deleted;` to `UserRole` (carbon-system)
- [ ] 1.6 Add `@TableLogic private Integer deleted;` to `RolePermission` (carbon-system)
- [ ] 1.7 Add `@TableLogic private Integer deleted;` to `TenantInvitation` (carbon-system)
- [ ] 1.8 Add `@TableLogic private Integer deleted;` to `CheckInRecordEntity` (carbon-checkin)
- [ ] 1.9 Add `@TableLogic private Integer deleted;` to `TimeSlotRule` (carbon-checkin)
- [ ] 1.10 Add `@TableLogic private Integer deleted;` to `PointTransactionEntity` (carbon-common)
- [ ] 1.11 Add `@TableLogic private Integer deleted;` to `Product` (carbon-mall)
- [ ] 1.12 Add `@TableLogic private Integer deleted;` to `ExchangeOrder` (carbon-mall)
- [ ] 1.13 Add `@TableLogic private Integer deleted;` to `Department` (carbon-honor)
- [ ] 1.14 Add `@TableLogic private Integer deleted;` to `BadgeDefinition` (carbon-honor)
- [ ] 1.15 Add `@TableLogic private Integer deleted;` to `UserBadge` (carbon-honor)

## 2. Add missing indexes (SQL migration script)

- [ ] 2.1 `check_in_records`: Add `UNIQUE KEY uk_user_date (user_id, checkin_date)`
- [ ] 2.2 `check_in_records`: Add `INDEX idx_tenant_created (tenant_id, created_at)`
- [ ] 2.3 `point_transactions`: Add `INDEX idx_user_created (user_id, created_at)`
- [ ] 2.4 `point_transactions`: Add `INDEX idx_tenant_created (tenant_id, created_at)`
- [ ] 2.5 `exchange_orders`: Add `INDEX idx_tenant_user_status (tenant_id, user_id, order_status)`
- [ ] 2.6 `exchange_orders`: Add `UNIQUE KEY uk_coupon (coupon_code)`
- [ ] 2.7 `user_roles`: Add `INDEX idx_user (user_id)`, `INDEX idx_role (role_id)`
- [ ] 2.8 `role_permissions`: Add `INDEX idx_role_permission (role_id, permission_code)`
- [ ] 2.9 `products`: Add `INDEX idx_tenant_status (tenant_id, status, sort_order)`
- [ ] 2.10 `departments`: Add `INDEX idx_tenant (tenant_id)`
- [ ] 2.11 `user_badges`: Add `INDEX idx_user (user_id)`

## 3. Fix multi-tenant completeness (user_badges)

- [ ] 3.1 Add `private Long tenantId;` to `UserBadge` entity (carbon-honor)
- [ ] 3.2 Create migration SQL: Update `user_badges.tenant_id` from `users.tenant_id` via join

## 4. Remove duplicate PermissionEntity

- [ ] 4.1 Delete `carbon-common/src/main/java/com/carbonpoint/common/entity/PermissionEntity.java`
- [ ] 4.2 Delete `carbon-common/src/main/java/com/carbonpoint/common/entity/RolePermissionEntity.java`
- [ ] 4.3 Verify all references use `carbon-point/carbon-system/src/main/java/com/carbonpoint/system/entity/Permission.java`

## 5. Add optimistic locking version field

- [ ] 5.1 Add `@Version private Long version;` to `CheckInRecordEntity` (carbon-checkin)
- [ ] 5.2 Add `@Version private Long version;` to `PointTransactionEntity` (carbon-common)  (optional but recommended)
- [ ] 5.3 Add `@Version private Long version;` to `Tenant` (carbon-system)

## 6. Standardize ID generation strategy

- [ ] 6.1 Change `User.id` from `IdType.NONE` to `IdType.AUTO`
- [ ] 6.2 Change `BadgeDefinition.id` from `Integer` to `Long`, `IdType.AUTO`

## 7. Verify and test

- [ ] 7.1 Compile verify no compilation errors
- [ ] 7.2 Run existing tests to ensure no regression
- [ ] 7.3 Generate Flyway/Liquibase migration SQL script
