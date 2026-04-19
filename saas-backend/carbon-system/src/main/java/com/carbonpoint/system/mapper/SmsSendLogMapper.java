package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.system.entity.SmsSendLog;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;

@Mapper
public interface SmsSendLogMapper extends BaseMapper<SmsSendLog> {

    @Select("SELECT COUNT(*) FROM sms_send_logs WHERE user_id = #{userId} AND type = #{type} AND DATE(created_at) = CURDATE()")
    int countTodayByUserIdAndType(@Param("userId") Long userId, @Param("type") String type);

    @Select("SELECT COUNT(*) FROM sms_send_logs WHERE phone = #{phone} AND type = #{type} AND DATE(created_at) = CURDATE()")
    int countTodayByPhoneAndType(@Param("phone") String phone, @Param("type") String type);
}
