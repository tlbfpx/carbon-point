package com.carbonpoint.points.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/**
 * Cross-module query mapper for check_in_records.
 * Uses @Select to avoid circular dependency with carbon-checkin module.
 */
@Mapper
public interface CheckInRecordQueryMapper {

    /**
     * Query total final_points for a user on a specific date.
     *
     * @param userId the user ID
     * @param date   the check-in date (yyyy-MM-dd)
     * @return total final_points awarded today, or 0 if none
     */
    @Select("SELECT COALESCE(SUM(final_points), 0) FROM check_in_records " +
            "WHERE user_id = #{userId} AND checkin_date = #{date}")
    int sumFinalPointsToday(@Param("userId") Long userId, @Param("date") String date);
}
