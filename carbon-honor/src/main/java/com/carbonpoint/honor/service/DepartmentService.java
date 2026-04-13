package com.carbonpoint.honor.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.honor.dto.DepartmentDTO;
import com.carbonpoint.honor.entity.Department;
import com.carbonpoint.honor.mapper.DepartmentMapper;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.mapper.UserQueryMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 部门管理服务。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentMapper departmentMapper;
    private final UserQueryMapper userQueryMapper;

    /**
     * 创建部门。
     */
    @Transactional
    public DepartmentDTO create(String name, Long leaderId) {
        Long tenantId = TenantContext.getTenantId();
        validateLeader(tenantId, leaderId);

        Department dept = new Department();
        dept.setTenantId(tenantId);
        dept.setName(name);
        dept.setLeaderId(leaderId);
        departmentMapper.insert(dept);

        return toDTO(dept);
    }

    /**
     * 更新部门信息。
     */
    @Transactional
    public DepartmentDTO update(Long departmentId, String name, Long leaderId) {
        Long tenantId = TenantContext.getTenantId();
        Department dept = departmentMapper.selectById(departmentId);
        if (dept == null || !dept.getTenantId().equals(tenantId)) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "部门不存在");
        }
        if (name != null) dept.setName(name);
        if (leaderId != null) {
            validateLeader(tenantId, leaderId);
            dept.setLeaderId(leaderId);
        }
        departmentMapper.updateById(dept);
        return toDTO(dept);
    }

    /**
     * 删除部门。
     * 规则：删除前需先将部门内用户转移至其他部门。
     */
    @Transactional
    public void delete(Long departmentId) {
        Long tenantId = TenantContext.getTenantId();
        Department dept = departmentMapper.selectById(departmentId);
        if (dept == null || !dept.getTenantId().equals(tenantId)) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "部门不存在");
        }

        // 检查部门内是否还有用户
        Long userCount = userQueryMapper.countByDepartment(departmentId);
        if (userCount > 0) {
            throw new BusinessException(ErrorCode.PARAM_INVALID,
                    "部门内还有 " + userCount + " 名成员，请先转移成员后再删除");
        }

        departmentMapper.deleteById(departmentId);
        log.info("Department deleted: id={}, tenantId={}", departmentId, tenantId);
    }

    /**
     * 查询部门详情。
     */
    public DepartmentDTO getById(Long departmentId) {
        Long tenantId = TenantContext.getTenantId();
        Department dept = departmentMapper.selectById(departmentId);
        if (dept == null || !dept.getTenantId().equals(tenantId)) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "部门不存在");
        }
        return toDTO(dept);
    }

    /**
     * 部门列表（分页）。
     */
    public Page<DepartmentDTO> list(int page, int size) {
        Long tenantId = TenantContext.getTenantId();
        LambdaQueryWrapper<Department> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Department::getTenantId, tenantId)
                .orderByAsc(Department::getId);
        Page<Department> result = departmentMapper.selectPage(new Page<>(page, size), wrapper);

        Page<DepartmentDTO> dtoPage = new Page<>(result.getCurrent(), result.getSize(), result.getTotal());
        dtoPage.setRecords(result.getRecords().stream().map(this::toDTO).toList());
        return dtoPage;
    }

    /**
     * 部门列表（不分页，返回所有部门）。
     */
    public List<DepartmentDTO> listAll() {
        Long tenantId = TenantContext.getTenantId();
        LambdaQueryWrapper<Department> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Department::getTenantId, tenantId)
                .orderByAsc(Department::getId);
        return departmentMapper.selectList(wrapper).stream()
                .map(this::toDTO)
                .toList();
    }

    /**
     * 将用户分配到部门。
     */
    @Transactional
    public void assignUser(Long userId, Long departmentId) {
        Long tenantId = TenantContext.getTenantId();
        User user = userQueryMapper.selectById(userId);
        if (user == null || !user.getTenantId().equals(tenantId)) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        if (departmentId != null) {
            Department dept = departmentMapper.selectById(departmentId);
            if (dept == null || !dept.getTenantId().equals(tenantId)) {
                throw new BusinessException(ErrorCode.NOT_FOUND, "部门不存在");
            }
        }
        userQueryMapper.updateDepartment(userId, departmentId);
        log.info("User {} assigned to department {}", userId, departmentId);
    }

    // --- Private helpers ---

    private void validateLeader(Long tenantId, Long leaderId) {
        if (leaderId == null) return;
        User leader = userQueryMapper.selectById(leaderId);
        if (leader == null || !leader.getTenantId().equals(tenantId)) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND, "部门负责人不在本企业");
        }
    }

    private DepartmentDTO toDTO(Department dept) {
        DepartmentDTO dto = new DepartmentDTO();
        dto.setId(dept.getId());
        dto.setTenantId(dept.getTenantId());
        dto.setName(dept.getName());
        dto.setLeaderId(dept.getLeaderId());
        if (dept.getLeaderId() != null) {
            User leader = userQueryMapper.selectById(dept.getLeaderId());
            if (leader != null) {
                dto.setLeaderName(leader.getNickname() != null ? leader.getNickname() : leader.getPhone());
            }
        }
        Long memberCount = userQueryMapper.countByDepartment(dept.getId());
        dto.setMemberCount(memberCount != null ? memberCount.intValue() : 0);
        dto.setCreatedAt(dept.getCreatedAt() != null ? dept.getCreatedAt().toString() : null);
        dto.setUpdatedAt(dept.getUpdatedAt() != null ? dept.getUpdatedAt().toString() : null);
        return dto;
    }
}
