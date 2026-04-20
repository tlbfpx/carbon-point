package com.carbonpoint.points.mapper;

import com.carbonpoint.points.entity.PointExtensionRecord;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface PointExtensionRecordMapper extends com.baomidou.mybatisplus.core.mapper.BaseMapper<PointExtensionRecord> {

    @Select("SELECT * FROM point_extension_records WHERE user_id = #{userId}")
    PointExtensionRecord selectByUserId(@Param("userId") Long userId);
}
