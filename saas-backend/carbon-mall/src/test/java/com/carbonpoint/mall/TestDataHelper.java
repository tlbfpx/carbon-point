package com.carbonpoint.mall;

import com.carbonpoint.common.entity.PointTransactionEntity;
import com.carbonpoint.common.mapper.PointTransactionMapper;
import com.carbonpoint.common.security.AppPasswordEncoder;
import com.carbonpoint.mall.entity.ExchangeOrder;
import com.carbonpoint.mall.entity.Product;
import com.carbonpoint.mall.mapper.ExchangeOrderMapper;
import com.carbonpoint.mall.mapper.MallProductMapper;
import com.carbonpoint.points.mapper.PointsUserMapper;
import com.carbonpoint.system.entity.Permission;
import com.carbonpoint.system.entity.Role;
import com.carbonpoint.system.entity.RolePermission;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.entity.UserRole;
import com.carbonpoint.system.mapper.PermissionMapper;
import com.carbonpoint.system.mapper.RoleMapper;
import com.carbonpoint.system.mapper.RolePermissionMapper;
import com.carbonpoint.system.mapper.TenantMapper;
import com.carbonpoint.system.mapper.UserMapper;
import com.carbonpoint.system.mapper.UserRoleMapper;
import com.carbonpoint.system.entity.Tenant;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Test data factory for integration tests.
 * Provides fluent builders for creating test entities.
 */
@Component
public class TestDataHelper {

    @Autowired private UserMapper userMapper;
    @Autowired private TenantMapper tenantMapper;
    @Autowired private MallProductMapper productMapper;
    @Autowired private ExchangeOrderMapper exchangeOrderMapper;
    @Autowired private PointTransactionMapper pointTransactionMapper;
    @Autowired private AppPasswordEncoder passwordEncoder;
    @Autowired private RoleMapper roleMapper;
    @Autowired private PermissionMapper permissionMapper;
    @Autowired private RolePermissionMapper rolePermissionMapper;
    @Autowired private UserRoleMapper userRoleMapper;
    @Autowired private JdbcTemplate jdbcTemplate;

    private boolean permissionsSeeded = false;

    private synchronized void seedPermissions() {
        if (permissionsSeeded) return;
        permissionsSeeded = true;

        // Seed enterprise permissions (roles are seeded by BaseIntegrationTest.seedPermissions())
        for (String code : new String[]{
                "enterprise:product:create", "enterprise:product:edit",
                "enterprise:product:delete", "enterprise:product:toggle",
                "enterprise:product:stock", "enterprise:product:list",
                "enterprise:exchange:create", "enterprise:exchange:cancel",
                "enterprise:exchange:list", "enterprise:exchange:fulfill",
                "enterprise:exchange:redeem"}) {
            if (permissionMapper.selectById(code) == null) {
                Permission p = new Permission();
                p.setCode(code);
                p.setModule(code.split(":")[1]);
                p.setOperation(code.split(":")[2]);
                p.setSortOrder(0);
                permissionMapper.insert(p);
            }
        }
    }

    private Role getAdminRole(Long tenantId) {
        seedPermissions();
        return roleMapper.selectList(null).stream()
                .filter(r -> "企业管理员".equals(r.getName())
                        && Boolean.TRUE.equals(r.getIsPreset())
                        && tenantId.equals(r.getTenantId()))
                .findFirst()
                .orElse(null);
    }

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

        public Tenant save() {
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
        private boolean asAdmin = false;

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

        /**
         * Grant enterprise admin permissions to this user.
         */
        public UserBuilder admin() {
            this.asAdmin = true;
            return this;
        }

        public User save() {
            com.carbonpoint.common.tenant.TenantContext.setTenantId(user.getTenantId());
            // Use direct SQL to bypass all MyBatis-Plus tenant interceptors.
            // Try UPDATE first; if no rows affected, INSERT.
            int updated = jdbcTemplate.update(
                    "UPDATE users SET tenant_id=?, phone=?, password_hash=?, nickname=?, status=?, level=?, total_points=?, available_points=?, frozen_points=?, consecutive_days=? WHERE id=?",
                    user.getTenantId(), user.getPhone(), user.getPasswordHash(),
                    user.getNickname(), user.getStatus(), user.getLevel(),
                    user.getTotalPoints(), user.getAvailablePoints(), user.getFrozenPoints(),
                    user.getConsecutiveDays(), user.getId());
            if (updated == 0) {
                jdbcTemplate.update(
                        "INSERT INTO users (id, tenant_id, phone, password_hash, nickname, status, level, total_points, available_points, frozen_points, consecutive_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        user.getId(), user.getTenantId(), user.getPhone(), user.getPasswordHash(),
                        user.getNickname(), user.getStatus(), user.getLevel(),
                        user.getTotalPoints(), user.getAvailablePoints(), user.getFrozenPoints(),
                        user.getConsecutiveDays());
            }
            if (asAdmin) {
                Role adminRole = getAdminRole(user.getTenantId());
                if (adminRole != null) {
                    // Check if role already assigned to avoid duplicate key error
                    Long count = userRoleMapper.selectCount(new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<UserRole>()
                            .eq(UserRole::getUserId, user.getId())
                            .eq(UserRole::getRoleId, adminRole.getId())).longValue();
                    if (count == 0) {
                        UserRole ur = new UserRole();
                        ur.setUserId(user.getId());
                        ur.setRoleId(adminRole.getId());
                        userRoleMapper.insert(ur);
                    }
                }
            }
            return user;
        }
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
            product.setMaxPerUser(null);
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

        public ProductBuilder soldOut() {
            product.setStatus("sold_out");
            return this;
        }

        public ProductBuilder maxPerUser(int maxPerUser) {
            product.setMaxPerUser(maxPerUser);
            return this;
        }

        public Product save() {
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

        public ExchangeOrderBuilder id(Long id) {
            order.setId(id);
            return this;
        }

        public ExchangeOrderBuilder expiresAt(java.time.LocalDateTime expiresAt) {
            order.setExpiresAt(expiresAt);
            return this;
        }

        public ExchangeOrderBuilder fulfilledAt(java.time.LocalDateTime fulfilledAt) {
            order.setFulfilledAt(fulfilledAt);
            return this;
        }

        public ExchangeOrder save() {
            com.carbonpoint.common.tenant.TenantContext.setTenantId(order.getTenantId());
            exchangeOrderMapper.insert(order);
            return order;
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
}
