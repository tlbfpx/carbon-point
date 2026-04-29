package com.carbonpoint.mall.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.mall.entity.VirtualGoods;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

/**
 * Mapper for virtual goods.
 */
@Mapper
public interface VirtualGoodsMapper extends BaseMapper<VirtualGoods> {

    /**
     * Atomically deduct 1 from product stock with version check and stock positivity check.
     * This SQL directly checks version and stock > 0 in the WHERE clause.
     * Returns 1 if successful, 0 if version mismatch or stock already 0.
     */
    @Update("UPDATE products SET stock = stock - 1, version = version + 1 " +
            "WHERE id = #{id} AND version = #{version} AND stock > 0")
    int deductStockWithVersion(@Param("id") Long id, @Param("version") Integer version);

    /**
     * Atomically restore 1 to product stock with version check.
     * Used when an order is cancelled or expired to roll back stock.
     * Returns 1 if successful, 0 if version mismatch.
     */
    @Update("UPDATE products SET stock = stock + 1, version = version + 1 " +
            "WHERE id = #{id} AND version = #{version} AND status != 'inactive'")
    int restoreStockWithVersion(@Param("id") Long id, @Param("version") Integer version);
}
