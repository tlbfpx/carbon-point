package com.carbonpoint.points;

import com.carbonpoint.common.entity.PointTransactionEntity;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.mapper.PointTransactionMapper;
import com.carbonpoint.points.dto.PointBalanceDTO;
import com.carbonpoint.points.dto.PointStatisticsDTO;
import com.carbonpoint.points.mapper.PointsUserMapper;
import com.carbonpoint.points.service.LevelService;
import com.carbonpoint.points.service.PointAccountService;
import com.carbonpoint.system.entity.Tenant;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.mapper.TenantMapper;
import com.carbonpoint.system.mapper.UserMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for PointAccountService.
 */
class PointAccountServiceTest extends BaseIntegrationTest {

    @Autowired
    private PointAccountService pointAccountService;

    @Autowired
    private PointTransactionMapper transactionMapper;

    // ─────────────────────────────────────────
    // awardPoints tests
    // ─────────────────────────────────────────

    @Test
    void awardPoints_succeeds() {
        Tenant tenant = createTestTenant("awardPoints_succeeds");
        User user = createTestUser(tenant.getId(), "13800000101", "Test@123");
        user.setTotalPoints(0);
        user.setAvailablePoints(0);
        userMapper.updateById(user);

        int newBalance = pointAccountService.awardPoints(
                user.getId(), 100, "manual_add", "admin_1", "测试发放积分"
        );

        assertEquals(100, newBalance, "Balance should be 100 after awarding 100 points");

        User updated = userMapper.selectById(user.getId());
        assertNotNull(updated, "User should be found after award");
        assertEquals(100, updated.getTotalPoints(), "Total points should be 100");
        assertEquals(100, updated.getAvailablePoints(), "Available points should be 100");
    }

    @Test
    void awardPoints_zeroAmount_returnsZero() {
        Tenant tenant = createTestTenant("awardPoints_zeroAmount_returnsZero");
        User user = createTestUser(tenant.getId(), "13800000102", "Test@123");

        int result = pointAccountService.awardPoints(user.getId(), 0, "manual_add", "ref1", "remark");
        assertEquals(0, result);
    }

    @Test
    void awardPoints_negativeAmount_returnsZero() {
        Tenant tenant = createTestTenant("awardPoints_negativeAmount_returnsZero");
        User user = createTestUser(tenant.getId(), "13800000103", "Test@123");

        int result = pointAccountService.awardPoints(user.getId(), -50, "manual_add", "ref1", "remark");
        assertEquals(0, result);
    }

    @Test
    void awardPoints_createsTransaction() {
        Tenant tenant = createTestTenant("awardPoints_createsTransaction");
        User user = createTestUser(tenant.getId(), "13800000104", "Test@123");
        user.setTotalPoints(0);
        user.setAvailablePoints(0);
        userMapper.updateById(user);

        pointAccountService.awardPoints(user.getId(), 50, "manual_add", "ref_test", "测试");

        List<PointTransactionEntity> txs = transactionMapper.selectListByUserIdAndType(user.getId(), "manual_add");
        assertFalse(txs.isEmpty(), "Should have a transaction record");
        assertEquals(50, txs.get(0).getAmount(), "Transaction amount should be 50");
        assertEquals("ref_test", txs.get(0).getReferenceId());
    }

    @Test
    void awardPoints_userNotFound_throws() {
        assertThrows(BusinessException.class, () ->
                pointAccountService.awardPoints(999999L, 100, "manual_add", "ref", "remark")
        );
    }

    @Test
    void awardPoints_multipleAwards_accumulates() {
        Tenant tenant = createTestTenant("awardPoints_multipleAwards_accumulates");
        User user = createTestUser(tenant.getId(), "13800000105", "Test@123");
        user.setTotalPoints(0);
        user.setAvailablePoints(0);
        userMapper.updateById(user);

        pointAccountService.awardPoints(user.getId(), 100, "manual_add", "r1", "first");
        pointAccountService.awardPoints(user.getId(), 50, "manual_add", "r2", "second");

        User updated = userMapper.selectById(user.getId());
        assertNotNull(updated, "User should be found after awards");
        assertEquals(150, updated.getTotalPoints(), "Total should accumulate to 150");
        assertEquals(150, updated.getAvailablePoints(), "Available should accumulate to 150");
    }

    // ─────────────────────────────────────────
    // deductPoints tests
    // ─────────────────────────────────────────

    @Test
    void deductPoints_succeeds() {
        Tenant tenant = createTestTenant("deductPoints_succeeds");
        User user = createTestUser(tenant.getId(), "13800000201", "Test@123");
        user.setTotalPoints(200);
        user.setAvailablePoints(200);
        userMapper.updateById(user);

        int newBalance = pointAccountService.deductPoints(
                user.getId(), 80, "manual_deduct", "ref_deduct", "测试扣减", 1L
        );

        assertEquals(120, newBalance, "Balance should be 120 after deducting 80");

        User updated = userMapper.selectById(user.getId());
        assertNotNull(updated, "User should be found after deduction");
        assertEquals(120, updated.getTotalPoints());
        assertEquals(120, updated.getAvailablePoints());
    }

    @Test
    void deductPoints_createsTransaction() {
        Tenant tenant = createTestTenant("deductPoints_createsTransaction");
        User user = createTestUser(tenant.getId(), "13800000202", "Test@123");
        user.setTotalPoints(100);
        user.setAvailablePoints(100);
        userMapper.updateById(user);

        pointAccountService.deductPoints(user.getId(), 30, "manual_deduct", "ref_d", "测试", 1L);

        List<PointTransactionEntity> txs = transactionMapper.selectListByUserIdAndType(user.getId(), "manual_deduct");
        assertFalse(txs.isEmpty());
        assertEquals(-30, txs.get(0).getAmount());
    }

    @Test
    void deductPoints_insufficient_throws() {
        Tenant tenant = createTestTenant("deductPoints_insufficient_throws");
        User user = createTestUser(tenant.getId(), "13800000203", "Test@123");
        user.setTotalPoints(50);
        user.setAvailablePoints(50);
        userMapper.updateById(user);

        BusinessException ex = assertThrows(BusinessException.class, () ->
                pointAccountService.deductPoints(user.getId(), 100, "manual_deduct", "ref", "remark", 1L)
        );
        assertEquals("POINT001", ex.getCode());
    }

    @Test
    void deductPoints_userNotFound_throws() {
        assertThrows(BusinessException.class, () ->
                pointAccountService.deductPoints(999999L, 100, "manual_deduct", "ref", "remark", 1L)
        );
    }

    @Test
    void deductPoints_zeroAmount_throws() {
        Tenant tenant = createTestTenant("deductPoints_zeroAmount_throws");
        User user = createTestUser(tenant.getId(), "13800000204", "Test@123");
        user.setTotalPoints(100);
        user.setAvailablePoints(100);
        userMapper.updateById(user);

        BusinessException ex = assertThrows(BusinessException.class, () ->
                pointAccountService.deductPoints(user.getId(), 0, "manual_deduct", "ref", "remark", 1L)
        );
        assertEquals("SYSTEM002", ex.getCode());
    }

    // ─────────────────────────────────────────
    // freezePoints / unfreezePoints tests
    // ─────────────────────────────────────────

    @Test
    void freezePoints_succeeds() {
        Tenant tenant = createTestTenant("freezePoints_succeeds");
        User user = createTestUser(tenant.getId(), "13800000301", "Test@123");
        user.setTotalPoints(500);
        user.setAvailablePoints(500);
        user.setFrozenPoints(0);
        userMapper.updateById(user);

        int newBalance = pointAccountService.freezePoints(user.getId(), 200, "exchange", "order_1", "兑换商品");

        assertEquals(300, newBalance, "Available should be 300 after freezing 200");

        User updated = userMapper.selectById(user.getId());
        assertNotNull(updated, "User should be found after freeze");
        assertEquals(300, updated.getAvailablePoints());
        assertEquals(200, updated.getFrozenPoints());
    }

    @Test
    void freezePoints_insufficient_throws() {
        Tenant tenant = createTestTenant("freezePoints_insufficient_throws");
        User user = createTestUser(tenant.getId(), "13800000302", "Test@123");
        user.setTotalPoints(50);
        user.setAvailablePoints(50);
        user.setFrozenPoints(0);
        userMapper.updateById(user);

        BusinessException ex = assertThrows(BusinessException.class, () ->
                pointAccountService.freezePoints(user.getId(), 100, "exchange", "order_1", "兑换")
        );
        assertEquals("POINT001", ex.getCode());
    }

    @Test
    void unfreezePoints_succeeds() {
        Tenant tenant = createTestTenant("unfreezePoints_succeeds");
        User user = createTestUser(tenant.getId(), "13800000401", "Test@123");
        user.setTotalPoints(300);
        user.setAvailablePoints(100);
        user.setFrozenPoints(200);
        userMapper.updateById(user);

        int newBalance = pointAccountService.unfreezePoints(user.getId(), 150, "order_cancel", "订单取消解冻");

        assertEquals(250, newBalance, "Available should be 250 after unfreezing 150");

        User updated = userMapper.selectById(user.getId());
        assertNotNull(updated, "User should be found after unfreeze");
        assertEquals(250, updated.getAvailablePoints());
        assertEquals(50, updated.getFrozenPoints());
    }

    // ─────────────────────────────────────────
    // getBalance tests
    // ─────────────────────────────────────────

    @Test
    void getBalance_returnsCorrectData() {
        Tenant tenant = createTestTenant("getBalance_returnsCorrectData");
        User user = createTestUser(tenant.getId(), "13800000501", "Test@123");
        user.setTotalPoints(3000);
        user.setAvailablePoints(2800);
        user.setFrozenPoints(200);
        user.setLevel(2);
        userMapper.updateById(user);

        PointBalanceDTO balance = pointAccountService.getBalance(user.getId());

        assertEquals(user.getId(), balance.getUserId());
        assertEquals(3000, balance.getTotalPoints());
        assertEquals(2800, balance.getAvailablePoints());
        assertEquals(200, balance.getFrozenPoints());
        assertEquals(2, balance.getLevel());
    }

    @Test
    void getBalance_userNotFound_throws() {
        assertThrows(BusinessException.class, () ->
                pointAccountService.getBalance(999999L)
        );
    }

    // ─────────────────────────────────────────
    // getStatistics tests
    // ─────────────────────────────────────────

    @Test
    void getStatistics_returnsCorrectData() {
        Tenant tenant = createTestTenant("getStatistics_returnsCorrectData");
        User user = createTestUser(tenant.getId(), "13800000601", "Test@123");
        user.setTotalPoints(3000);
        user.setAvailablePoints(2800);
        user.setFrozenPoints(200);
        user.setLevel(2);
        user.setConsecutiveDays(5);
        userMapper.updateById(user);

        PointStatisticsDTO stats = pointAccountService.getStatistics(user.getId());

        assertEquals(user.getId(), stats.getUserId());
        assertEquals(3000, stats.getTotalPoints());
        assertEquals(2800, stats.getAvailablePoints());
        assertEquals(2, stats.getLevel());
        assertEquals(5, stats.getConsecutiveDays());
    }

    // ─────────────────────────────────────────
    // getTransactionList tests
    // ─────────────────────────────────────────

    @Test
    void getTransactionList_returnsUserTransactions() {
        Tenant tenant = createTestTenant("getTransactionList_returnsUserTransactions");
        User user = createTestUser(tenant.getId(), "13800000701", "Test@123");
        user.setTotalPoints(300);
        user.setAvailablePoints(300);
        userMapper.updateById(user);

        // Award some points first
        pointAccountService.awardPoints(user.getId(), 100, "manual_add", "ref1", "first");
        pointAccountService.awardPoints(user.getId(), 200, "manual_add", "ref2", "second");

        // Ensure tenant context is set before querying
        setTenantContext(tenant.getId());

        var page = pointAccountService.getTransactionList(user.getId(), 1, 20);

        assertNotNull(page);
        assertEquals(2, page.getTotal());
        assertTrue(page.getRecords().stream().anyMatch(tx -> tx.getAmount() == 100));
        assertTrue(page.getRecords().stream().anyMatch(tx -> tx.getAmount() == 200));
    }
}
