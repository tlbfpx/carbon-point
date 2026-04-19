package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.system.entity.EmailSendLog;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface EmailSendLogMapper extends BaseMapper<EmailSendLog> {

    @Select("SELECT COUNT(*) FROM email_send_logs WHERE user_id = #{userId} AND type = #{type} AND DATE(created_at) = CURDATE()")
    int countTodayByUserIdAndType(@Param("userId") Long userId, @Param("type") String type);

    @Select("SELECT COUNT(*) FROM email_send_logs WHERE email = #{email} AND type = #{type} AND DATE(created_at) = CURDATE()")
    int countTodayByEmailAndType(@Param("email") String email, @Param("type") String type);
}
