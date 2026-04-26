package com.carbonpoint.quiz.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.quiz.entity.QuizDailyRecord;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDate;

@Mapper
public interface QuizDailyRecordMapper extends BaseMapper<QuizDailyRecord> {

    /**
     * Count how many questions a user has answered today.
     */
    @Select("SELECT COUNT(*) FROM quiz_daily_records WHERE tenant_id = #{tenantId} AND user_id = #{userId} AND answer_date = #{date}")
    int countTodayAnswered(@Param("tenantId") Long tenantId, @Param("userId") Long userId, @Param("date") LocalDate date);
}
