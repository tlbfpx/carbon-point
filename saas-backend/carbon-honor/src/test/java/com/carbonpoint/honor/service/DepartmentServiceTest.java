package com.carbonpoint.honor.service;

import com.carbonpoint.honor.mapper.DepartmentMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("部门服务单元测试")
class DepartmentServiceTest {

    @Mock
    private DepartmentMapper departmentMapper;

    @InjectMocks
    private DepartmentService departmentService;

    @Test
    @DisplayName("获取部门列表")
    void testListDepartments() {
        var result = departmentService.listDepartments(1, 10);
        assertNotNull(result);
    }

    @Test
    @DisplayName("获取所有部门")
    void testGetAllDepartments() {
        var result = departmentService.getAllDepartments();
        assertNotNull(result);
    }
}
