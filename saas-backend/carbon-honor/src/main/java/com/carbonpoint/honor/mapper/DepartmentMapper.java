package com.carbonpoint.honor.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.honor.entity.Department;
import org.apache.ibatis.annotations.Mapper;

/**
 * Mapper for departments table.
 */
@Mapper
public interface DepartmentMapper extends BaseMapper<Department> {
}
