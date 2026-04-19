package com.carbonpoint.honor.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.carbonpoint.honor.dto.UserBadgeDTO;
import com.carbonpoint.honor.entity.BadgeDefinition;
import com.carbonpoint.honor.entity.UserBadge;
import com.carbonpoint.honor.mapper.BadgeDefinitionMapper;
import com.carbonpoint.honor.mapper.UserBadgeMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 徽章服务 — 原子发放（INSERT IGNORE 方案）。
 *
 * <p>并发防重策略：依赖 user_badges.uk_user_badge (user_id, badge_id) 唯一索引。
 * INSERT IGNORE 执行后 affected_rows=1 表示新发放，affected_rows=0 表示已拥有。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BadgeService {

    private final UserBadgeMapper userBadgeMapper;
    private final BadgeDefinitionMapper badgeDefinitionMapper;

    /**
     * 原子发放徽章。
     *
     * @param userId  用户ID
     * @param badgeId 徽章ID
     * @return true = 本次新发放，false = 用户已拥有该徽章
     */
    public boolean awardBadge(Long userId, String badgeId) {
        LocalDateTime now = LocalDateTime.now();
        int affected = userBadgeMapper.insertIgnore(userId, badgeId, now);
        if (affected > 0) {
            log.info("Badge awarded: userId={}, badgeId={}", userId, badgeId);
            return true;
        } else {
            log.debug("Badge already owned: userId={}, badgeId={}", userId, badgeId);
            return false;
        }
    }

    /**
     * 检查用户是否已拥有指定徽章。
     */
    public boolean hasBadge(Long userId, String badgeId) {
        LambdaQueryWrapper<UserBadge> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserBadge::getUserId, userId)
               .eq(UserBadge::getBadgeId, badgeId);
        return userBadgeMapper.selectCount(wrapper) > 0;
    }

    /**
     * 获取用户的所有徽章（按获得时间倒序，最多返回9个用于个人主页展示）。
     */
    public List<UserBadgeDTO> getUserBadges(Long userId, int limit) {
        LambdaQueryWrapper<UserBadge> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserBadge::getUserId, userId)
               .orderByDesc(UserBadge::getEarnedAt)
               .last("LIMIT " + limit);
        List<UserBadge> userBadges = userBadgeMapper.selectList(wrapper);

        return userBadges.stream().map(ub -> {
            BadgeDefinition def = badgeDefinitionMapper.selectOne(
                    new LambdaQueryWrapper<BadgeDefinition>()
                            .eq(BadgeDefinition::getBadgeId, ub.getBadgeId())
            );
            UserBadgeDTO dto = new UserBadgeDTO();
            dto.setId(ub.getId());
            dto.setUserId(ub.getUserId());
            dto.setBadgeId(ub.getBadgeId());
            dto.setEarnedAt(ub.getEarnedAt() != null ? ub.getEarnedAt().toString() : null);
            if (def != null) {
                dto.setBadgeName(def.getName());
                dto.setDescription(def.getDescription());
                dto.setIcon(def.getIcon());
                dto.setRarity(def.getRarity());
            }
            return dto;
        }).toList();
    }

    /**
     * 获取用户所有徽章（不限制数量）。
     */
    public List<UserBadgeDTO> getAllUserBadges(Long userId) {
        return getUserBadges(userId, 999);
    }
}
