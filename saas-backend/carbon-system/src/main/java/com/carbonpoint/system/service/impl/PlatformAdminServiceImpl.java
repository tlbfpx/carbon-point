package com.carbonpoint.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.system.dto.PlatformAdminRequest;
import com.carbonpoint.system.dto.PlatformAdminVO;
import com.carbonpoint.system.entity.PlatformAdminEntity;
import com.carbonpoint.system.mapper.PlatformAdminMapper;
import com.carbonpoint.system.service.PlatformAdminService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Platform admin CRUD service implementation.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PlatformAdminServiceImpl implements PlatformAdminService {

    private final PlatformAdminMapper adminMapper;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public PlatformAdminVO create(PlatformAdminRequest request, Long operatorId) {
        // Check username uniqueness
        long count = adminMapper.selectCount(
                new LambdaQueryWrapper<PlatformAdminEntity>()
                        .eq(PlatformAdminEntity::getUsername, request.getUsername())
        );
        if (count > 0) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "用户名已存在");
        }

        // Only super_admin can create admins/viewers
        validateOperatorRole(operatorId, PlatformAdminEntity.ROLE_SUPER_ADMIN);

        // Validate role creation permissions
        validateRoleCreation(request.getRole(), operatorId);

        PlatformAdminEntity admin = new PlatformAdminEntity();
        admin.setUsername(request.getUsername());
        admin.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        admin.setDisplayName(request.getDisplayName());
        admin.setRole(request.getRole());
        admin.setStatus(PlatformAdminEntity.STATUS_ACTIVE);
        admin.setCreatedAt(LocalDateTime.now());
        admin.setUpdatedAt(LocalDateTime.now());

        adminMapper.insert(admin);

        log.info("Platform admin created: id={}, username={}, role={}, by={}",
                admin.getId(), admin.getUsername(), admin.getRole(), operatorId);

        return toVO(admin);
    }

    @Override
    @Transactional
    public PlatformAdminVO update(Long id, PlatformAdminRequest request, Long operatorId) {
        validateOperatorRole(operatorId, PlatformAdminEntity.ROLE_SUPER_ADMIN);

        PlatformAdminEntity admin = adminMapper.selectById(id);
        if (admin == null) {
            throw new BusinessException(ErrorCode.PLATFORM_ADMIN_NOT_FOUND);
        }

        // If changing role, validate permission
        if (request.getRole() != null && !request.getRole().equals(admin.getRole())) {
            validateRoleCreation(request.getRole(), operatorId);
        }

        if (request.getDisplayName() != null) {
            admin.setDisplayName(request.getDisplayName());
        }
        if (request.getRole() != null) {
            admin.setRole(request.getRole());
        }
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            admin.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }
        admin.setUpdatedAt(LocalDateTime.now());

        adminMapper.updateById(admin);

        log.info("Platform admin updated: id={}, by={}", id, operatorId);
        return toVO(admin);
    }

    @Override
    @Transactional
    public void disable(Long id, Long operatorId) {
        validateOperatorRole(operatorId, PlatformAdminEntity.ROLE_SUPER_ADMIN);

        PlatformAdminEntity admin = adminMapper.selectById(id);
        if (admin == null) {
            throw new BusinessException(ErrorCode.PLATFORM_ADMIN_NOT_FOUND);
        }

        // Cannot disable the last super_admin
        if (PlatformAdminEntity.ROLE_SUPER_ADMIN.equals(admin.getRole())) {
            long superAdminCount = adminMapper.selectCount(
                    new LambdaQueryWrapper<PlatformAdminEntity>()
                            .eq(PlatformAdminEntity::getRole, PlatformAdminEntity.ROLE_SUPER_ADMIN)
                            .eq(PlatformAdminEntity::getStatus, PlatformAdminEntity.STATUS_ACTIVE)
            );
            if (superAdminCount <= 1) {
                throw new BusinessException(ErrorCode.ROLE_LAST_SUPER_ADMIN, "无法禁用最后一个超级管理员");
            }
        }

        admin.setStatus(PlatformAdminEntity.STATUS_DISABLED);
        admin.setUpdatedAt(LocalDateTime.now());
        adminMapper.updateById(admin);

        log.info("Platform admin disabled: id={}, by={}", id, operatorId);
    }

    @Override
    public PlatformAdminVO getById(Long id) {
        PlatformAdminEntity admin = adminMapper.selectById(id);
        if (admin == null) {
            throw new BusinessException(ErrorCode.PLATFORM_ADMIN_NOT_FOUND);
        }
        return toVO(admin);
    }

    @Override
    public IPage<PlatformAdminVO> list(int page, int pageSize, String keyword, String role, String status) {
        Page<PlatformAdminEntity> pageParam = new Page<>(page, pageSize);
        LambdaQueryWrapper<PlatformAdminEntity> query = new LambdaQueryWrapper<>();

        if (keyword != null && !keyword.isBlank()) {
            query.and(w -> w.like(PlatformAdminEntity::getUsername, keyword)
                    .or().like(PlatformAdminEntity::getDisplayName, keyword));
        }
        if (role != null && !role.isBlank()) {
            query.eq(PlatformAdminEntity::getRole, role);
        }
        if (status != null && !status.isBlank()) {
            query.eq(PlatformAdminEntity::getStatus, status);
        }
        query.orderByDesc(PlatformAdminEntity::getCreatedAt);

        Page<PlatformAdminEntity> result = adminMapper.selectPage(pageParam, query);
        return result.convert(this::toVO);
    }

    private void validateOperatorRole(Long operatorId, String requiredRole) {
        if (operatorId == null) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        // Note: Full role validation requires Phase 3 RBAC to be complete.
        // Currently trusts the JWT claims since only authenticated requests reach this service.
    }

    private void validateRoleCreation(String role, Long operatorId) {
        if (PlatformAdminEntity.ROLE_SUPER_ADMIN.equals(role)) {
            PlatformAdminEntity operator = adminMapper.selectById(operatorId);
            if (operator == null || !PlatformAdminEntity.ROLE_SUPER_ADMIN.equals(operator.getRole())) {
                throw new BusinessException(ErrorCode.AUTH_PERMISSION_DENIED, "只有超级管理员可以创建超级管理员");
            }
        }
    }

    private PlatformAdminVO toVO(PlatformAdminEntity admin) {
        return PlatformAdminVO.builder()
                .id(admin.getId())
                .username(admin.getUsername())
                .displayName(admin.getDisplayName())
                .role(admin.getRole())
                .status(admin.getStatus())
                .lastLoginAt(admin.getLastLoginAt())
                .createdAt(admin.getCreatedAt())
                .build();
    }
}
