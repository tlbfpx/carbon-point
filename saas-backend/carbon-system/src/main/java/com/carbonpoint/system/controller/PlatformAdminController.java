package com.carbonpoint.system.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.carbonpoint.common.result.Result;
import com.carbonpoint.common.security.PlatformAdminContext;
import com.carbonpoint.system.dto.PlatformAdminRequest;
import com.carbonpoint.system.dto.PlatformAdminUpdateRequest;
import com.carbonpoint.system.dto.PlatformAdminVO;
import com.carbonpoint.system.dto.PageRequest;
import com.carbonpoint.system.service.PlatformAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * Platform admin CRUD controller.
 * All operations require super_admin role.
 * Endpoints: GET/POST/PUT/DELETE /platform/admins
 */
@RestController
@RequestMapping("/platform/admins")
@RequiredArgsConstructor
public class PlatformAdminController {

    private final PlatformAdminService adminService;

    /**
     * List platform admins with pagination.
     */
    @GetMapping
    public Result<IPage<PlatformAdminVO>> list(PageRequest request,
                                                  @RequestParam(required = false) String keyword,
                                                  @RequestParam(required = false) String role,
                                                  @RequestParam(required = false) String status) {
        IPage<PlatformAdminVO> page = adminService.list(
                request.getPage(), request.getPageSize(), keyword, role, status);
        return Result.success(page);
    }

    /**
     * Get platform admin detail.
     */
    @GetMapping("/{id}")
    public Result<PlatformAdminVO> getById(@PathVariable Long id) {
        return Result.success(adminService.getById(id));
    }

    /**
     * Create platform admin (requires super_admin).
     */
    @PostMapping
    public Result<PlatformAdminVO> create(@Valid @RequestBody PlatformAdminRequest request) {
        Long operatorId = getCurrentAdminId();
        return Result.success(adminService.create(request, operatorId));
    }

    /**
     * Update platform admin (requires super_admin).
     * Accepts partial updates - only provided fields will be changed.
     */
    @PutMapping("/{id}")
    public Result<PlatformAdminVO> update(@PathVariable Long id,
                                          @Valid @RequestBody PlatformAdminUpdateRequest request) {
        Long operatorId = getCurrentAdminId();
        return Result.success(adminService.update(id, request, operatorId));
    }

    /**
     * Disable platform admin (requires super_admin).
     * The last super_admin cannot be disabled.
     */
    @PutMapping("/{id}/disable")
    public Result<Void> disable(@PathVariable Long id) {
        Long operatorId = getCurrentAdminId();
        adminService.disable(id, operatorId);
        return Result.success();
    }

    /**
     * Delete platform admin (soft delete, requires super_admin).
     * The last super_admin cannot be deleted.
     */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        Long operatorId = getCurrentAdminId();
        adminService.delete(id, operatorId);
        return Result.success();
    }

    private Long getCurrentAdminId() {
        var info = PlatformAdminContext.get();
        return info != null ? info.getAdminId() : null;
    }
}
