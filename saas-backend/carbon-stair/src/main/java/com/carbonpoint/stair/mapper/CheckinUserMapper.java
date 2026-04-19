package com.carbonpoint.stair.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.system.entity.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface CheckinUserMapper extends BaseMapper<User> {

    int updatePointsAtomic(@Param("userId") Long userId,
                           @Param("delta") int delta,
                           @Param("frozenDelta") int frozenDelta);

    @Update("UPDATE users SET consecutive_days = #{consecutiveDays}, last_checkin_date = #{lastCheckinDate} WHERE id = #{userId}")
    int updateConsecutiveInfo(@Param("userId") Long userId,
                               @Param("consecutiveDays") int consecutiveDays,
                               @Param("lastCheckinDate") java.time.LocalDate date);
}
