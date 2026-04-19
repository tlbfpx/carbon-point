package com.carbonpoint.system.service;

import com.carbonpoint.system.dto.req.TenantBrandingUpdateReq;
import com.carbonpoint.system.dto.res.TenantBrandingRes;
import org.springframework.web.multipart.MultipartFile;

public interface TenantBrandingService {
    /**
     * 获取当前租户的品牌配置
     */
    TenantBrandingRes getCurrent();
    
    /**
     * 更新当前租户的品牌配置
     */
    TenantBrandingRes update(TenantBrandingUpdateReq req);
    
    /**
     * 上传企业logo
     */
    String uploadLogo(MultipartFile file);
    
    /**
     * 删除企业logo
     */
    void deleteLogo();
    
    /**
     * 根据租户ID获取品牌配置（公开接口）
     */
    TenantBrandingRes getByTenantId(Long tenantId);
    
    /**
     * 根据租户域名获取品牌配置（公开接口）
     */
    TenantBrandingRes getByTenantDomain(String domain);
}
