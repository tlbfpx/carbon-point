package com.carbonpoint.system.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.carbonpoint.system.dto.PlatformAdminRequest;
import com.carbonpoint.system.dto.PlatformAdminUpdateRequest;
import com.carbonpoint.system.dto.PlatformAdminVO;

/**
 * Platform admin CRUD service.
 */
public interface PlatformAdminService {

    /**
     * Create a new platform admin (requires super_admin role).
     */
    PlatformAdminVO create(PlatformAdminRequest request, Long operatorId);

    /**
     * Update platform admin (requires super_admin role).
     * Accepts partial updates via PlatformAdminUpdateRequest.
     */
    PlatformAdminVO update(Long id, PlatformAdminUpdateRequest request, Long operatorId);

    /**
     * Disable a platform admin (requires super_admin role).
     * The last super_admin cannot be disabled.
     */
    void disable(Long id, Long operatorId);

    /**
     * Delete a platform admin (soft delete, requires super_admin role).
     * The last super_admin cannot be deleted.
     */
    void delete(Long id, Long operatorId);

    /**
     * Get platform admin detail by ID.
     */
    PlatformAdminVO getById(Long id);

    /**
     * List platform admins with pagination.
     */
    IPage<PlatformAdminVO> list(int page, int pageSize, String keyword, String role, String status);
}
