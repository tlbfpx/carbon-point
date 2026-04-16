## Dark Matter: Hidden Couplings

Found 20 file pairs that frequently co-change but have no import relationship:

| File A | File B | NPMI | Co-Changes | Lift |
|--------|--------|------|------------|------|
| apps/dashboard/e2e/pages/enterprise/ReportsPage.ts | apps/dashboard/e2e/pages/enterprise/RolesPage.ts | 1.000 | 4 | 10.75 |
| carbon-app/src/main/resources/application-dev.yml | carbon-app/src/main/resources/application.yml | 1.000 | 3 | 14.33 |
| carbon-app/target/classes/application-dev.yml | carbon-app/target/classes/application.yml | 1.000 | 3 | 14.33 |
| carbon-app/target/classes/application-dev.yml | carbon-app/target/classes/com/carbonpoint/app/Application.class | 1.000 | 3 | 14.33 |
| carbon-app/target/classes/application-dev.yml | carbon-checkin/target/classes/com/carbonpoint/checkin/controller/CheckInController.class | 1.000 | 3 | 14.33 |
| carbon-app/target/classes/application-dev.yml | carbon-checkin/target/classes/com/carbonpoint/checkin/entity/CheckInRecordEntity.class | 1.000 | 3 | 14.33 |
| carbon-app/target/classes/application-dev.yml | carbon-checkin/target/classes/com/carbonpoint/checkin/entity/TimeSlotRule.class | 1.000 | 3 | 14.33 |
| carbon-app/target/classes/application-dev.yml | carbon-checkin/target/classes/com/carbonpoint/checkin/service/CheckInService.class | 1.000 | 3 | 14.33 |
| carbon-app/target/classes/application-dev.yml | carbon-checkin/target/test-classes/com/carbonpoint/checkin/TestApplication$InMemoryValueOperations.class | 1.000 | 3 | 14.33 |
| carbon-app/target/classes/application-dev.yml | carbon-checkin/target/test-classes/com/carbonpoint/checkin/TestApplication.class | 1.000 | 3 | 14.33 |
| carbon-app/target/classes/application-dev.yml | carbon-checkin/target/test-classes/db/schema-h2.sql | 1.000 | 3 | 14.33 |
| carbon-app/target/classes/application-dev.yml | carbon-common/target/classes/com/carbonpoint/common/security/SecurityConfig.class | 1.000 | 3 | 14.33 |
| carbon-app/target/classes/application-dev.yml | carbon-mall/target/classes/com/carbonpoint/mall/controller/ProductController.class | 1.000 | 3 | 14.33 |
| carbon-app/target/classes/application-dev.yml | carbon-mall/target/classes/com/carbonpoint/mall/entity/ExchangeOrder.class | 1.000 | 3 | 14.33 |
| carbon-app/target/classes/application-dev.yml | carbon-mall/target/classes/com/carbonpoint/mall/entity/Product.class | 1.000 | 3 | 14.33 |
| carbon-app/target/classes/application-dev.yml | carbon-mall/target/classes/com/carbonpoint/mall/service/ExchangeService.class | 1.000 | 3 | 14.33 |
| carbon-app/target/classes/application-dev.yml | carbon-mall/target/classes/com/carbonpoint/mall/service/ProductService.class | 1.000 | 3 | 14.33 |
| carbon-app/target/classes/application-dev.yml | carbon-points/target/classes/com/carbonpoint/points/service/PointEngineService.class | 1.000 | 3 | 14.33 |
| carbon-app/target/classes/application-dev.yml | carbon-system/target/classes/com/carbonpoint/system/controller/PackageController.class | 1.000 | 3 | 14.33 |
| carbon-app/target/classes/application-dev.yml | carbon-system/target/classes/com/carbonpoint/system/controller/RoleController.class | 1.000 | 3 | 14.33 |

These pairs likely share an architectural concern invisible to static analysis.
Consider adding explicit documentation or extracting the shared concern.