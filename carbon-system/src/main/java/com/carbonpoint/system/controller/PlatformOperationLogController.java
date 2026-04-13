package com.carbonpoint.system.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.common.result.Result;
import com.carbonpoint.system.dto.PageRequest;
import com.carbonpoint.system.dto.PlatformOperationLogVO;
import com.carbonpoint.system.entity.PlatformOperationLogEntity;
import com.carbonpoint.system.mapper.PlatformOperationLogMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * Platform operation log controller.
 * Allows platform admins to view operation history.
 * Endpoints: GET /platform/logs
 */
@RestController
@RequestMapping("/platform/logs")
@RequiredArgsConstructor
public class PlatformOperationLogController {

    private final PlatformOperationLogMapper logMapper;

    /**
     * List platform operation logs with pagination.
     */
    @GetMapping
    public Result<IPage<PlatformOperationLogVO>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(required = false) Integer size,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) Long adminId,
            @RequestParam(required = false) String operationType,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {

        // Accept both 'size' (from frontend) and 'pageSize'
        int effectiveSize = (size != null && size > 0) ? size : pageSize;
        Page<PlatformOperationLogEntity> pageParam = new Page<>(page, effectiveSize);
        var query = new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<PlatformOperationLogEntity>();

        if (adminId != null) {
            query.eq(PlatformOperationLogEntity::getAdminId, adminId);
        }
        if (operationType != null && !operationType.isBlank()) {
            query.eq(PlatformOperationLogEntity::getOperationType, operationType);
        }
        if (startDate != null && !startDate.isBlank()) {
            query.ge(PlatformOperationLogEntity::getCreatedAt, startDate + " 00:00:00");
        }
        if (endDate != null && !endDate.isBlank()) {
            query.le(PlatformOperationLogEntity::getCreatedAt, endDate + " 23:59:59");
        }

        query.orderByDesc(PlatformOperationLogEntity::getCreatedAt);

        Page<PlatformOperationLogEntity> result = logMapper.selectPage(pageParam, query);
        IPage<PlatformOperationLogVO> pageResult = result.convert(this::toVO);
        return Result.success(pageResult);
    }

    private PlatformOperationLogVO toVO(PlatformOperationLogEntity entity) {
        return PlatformOperationLogVO.builder()
                .id(entity.getId())
                .adminId(entity.getAdminId())
                .adminName(entity.getAdminName())
                .adminRole(entity.getAdminRole())
                .operationType(entity.getOperationType())
                .operationObject(entity.getOperationObject())
                .ipAddress(entity.getIpAddress())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
