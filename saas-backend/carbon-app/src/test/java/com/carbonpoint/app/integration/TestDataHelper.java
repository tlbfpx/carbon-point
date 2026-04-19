package com.carbonpoint.app.integration;

import com.carbonpoint.stair.entity.CheckInRecordEntity;
import com.carbonpoint.stair.entity.TimeSlotRule;
import com.carbonpoint.stair.mapper.CheckInRecordMapper;
import com.carbonpoint.stair.mapper.TimeSlotRuleMapper;
import com.carbonpoint.common.entity.PointTransactionEntity;
import com.carbonpoint.common.mapper.PointTransactionMapper;
import com.carbonpoint.mall.entity.ExchangeOrder;
import com.carbonpoint.mall.entity.Product;
import com.carbonpoint.mall.mapper.ExchangeOrderMapper;
import com.carbonpoint.mall.mapper.MallProductMapper;
import com.carbonpoint.points.entity.PointRule;
import com.carbonpoint.points.mapper.PointRuleMapper;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.mapper.UserMapper;
import com.carbonpoint.common.security.AppPasswordEncoder;
import com.carbonpoint.system.mapper.TenantMapper;
import com.carbonpoint.system.entity.Tenant;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

/**
 * Test data factory for integration tests.
 * Provides fluent builders for creating test entities.
 */
@Component
public class TestDataHelper {

    @Autowired private UserMapper userMapper;
    @Autowired private TenantMapper tenantMapper;
    @Autowired private TimeSlotRuleMapper timeSlotRuleMapper;
    @Autowired private CheckInRecordMapper checkInRecordMapper;
    @Autowired private PointTransactionMapper pointTransactionMapper;
    @Autowired private PointRuleMapper pointRuleMapper;
    @Autowired private MallProductMapper productMapper;
    @Autowired private ExchangeOrderMapper exchangeOrderMapper;
    @Autowired private AppPasswordEncoder passwordEncoder;

    // ─────────────────────────────────────────
    // Tenant helpers
    // ─────────────────────────────────────────

    public TenantBuilder tenant(String name) {
        return new TenantBuilder(name);
    }

    public class TenantBuilder {
        private final Tenant tenant = new Tenant();

        private TenantBuilder(String name) {
            tenant.setName(name);
            tenant.setPackageType("pro");
            tenant.setMaxUsers(100);
            tenant.setStatus("active");
        }

        public TenantBuilder id(Long id) {
            tenant.setId(id);
            return this;
        }

        public TenantBuilder packageType(String packageType) {
            tenant.setPackageType(packageType);
            return this;
        }

        public TenantBuilder status(String status) {
            tenant.setStatus(status);
            return this;
        }

        public Tenant save() {
            // Ensure TenantContext is set for the TenantLineInnerInterceptor
            com.carbonpoint.common.tenant.TenantContext.setTenantId(tenant.getId());
            tenantMapper.insertOrUpdate(tenant);
            return tenant;
        }
    }

    // ─────────────────────────────────────────
    // User helpers
    // ─────────────────────────────────────────

    public UserBuilder user(Long tenantId, String phone, String password) {
        return new UserBuilder(tenantId, phone, password);
    }

    public class UserBuilder {
        private final User user = new User();

        private UserBuilder(Long tenantId, String phone, String password) {
            user.setTenantId(tenantId);
            user.setPhone(phone);
            user.setPasswordHash(passwordEncoder.encode(password));
            user.setNickname("User_" + phone);
            user.setStatus("active");
            user.setLevel(1);
            user.setTotalPoints(0);
            user.setAvailablePoints(0);
            user.setFrozenPoints(0);
            user.setConsecutiveDays(0);
        }

        public UserBuilder id(Long id) {
            user.setId(id);
            return this;
        }

        public UserBuilder nickname(String nickname) {
            user.setNickname(nickname);
            return this;
        }

        public UserBuilder status(String status) {
            user.setStatus(status);
            return this;
        }

        public UserBuilder level(int level) {
            user.setLevel(level);
            return this;
        }

        public UserBuilder totalPoints(int totalPoints) {
            user.setTotalPoints(totalPoints);
            return this;
        }

        public UserBuilder availablePoints(int availablePoints) {
            user.setAvailablePoints(availablePoints);
            return this;
        }

        public UserBuilder frozenPoints(int frozenPoints) {
            user.setFrozenPoints(frozenPoints);
            return this;
        }

        public UserBuilder consecutiveDays(int consecutiveDays) {
            user.setConsecutiveDays(consecutiveDays);
            return this;
        }

        public UserBuilder lastCheckinDate(LocalDate date) {
            user.setLastCheckinDate(date);
            return this;
        }

        public User save() {
            // Ensure TenantContext is set for the TenantLineInnerInterceptor
            com.carbonpoint.common.tenant.TenantContext.setTenantId(user.getTenantId());
            userMapper.insertOrUpdate(user);
            return user;
        }
    }

    // ─────────────────────────────────────────
    // TimeSlotRule helpers
    // ─────────────────────────────────────────

    public TimeSlotRuleBuilder timeSlotRule(Long tenantId, String name, LocalTime start, LocalTime end) {
        return new TimeSlotRuleBuilder(tenantId, name, start, end);
    }

    public class TimeSlotRuleBuilder {
        private final TimeSlotRule rule = new TimeSlotRule();

        private TimeSlotRuleBuilder(Long tenantId, String name, LocalTime start, LocalTime end) {
            rule.setTenantId(tenantId);
            rule.setName(name);
            rule.setStartTime(start);
            rule.setEndTime(end);
            rule.setEnabled(true);
        }

        public TimeSlotRuleBuilder id(Long id) {
            rule.setId(id);
            return this;
        }

        public TimeSlotRuleBuilder disabled() {
            rule.setEnabled(false);
            return this;
        }

        public TimeSlotRule save() {
            // Ensure TenantContext is set for the TenantLineInnerInterceptor
            com.carbonpoint.common.tenant.TenantContext.setTenantId(rule.getTenantId());
            // Always use insert - MyBatis-Plus respects explicit IDs for inserts
            timeSlotRuleMapper.insert(rule);
            // Also create the corresponding PointRule that the CheckInService looks up
            java.time.format.DateTimeFormatter TF = java.time.format.DateTimeFormatter.ofPattern("HH:mm:ss");
            String config = String.format(
                    "{\"startTime\":\"%s\",\"endTime\":\"%s\",\"minPoints\":10,\"maxPoints\":20}",
                    rule.getStartTime().withSecond(0).withNano(0).format(TF),
                    rule.getEndTime().withSecond(59).withNano(0).format(TF)
            );
            PointRule pr = new PointRule();
            pr.setId(rule.getId());
            pr.setTenantId(rule.getTenantId());
            pr.setType("time_slot");
            pr.setName(rule.getName());
            pr.setConfig(config);
            pr.setEnabled(rule.getEnabled());
            pr.setSortOrder(0);
            try {
                pointRuleMapper.insert(pr);
            } catch (Exception e) {
                // ID already exists (seed data), ignore
            }
            return rule;
        }
    }

    // ─────────────────────────────────────────
    // CheckInRecord helpers
    // ─────────────────────────────────────────

    public CheckInRecordBuilder checkInRecord(Long userId, Long tenantId, Long slotRuleId, LocalDate date) {
        return new CheckInRecordBuilder(userId, tenantId, slotRuleId, date);
    }

    public class CheckInRecordBuilder {
        private final CheckInRecordEntity record = new CheckInRecordEntity();

        private CheckInRecordBuilder(Long userId, Long tenantId, Long slotRuleId, LocalDate date) {
            record.setId(System.nanoTime());
            record.setUserId(userId);
            record.setTenantId(tenantId);
            record.setTimeSlotRuleId(slotRuleId);
            record.setCheckinDate(date);
            record.setCheckinTime(java.time.LocalDateTime.now());
            record.setBasePoints(10);
            record.setFinalPoints(15);
            record.setMultiplier(java.math.BigDecimal.ONE);
            record.setLevelCoefficient(java.math.BigDecimal.ONE);
            record.setConsecutiveDays(1);
            record.setStreakBonus(0);
        }

        public CheckInRecordBuilder basePoints(int basePoints) {
            record.setBasePoints(basePoints);
            return this;
        }

        public CheckInRecordBuilder finalPoints(int finalPoints) {
            record.setFinalPoints(finalPoints);
            return this;
        }

        public CheckInRecordEntity save() {
            com.carbonpoint.common.tenant.TenantContext.setTenantId(record.getTenantId());
            checkInRecordMapper.insert(record);
            return record;
        }
    }

    // ─────────────────────────────────────────
    // PointTransaction helpers
    // ─────────────────────────────────────────

    public PointTransactionEntity transaction(Long userId, Long tenantId, int amount, String type) {
        PointTransactionEntity tx = new PointTransactionEntity();
        tx.setUserId(userId);
        tx.setTenantId(tenantId);
        tx.setAmount(amount);
        tx.setType(type);
        tx.setBalanceAfter(amount);
        tx.setFrozenAfter(0);
        tx.setReferenceId(UUID.randomUUID().toString());
        pointTransactionMapper.insert(tx);
        return tx;
    }

    // ─────────────────────────────────────────
    // Product helpers
    // ─────────────────────────────────────────

    public ProductBuilder product(Long tenantId, String name, String type, int pointsPrice, Integer stock) {
        return new ProductBuilder(tenantId, name, type, pointsPrice, stock);
    }

    public class ProductBuilder {
        private final Product product = new Product();

        private ProductBuilder(Long tenantId, String name, String type, int pointsPrice, Integer stock) {
            product.setTenantId(tenantId);
            product.setName(name);
            product.setType(type);
            product.setPointsPrice(pointsPrice);
            product.setStock(stock);
            product.setMaxPerUser(null); // null = unlimited per-user exchanges
            product.setValidityDays(30);
            product.setFulfillmentConfig("{\"codeLength\":12}");
            product.setStatus("active");
            product.setSortOrder(0);
        }

        public ProductBuilder id(Long id) {
            product.setId(id);
            return this;
        }

        public ProductBuilder inactive() {
            product.setStatus("inactive");
            return this;
        }

        public ProductBuilder maxPerUser(int maxPerUser) {
            product.setMaxPerUser(maxPerUser);
            return this;
        }

        public Product save() {
            // Ensure TenantContext is set for the TenantLineInnerInterceptor
            com.carbonpoint.common.tenant.TenantContext.setTenantId(product.getTenantId());
            productMapper.insertOrUpdate(product);
            return product;
        }
    }

    // ─────────────────────────────────────────
    // ExchangeOrder helpers
    // ─────────────────────────────────────────

    public ExchangeOrderBuilder exchangeOrder(Long tenantId, Long userId, Long productId, String productName, int pointsSpent, String status) {
        return new ExchangeOrderBuilder(tenantId, userId, productId, productName, pointsSpent, status);
    }

    public class ExchangeOrderBuilder {
        private final ExchangeOrder order = new ExchangeOrder();

        private ExchangeOrderBuilder(Long tenantId, Long userId, Long productId, String productName, int pointsSpent, String status) {
            order.setTenantId(tenantId);
            order.setUserId(userId);
            order.setProductId(productId);
            order.setProductName(productName);
            order.setProductType("coupon");
            order.setPointsSpent(pointsSpent);
            order.setOrderStatus(status);
        }

        public ExchangeOrderBuilder couponCode(String code) {
            order.setCouponCode(code);
            return this;
        }

        public ExchangeOrder save() {
            // Ensure TenantContext is set for the TenantLineInnerInterceptor
            com.carbonpoint.common.tenant.TenantContext.setTenantId(order.getTenantId());
            exchangeOrderMapper.insert(order);
            return order;
        }
    }

    // ─────────────────────────────────────────
    // PointRule helpers
    // ─────────────────────────────────────────

    public PointRuleBuilder pointRule(Long tenantId, String type, String name, String config) {
        return new PointRuleBuilder(tenantId, type, name, config);
    }

    public class PointRuleBuilder {
        private final PointRule rule = new PointRule();

        private PointRuleBuilder(Long tenantId, String type, String name, String config) {
            rule.setTenantId(tenantId);
            rule.setType(type);
            rule.setName(name);
            rule.setConfig(config);
            rule.setEnabled(true);
            rule.setSortOrder(0);
        }

        public PointRuleBuilder id(Long id) {
            rule.setId(id);
            return this;
        }

        public PointRuleBuilder sortOrder(int sortOrder) {
            rule.setSortOrder(sortOrder);
            return this;
        }

        public PointRuleBuilder disabled() {
            rule.setEnabled(false);
            return this;
        }

        public PointRule save() {
            // Ensure TenantContext is set for the TenantLineInnerInterceptor
            com.carbonpoint.common.tenant.TenantContext.setTenantId(rule.getTenantId());
            pointRuleMapper.insertOrUpdate(rule);
            return rule;
        }
    }
}
