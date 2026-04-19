package com.carbonpoint.points.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.common.entity.PointTransactionEntity;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.points.LevelConstants;
import com.carbonpoint.points.dto.*;
import com.carbonpoint.common.mapper.PointTransactionMapper;
import com.carbonpoint.points.mapper.PointsUserMapper;
import com.carbonpoint.system.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

/**
 * Point account service.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PointAccountService {

    private final PointTransactionMapper transactionMapper;
    private final PointsUserMapper userMapper;
    private final LevelService levelService;

    private static final DateTimeFormatter MONTH_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM");
    private static final int MAX_PAGE_SIZE = 100;

    private UserPointInfo userToUserPointInfo(User user) {
        UserPointInfo info = new UserPointInfo();
        info.setId(user.getId());
        info.setTenantId(user.getTenantId());
        info.setNickname(user.getNickname());
        info.setLevel(user.getLevel());
        info.setTotalPoints(user.getTotalPoints());
        info.setAvailablePoints(user.getAvailablePoints());
        info.setFrozenPoints(user.getFrozenPoints());
        info.setConsecutiveDays(user.getConsecutiveDays());
        info.setLastCheckinDate(user.getLastCheckinDate());
        return info;
    }

    /**
     * Award points from a PointsEvent, recording productCode and sourceType on the transaction.
     * This is the event-driven entry point used by PointsEventBus / PointsEventHandler.
     */
    @Transactional
    public int awardPointsFromEvent(PointsEvent event) {
        if (event.points() <= 0) return 0;

        Long userId = event.userId();
        User user = userMapper.selectById(userId);
        if (user == null) throw new BusinessException(ErrorCode.USER_NOT_FOUND);

        Long tenantId = user.getTenantId();

        // Atomic update with optimistic locking via SQL
        int updated = userMapper.updatePointsAtomic(userId, event.points(), 0);
        if (updated == 0) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "积分发放失败，请重试");
        }

        // Re-query user to get authoritative post-update values
        user = userMapper.selectById(userId);
        int availablePoints = user.getAvailablePoints();
        int frozenPoints = user.getFrozenPoints();
        int totalPoints = user.getTotalPoints();

        // Record transaction with productCode and sourceType
        PointTransactionEntity tx = new PointTransactionEntity();
        tx.setUserId(userId);
        tx.setTenantId(tenantId);
        tx.setAmount(event.points());
        tx.setType(event.sourceType());
        tx.setReferenceId(event.bizId());
        tx.setProductCode(event.productCode());
        tx.setSourceType(event.sourceType());
        tx.setBalanceAfter(availablePoints);
        tx.setFrozenAfter(frozenPoints);
        tx.setRemark(event.remark());
        transactionMapper.insert(tx);

        // Auto update level
        updateLevel(userId, totalPoints);

        log.info("Awarded {} points to user {} via event (product={}, source={}), new balance: {}",
                event.points(), userId, event.productCode(), event.sourceType(), availablePoints);
        return availablePoints;
    }

    /**
     * Atomically award points to a user.
     * Updates total_points and available_points on the user record.
     */
    @Transactional
    public int awardPoints(Long userId, Integer amount, String type, String referenceId, String remark) {
        if (amount == null || amount <= 0) return 0;

        User user = userMapper.selectById(userId);
        if (user == null) throw new BusinessException(ErrorCode.USER_NOT_FOUND);

        Long tenantId = user.getTenantId();

        // Atomic update with optimistic locking via SQL
        int updated = userMapper.updatePointsAtomic(userId, amount, 0);
        if (updated == 0) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "积分发放失败，请重试");
        }

        // Re-query user to get authoritative post-update values
        user = userMapper.selectById(userId);
        int availablePoints = user.getAvailablePoints();
        int frozenPoints = user.getFrozenPoints();
        int totalPoints = user.getTotalPoints();

        // Record transaction
        PointTransactionEntity tx = new PointTransactionEntity();
        tx.setUserId(userId);
        tx.setTenantId(tenantId);
        tx.setAmount(amount);
        tx.setType(type);
        tx.setReferenceId(referenceId);
        tx.setBalanceAfter(availablePoints);
        tx.setFrozenAfter(frozenPoints);
        tx.setRemark(remark);
        transactionMapper.insert(tx);

        // Auto update level
        updateLevel(userId, totalPoints);

        log.info("Awarded {} points to user {}, new balance: {}", amount, userId, availablePoints);
        return availablePoints;
    }

    /**
     * Atomically deduct points from a user.
     * Validates sufficient available balance.
     */
    @Transactional
    public int deductPoints(Long userId, Integer amount, String type, String referenceId,
                            String remark, Long operatedBy) {
        if (amount == null || amount <= 0) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "扣减积分必须为正数");
        }

        User user = userMapper.selectById(userId);
        if (user == null) throw new BusinessException(ErrorCode.USER_NOT_FOUND);

        int availablePoints = user.getAvailablePoints();
        if (availablePoints < amount) {
            throw new BusinessException(ErrorCode.POINT_INSUFFICIENT);
        }

        Long tenantId = user.getTenantId();

        int updated = userMapper.updatePointsAtomic(userId, -amount, 0);
        if (updated == 0) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "积分扣减失败，请重试");
        }

        // Re-query user to get authoritative post-update values
        user = userMapper.selectById(userId);
        availablePoints = user.getAvailablePoints();
        int frozenPoints = user.getFrozenPoints();

        PointTransactionEntity tx = new PointTransactionEntity();
        tx.setUserId(userId);
        tx.setTenantId(tenantId);
        tx.setAmount(-amount);
        tx.setType(type);
        tx.setReferenceId(referenceId);
        tx.setBalanceAfter(availablePoints);
        tx.setFrozenAfter(frozenPoints);
        tx.setRemark(remark);
        transactionMapper.insert(tx);

        log.info("Deducted {} points from user {}, new balance: {}", amount, userId, availablePoints);
        return availablePoints;
    }

    /**
     * 积分扣减使用乐观锁（重试最多3次）。
     * 适用于积分兑换等高并发场景。
     */
    public boolean deductPoints(Long userId, Integer amount) {
        for (int i = 0; i < 3; i++) {
            User user = userMapper.selectById(userId);
            if (user == null) {
                throw new BusinessException(ErrorCode.USER_NOT_FOUND);
            }
            int availablePoints = user.getAvailablePoints();
            if (availablePoints < amount) {
                throw new BusinessException(ErrorCode.POINT_INSUFFICIENT);
            }
            Long version = user.getVersion();
            // 乐观锁更新：WHERE user_id = ? AND version = ?
            int updated = userMapper.updatePointsWithVersion(userId, -amount, version);
            if (updated > 0) {
                return true;
            }
            // 版本冲突，重试 — 指数退避
            log.warn("Point deduct conflict for user {}, retry {}", userId, i + 1);
            try {
                Thread.sleep((long) Math.pow(50, i + 1)); // 50ms, 2500ms for retries
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        throw new BusinessException(ErrorCode.SYSTEM_ERROR, "积分扣减失败，请稍后重试");
    }

    /**
     * Freeze points for exchange (atomic).
     */
    @Transactional
    public int freezePoints(Long userId, Integer amount, String type, String referenceId, String remark) {
        if (amount == null || amount <= 0) return 0;

        User user = userMapper.selectById(userId);
        if (user == null) throw new BusinessException(ErrorCode.USER_NOT_FOUND);

        int availablePoints = user.getAvailablePoints();
        if (availablePoints < amount) {
            throw new BusinessException(ErrorCode.POINT_INSUFFICIENT);
        }

        Long tenantId = user.getTenantId();
        int updated = userMapper.updatePointsAtomic(userId, -amount, amount);
        if (updated == 0) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "积分冻结失败");
        }

        // Re-query user to get authoritative post-update values
        user = userMapper.selectById(userId);
        availablePoints = user.getAvailablePoints();
        int frozenPoints = user.getFrozenPoints();

        PointTransactionEntity tx = new PointTransactionEntity();
        tx.setUserId(userId);
        tx.setTenantId(tenantId);
        tx.setAmount(-amount);
        tx.setType("frozen");
        tx.setReferenceId(referenceId);
        tx.setBalanceAfter(availablePoints);
        tx.setFrozenAfter(frozenPoints);
        tx.setRemark(remark);
        transactionMapper.insert(tx);

        return availablePoints;
    }

    /**
     * Unfreeze points (e.g., when order is cancelled or expired).
     */
    @Transactional
    public int unfreezePoints(Long userId, Integer amount, String referenceId, String remark) {
        if (amount == null || amount <= 0) return 0;

        User user = userMapper.selectById(userId);
        if (user == null) throw new BusinessException(ErrorCode.USER_NOT_FOUND);

        Long tenantId = user.getTenantId();
        int updated = userMapper.updatePointsAtomic(userId, amount, -amount);
        if (updated == 0) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "积分解冻失败");
        }

        // Re-query user to get authoritative post-update values
        user = userMapper.selectById(userId);
        int availablePoints = user.getAvailablePoints();
        int frozenPoints = user.getFrozenPoints();

        PointTransactionEntity tx = new PointTransactionEntity();
        tx.setUserId(userId);
        tx.setTenantId(tenantId);
        tx.setAmount(amount);
        tx.setType("unfrozen");
        tx.setReferenceId(referenceId);
        tx.setBalanceAfter(availablePoints);
        tx.setFrozenAfter(frozenPoints);
        tx.setRemark(remark != null ? remark : "积分解冻");
        transactionMapper.insert(tx);

        return availablePoints;
    }

    /**
     * Confirm and permanently consume frozen points (e.g., when exchange order is fulfilled).
     * Simply reduces the frozen balance without returning points to available.
     */
    @Transactional
    public int confirmFrozenPoints(Long userId, Integer amount, String referenceId) {
        if (amount == null || amount <= 0) return 0;

        User user = userMapper.selectById(userId);
        if (user == null) throw new BusinessException(ErrorCode.USER_NOT_FOUND);

        // delta=0: no change to available; frozenDelta=-amount: reduce frozen
        int updated = userMapper.updatePointsAtomic(userId, 0, -amount);
        if (updated == 0) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "积分确认消费失败");
        }

        // Re-query user to get authoritative post-update values
        user = userMapper.selectById(userId);
        int availablePoints = user.getAvailablePoints();
        int frozenPoints = user.getFrozenPoints();

        PointTransactionEntity tx = new PointTransactionEntity();
        tx.setUserId(userId);
        tx.setTenantId(user.getTenantId());
        tx.setAmount(0);
        tx.setType("frozen_confirmed");
        tx.setReferenceId(referenceId);
        tx.setBalanceAfter(availablePoints);
        tx.setFrozenAfter(frozenPoints);
        tx.setRemark("兑换商品，积分已消费");
        transactionMapper.insert(tx);

        return frozenPoints;
    }

    public PointBalanceDTO getBalance(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        return new PointBalanceDTO(
                userId,
                user.getTotalPoints(),
                user.getAvailablePoints(),
                user.getFrozenPoints(),
                user.getLevel(),
                LevelConstants.getName(user.getLevel())
        );
    }

    /**
     * Get user point info (for internal use).
     */
    public UserPointInfo getUserPoints(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        return userToUserPointInfo(user);
    }

    public PointStatisticsDTO getStatistics(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) throw new BusinessException(ErrorCode.USER_NOT_FOUND);

        // Calculate this month points
        String currentMonth = LocalDate.now().format(MONTH_FORMATTER);
        LambdaQueryWrapper<PointTransactionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PointTransactionEntity::getUserId, userId)
                .likeRight(PointTransactionEntity::getCreatedAt, currentMonth)
                .apply("amount > 0");

        List<PointTransactionEntity> txs = transactionMapper.selectList(wrapper);
        int thisMonthPoints = txs.stream().mapToInt(PointTransactionEntity::getAmount).sum();

        // Calculate rank within tenant (by total_points DESC)
        Long tenantId = user.getTenantId();
        int totalPoints = user.getTotalPoints();
        int rank = userMapper.countHigherRank(tenantId, totalPoints) + 1;
        Integer level = user.getLevel();
        Integer consecutiveDays = user.getConsecutiveDays();

        PointStatisticsDTO dto = new PointStatisticsDTO();
        dto.setUserId(userId);
        dto.setTotalPoints(totalPoints);
        dto.setAvailablePoints(user.getAvailablePoints());
        dto.setFrozenPoints(user.getFrozenPoints());
        dto.setLevel(level);
        dto.setLevelName(LevelConstants.getName(level));
        dto.setThisMonthPoints(thisMonthPoints);
        dto.setRank(rank);
        dto.setConsecutiveDays(consecutiveDays);
        return dto;
    }

    public Page<PointTransactionDTO> getTransactionList(Long userId, int page, int size) {
        return getTransactionList(userId, null, page, size);
    }

    public Page<PointTransactionDTO> getTransactionList(Long userId, String productCode, int page, int size) {
        int effectiveSize = Math.min(size, MAX_PAGE_SIZE);
        LambdaQueryWrapper<PointTransactionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PointTransactionEntity::getUserId, userId)
                .eq(productCode != null && !productCode.isBlank(), PointTransactionEntity::getProductCode, productCode)
                .orderByDesc(PointTransactionEntity::getCreatedAt);

        // Use selectList + manual pagination to avoid TenantLineInnerInterceptor
        // bug where selectPage count query returns 0 due to duplicate tenant_id filter.
        List<PointTransactionEntity> all = transactionMapper.selectList(wrapper);
        Page<PointTransactionDTO> dtoPage = new Page<>(page, effectiveSize, all.size());
        int start = (int) ((page - 1) * effectiveSize);
        int end = Math.min(start + effectiveSize, all.size());
        if (start < all.size()) {
            dtoPage.setRecords(all.subList(start, end).stream().map(tx -> {
                PointTransactionDTO d = new PointTransactionDTO();
                d.setId(tx.getId());
                d.setAmount(tx.getAmount());
                d.setType(tx.getType());
                d.setReferenceId(tx.getReferenceId());
                d.setBalanceAfter(tx.getBalanceAfter());
                d.setRemark(tx.getRemark());
                d.setProductCode(tx.getProductCode());
                d.setSourceType(tx.getSourceType());
                d.setCreatedAt(tx.getCreatedAt());
                return d;
            }).toList());
        } else {
            dtoPage.setRecords(List.of());
        }
        return dtoPage;
    }

    /**
     * Update user level based on total_points.
     * Delegates to {@link LevelService#promoteIfNeeded(Long, int)}.
     */
    @Transactional
    public void updateLevel(Long userId, int totalPoints) {
        levelService.promoteIfNeeded(userId, totalPoints);
    }
}
