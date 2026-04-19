package com.carbonpoint.honor.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.honor.entity.UserBadge;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/**
 * Mapper for user_badges table.
 */
@Mapper
public interface UserBadgeMapper extends BaseMapper<UserBadge> {

    /**
     * INSERT IGNORE — 重复插入时返回 0（affected rows）。
     * 用于徽章原子发放，防止并发重复发放。
     */
    int insertIgnore(@Param("userId") Long userId,
                     @Param("badgeId") String badgeId,
                     @Param("earnedAt") java.time.LocalDateTime earnedAt);
}
