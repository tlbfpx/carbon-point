package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.system.entity.NotificationTemplate;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface NotificationTemplateMapper extends BaseMapper<NotificationTemplate> {

    @Select("SELECT * FROM notification_templates WHERE type = #{type} AND channel = #{channel} AND is_preset = 1 LIMIT 1")
    NotificationTemplate findByTypeAndChannel(@Param("type") String type, @Param("channel") String channel);
}
