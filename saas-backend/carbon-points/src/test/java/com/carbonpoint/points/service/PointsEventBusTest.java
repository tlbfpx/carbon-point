package com.carbonpoint.points.service;

import com.carbonpoint.common.entity.PointTransactionEntity;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.mapper.PointTransactionMapper;
import com.carbonpoint.points.BaseIntegrationTest;
import com.carbonpoint.points.dto.PointsEvent;
import com.carbonpoint.points.service.PointsEventBus;
import com.carbonpoint.system.entity.Tenant;
import com.carbonpoint.system.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for PointsEventBus / PointsEventHandler / awardPointsFromEvent.
 */
class PointsEventBusTest extends BaseIntegrationTest {

    @Autowired
    private PointsEventBus pointsEventBus;

    @Autowired
    private PointTransactionMapper transactionMapper;

    @Test
    void publish_awardsPoints_andCreatesTransactionWithProductCode() {
        Tenant tenant = createTestTenant("eventBus_awards");
        User user = createTestUser(tenant.getId(), "13800900101", "Test@123");
        user.setTotalPoints(0);
        user.setAvailablePoints(0);
        userMapper.updateById(user);

        PointsEvent event = new PointsEvent(
                tenant.getId(),
                user.getId(),
                "stair_climbing",
                "check_in",
                50,
                "checkin_record_123",
                "打卡奖励积分"
        );

        pointsEventBus.publish(event);

        // Verify user points updated
        User updated = userMapper.selectById(user.getId());
        assertNotNull(updated);
        assertEquals(50, updated.getTotalPoints());
        assertEquals(50, updated.getAvailablePoints());

        // Verify transaction created with productCode and sourceType
        List<PointTransactionEntity> txs = transactionMapper.selectListByUserIdAndType(user.getId(), "check_in");
        assertFalse(txs.isEmpty(), "Should have a transaction record");
        PointTransactionEntity tx = txs.get(0);
        assertEquals(50, tx.getAmount());
        assertEquals("stair_climbing", tx.getProductCode());
        assertEquals("check_in", tx.getSourceType());
        assertEquals("checkin_record_123", tx.getReferenceId());
        assertEquals("打卡奖励积分", tx.getRemark());
    }

    @Test
    void publish_withZeroPoints_isIgnored() {
        Tenant tenant = createTestTenant("eventBus_zero");
        User user = createTestUser(tenant.getId(), "13800900201", "Test@123");
        user.setTotalPoints(100);
        user.setAvailablePoints(100);
        userMapper.updateById(user);

        PointsEvent event = new PointsEvent(
                tenant.getId(),
                user.getId(),
                "stair_climbing",
                "check_in",
                0,
                "biz_123",
                "零积分事件"
        );

        pointsEventBus.publish(event);

        // Verify user points unchanged
        User updated = userMapper.selectById(user.getId());
        assertNotNull(updated);
        assertEquals(100, updated.getTotalPoints(), "Points should not change for zero-point event");
        assertEquals(100, updated.getAvailablePoints());

        // Verify no transaction created
        List<PointTransactionEntity> txs = transactionMapper.selectListByUserIdAndType(user.getId(), "check_in");
        assertTrue(txs.isEmpty(), "No transaction should be created for zero-point event");
    }

    @Test
    void publish_forNonExistentUser_throwsBusinessException() {
        PointsEvent event = new PointsEvent(
                999L,
                999999L,
                "stair_climbing",
                "check_in",
                50,
                "biz_456",
                "不存在的用户"
        );

        BusinessException ex = assertThrows(BusinessException.class, () ->
                pointsEventBus.publish(event)
        );
        assertEquals("USER021", ex.getCode(), "Should throw USER_NOT_FOUND error");
    }

    @Test
    void publish_multipleEvents_accumulatePoints() {
        Tenant tenant = createTestTenant("eventBus_multi");
        User user = createTestUser(tenant.getId(), "13800900301", "Test@123");
        user.setTotalPoints(0);
        user.setAvailablePoints(0);
        userMapper.updateById(user);

        PointsEvent event1 = new PointsEvent(
                tenant.getId(), user.getId(), "stair_climbing", "check_in", 30, "r1", "第一次打卡");
        PointsEvent event2 = new PointsEvent(
                tenant.getId(), user.getId(), "walking", "step_claim", 20, "r2", "步数领取");

        pointsEventBus.publish(event1);
        pointsEventBus.publish(event2);

        User updated = userMapper.selectById(user.getId());
        assertNotNull(updated);
        assertEquals(50, updated.getTotalPoints());
        assertEquals(50, updated.getAvailablePoints());
    }

    @Test
    void publish_eventTriggersLevelPromotion() {
        Tenant tenant = createTestTenant("eventBus_level");
        User user = createTestUser(tenant.getId(), "13800900401", "Test@123");
        user.setTotalPoints(900);
        user.setAvailablePoints(900);
        user.setLevel(1);
        userMapper.updateById(user);

        PointsEvent event = new PointsEvent(
                tenant.getId(), user.getId(), "stair_climbing", "check_in", 200, "r_level", "升级奖励");

        pointsEventBus.publish(event);

        User updated = userMapper.selectById(user.getId());
        assertNotNull(updated);
        assertEquals(1100, updated.getTotalPoints());
        // Level should be promoted from 1 to 2 (Silver at 1000+)
        assertEquals(2, updated.getLevel(), "User should be promoted to Lv.2 Silver");
    }

    @Test
    void publish_multiProductEvents_createIndependentTransactions() {
        Tenant tenant = createTestTenant("eventBus_multiProd");
        User user = createTestUser(tenant.getId(), "13800900501", "Test@123");
        user.setTotalPoints(0);
        user.setAvailablePoints(0);
        userMapper.updateById(user);

        // Stair climbing event
        PointsEvent stairEvent = new PointsEvent(
                tenant.getId(), user.getId(), "stair_climbing", "check_in", 30, "stair_001", "爬楼打卡");
        // Walking event
        PointsEvent walkingEvent = new PointsEvent(
                tenant.getId(), user.getId(), "walking", "step_claim", 50, "walk_001", "步数领取");

        pointsEventBus.publish(stairEvent);
        pointsEventBus.publish(walkingEvent);

        User updated = userMapper.selectById(user.getId());
        assertNotNull(updated);
        assertEquals(80, updated.getTotalPoints(), "Total should be 30 + 50 = 80");
        assertEquals(80, updated.getAvailablePoints());

        // Verify separate transactions with correct product codes
        List<PointTransactionEntity> txs = transactionMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<PointTransactionEntity>()
                        .eq(PointTransactionEntity::getUserId, user.getId())
                        .orderByAsc(PointTransactionEntity::getCreatedAt));

        assertEquals(2, txs.size(), "Should have 2 transactions");

        PointTransactionEntity stairTx = txs.get(0);
        assertEquals(30, stairTx.getAmount());
        assertEquals("stair_climbing", stairTx.getProductCode());
        assertEquals("check_in", stairTx.getSourceType());

        PointTransactionEntity walkingTx = txs.get(1);
        assertEquals(50, walkingTx.getAmount());
        assertEquals("walking", walkingTx.getProductCode());
        assertEquals("step_claim", walkingTx.getSourceType());
    }

    @Test
    void publish_negativePoints_deductsBalance() {
        Tenant tenant = createTestTenant("eventBus_deduct");
        User user = createTestUser(tenant.getId(), "13800900601", "Test@123");
        user.setTotalPoints(100);
        user.setAvailablePoints(100);
        userMapper.updateById(user);

        PointsEvent deductEvent = new PointsEvent(
                tenant.getId(), user.getId(), "stair_climbing", "exchange", -40, "order_001", "兑换商品");

        pointsEventBus.publish(deductEvent);

        User updated = userMapper.selectById(user.getId());
        assertNotNull(updated);
        assertEquals(60, updated.getAvailablePoints(), "Should deduct 40 points");
    }
}
