package com.carbonpoint.honor.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.common.controller.BaseController;
import com.carbonpoint.common.result.Result;
import com.carbonpoint.honor.dto.DepartmentDTO;
import com.carbonpoint.honor.service.DepartmentService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.carbonpoint.common.security.JwtUserPrincipal;

import java.util.List;

/**
 * 部门管理 API（企业管理员使用）。
 */
@RestController
@RequestMapping("/api/v1/departments")
@RequiredArgsConstructor
public class DepartmentController extends BaseController {

    private final DepartmentService departmentService;

    /**
     * 创建部门。
     */
    @PostMapping
    @PreAuthorize("hasAuthority('enterprise:member:create')")
    public Result<DepartmentDTO> create(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @Valid @RequestBody CreateReq req) {
        DepartmentDTO result = departmentService.create(req.getName(), req.getLeaderId());
        return success(result);
    }

    /**
     * 更新部门。
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('enterprise:member:edit')")
    public Result<DepartmentDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateReq req) {
        DepartmentDTO result = departmentService.update(id, req.getName(), req.getLeaderId());
        return success(result);
    }

    /**
     * 删除部门（需先转移成员）。
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('enterprise:member:edit')")
    public Result<Void> delete(@PathVariable Long id) {
        departmentService.delete(id);
        return success();
    }

    /**
     * 获取部门详情。
     */
    @GetMapping("/{id}")
    public Result<DepartmentDTO> getById(@PathVariable Long id) {
        return success(departmentService.getById(id));
    }

    /**
     * 部门列表（分页）。
     */
    @GetMapping
    public Result<Page<DepartmentDTO>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return success(departmentService.list(page, size));
    }

    /**
     * 部门列表（不分页，用于下拉选择）。
     */
    @GetMapping("/all")
    public Result<List<DepartmentDTO>> listAll() {
        return success(departmentService.listAll());
    }

    /**
     * 分配用户到部门。
     */
    @PutMapping("/{departmentId}/users/{userId}")
    @PreAuthorize("hasAuthority('enterprise:member:edit')")
    public Result<Void> assignUser(
            @PathVariable Long departmentId,
            @PathVariable Long userId) {
        departmentService.assignUser(userId, departmentId);
        return success();
    }

    // --- Request DTOs ---

    @Data
    public static class CreateReq {
        @NotBlank(message = "部门名称不能为空")
        private String name;

        private Long leaderId;
    }

    @Data
    public static class UpdateReq {
        @NotBlank(message = "部门名称不能为空")
        private String name;

        private Long leaderId;
    }
}
