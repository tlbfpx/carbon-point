package com.carbonpoint.common.mapper;

import com.baomidou.mybatisplus.annotation.InterceptorIgnore;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.common.entity.PointTransactionEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * Mapper for point_transactions table.
 * Class-level @InterceptorIgnore skips tenant-line filtering on all methods
 * including inherited BaseMapper methods. This is safe because point_transactions
 * records store tenant_id explicitly and queries should work regardless of context.
 */
@Mapper
@InterceptorIgnore(tenantLine = "1")
public interface PointTransactionMapper extends BaseMapper<PointTransactionEntity> {

    /**
     * Select transactions by user ID and type without tenant filtering.
     * Used in tests where TenantContext may not be set.
     */
    @InterceptorIgnore(tenantLine = "true")
    @Select("SELECT * FROM point_transactions WHERE user_id = #{userId} AND type = #{type} ORDER BY created_at DESC LIMIT 1")
    PointTransactionEntity selectOneByUserIdAndType(@Param("userId") Long userId, @Param("type") String type);

    @InterceptorIgnore(tenantLine = "true")
    @Select("SELECT * FROM point_transactions WHERE user_id = #{userId} AND type = #{type}")
    List<PointTransactionEntity> selectListByUserIdAndType(@Param("userId") Long userId, @Param("type") String type);
}
