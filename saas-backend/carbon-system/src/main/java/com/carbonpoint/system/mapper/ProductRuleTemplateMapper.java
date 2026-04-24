package com.carbonpoint.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.common.tenant.InterceptorIgnore;
import com.carbonpoint.system.entity.ProductRuleTemplateEntity;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
@InterceptorIgnore
public interface ProductRuleTemplateMapper extends BaseMapper<ProductRuleTemplateEntity> {

    @Select("SELECT * FROM product_rule_templates WHERE product_id = #{productId} ORDER BY sort_order ASC")
    List<ProductRuleTemplateEntity> selectByProductId(@Param("productId") String productId);

    @Select("SELECT * FROM product_rule_templates WHERE product_id = #{productId} AND rule_type = #{ruleType} ORDER BY sort_order ASC")
    List<ProductRuleTemplateEntity> selectByProductIdAndRuleType(@Param("productId") String productId,
                                                                  @Param("ruleType") String ruleType);

    @Delete("DELETE FROM product_rule_templates WHERE product_id = #{productId}")
    int deleteByProductId(@Param("productId") String productId);
}
