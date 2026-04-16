package com.carbonpoint.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.system.dto.req.TenantBrandingUpdateReq;
import com.carbonpoint.system.dto.res.TenantBrandingRes;
import com.carbonpoint.system.entity.Role;
import com.carbonpoint.system.entity.RolePermission;
import com.carbonpoint.system.entity.TenantBranding;
import com.carbonpoint.system.mapper.RoleMapper;
import com.carbonpoint.system.mapper.RolePermissionMapper;
import com.carbonpoint.system.mapper.TenantBrandingMapper;
import com.carbonpoint.system.service.TenantBrandingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.context.event.ContextRefreshedEvent;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TenantBrandingServiceImpl implements TenantBrandingService {

    private final TenantBrandingMapper tenantBrandingMapper;
    private final RoleMapper roleMapper;
    private final RolePermissionMapper rolePermissionMapper;
    
    @EventListener(ContextRefreshedEvent.class)
    @Transactional
    public void initBrandingPermission() {
        // 给所有企业的超级管理员补上品牌管理权限
        LambdaQueryWrapper<Role> roleQuery = new LambdaQueryWrapper<>();
        roleQuery.eq(Role::getName, "超级管理员")
                .eq(Role::getIsPreset, true);
        List<Role> superAdminRoles = roleMapper.selectList(roleQuery);
        
        for (Role role : superAdminRoles) {
            // 检查是否已经有这个权限，避免重复插入
            LambdaQueryWrapper<RolePermission> permQuery = new LambdaQueryWrapper<>();
            permQuery.eq(RolePermission::getRoleId, role.getId())
                    .eq(RolePermission::getPermissionCode, "enterprise:branding:manage");
            Long count = rolePermissionMapper.selectCount(permQuery);
            
            if (count == 0) {
                // 没有权限则插入
                RolePermission rp = new RolePermission();
                rp.setRoleId(role.getId());
                rp.setPermissionCode("enterprise:branding:manage");
                rolePermissionMapper.insert(rp);
                log.info("已给企业 {} 的超级管理员补上品牌管理权限", role.getTenantId());
            }
        }
        log.info("品牌管理权限初始化完成，共更新 {} 个企业的权限", superAdminRoles.size());
    }

    // 允许的图片类型
    private static final List<String> ALLOWED_CONTENT_TYPES = Arrays.asList(
            "image/png", "image/jpeg", "image/jpg", "image/svg+xml"
    );

    // 最大文件大小：500KB
    private static final long MAX_FILE_SIZE = 500 * 1024;

    @Override
    public TenantBrandingRes getCurrent() {
        Long tenantId = TenantContext.getTenantId();
        TenantBranding branding = getOrCreateBranding(tenantId);
        return convertToRes(branding);
    }

    @Override
    @Transactional
    public TenantBrandingRes update(TenantBrandingUpdateReq req) {
        Long tenantId = TenantContext.getTenantId();
        TenantBranding branding = getOrCreateBranding(tenantId);

        // 更新主题配置
        if (req.getThemeType() != null) {
            branding.setThemeType(req.getThemeType());
        }
        if (req.getPresetTheme() != null) {
            branding.setPresetTheme(req.getPresetTheme());
        }
        if (req.getPrimaryColor() != null) {
            branding.setPrimaryColor(req.getPrimaryColor());
        }
        if (req.getSecondaryColor() != null) {
            branding.setSecondaryColor(req.getSecondaryColor());
        }

        tenantBrandingMapper.updateById(branding);
        return convertToRes(branding);
    }

    @Override
    @Transactional
    public String uploadLogo(MultipartFile file) {
        // 校验文件
        validateFile(file);

        Long tenantId = TenantContext.getTenantId();
        TenantBranding branding = getOrCreateBranding(tenantId);

        // TODO: 替换为实际的OSS上传逻辑
        String fileName = UUID.randomUUID() + getFileExtension(file.getOriginalFilename());
        String logoUrl = "/uploads/" + fileName;

        // 更新logo URL
        branding.setLogoUrl(logoUrl);
        tenantBrandingMapper.updateById(branding);

        return logoUrl;
    }

    @Override
    @Transactional
    public void deleteLogo() {
        Long tenantId = TenantContext.getTenantId();
        TenantBranding branding = getOrCreateBranding(tenantId);

        // TODO: 替换为实际的OSS文件删除逻辑
        if (branding.getLogoUrl() != null) {
            log.info("Deleting logo file: {}", branding.getLogoUrl());
        }

        // 清空logo URL
        branding.setLogoUrl(null);
        tenantBrandingMapper.updateById(branding);
    }

    @Override
    public TenantBrandingRes getByTenantId(Long tenantId) {
        TenantBranding branding = getOrCreateBranding(tenantId);
        return convertToRes(branding);
    }

    @Override
    public TenantBrandingRes getByTenantDomain(String domain) {
        // TODO: 实现根据域名查询租户品牌配置的逻辑，需要先在tenant表添加domain字段
        throw new UnsupportedOperationException("Domain lookup not implemented yet");
    }

    /**
     * 获取或创建租户品牌配置
     */
    private TenantBranding getOrCreateBranding(Long tenantId) {
        LambdaQueryWrapper<TenantBranding> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(TenantBranding::getTenantId, tenantId);
        TenantBranding branding = tenantBrandingMapper.selectOne(queryWrapper);

        if (branding == null) {
            // 不存在则创建默认配置
            branding = new TenantBranding();
            branding.setTenantId(tenantId);
            branding.setThemeType("preset");
            branding.setPresetTheme("default-blue");
            tenantBrandingMapper.insert(branding);
        }

        return branding;
    }

    /**
     * 校验上传的文件
     */
    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "上传的文件不能为空");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "文件大小不能超过500KB");
        }

        String contentType = file.getContentType();
        if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "仅支持PNG、JPG、SVG格式的图片");
        }
    }

    /**
     * 获取文件扩展名
     */
    private String getFileExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            return "";
        }
        return fileName.substring(fileName.lastIndexOf("."));
    }

    /**
     * 转换为响应DTO
     */
    private TenantBrandingRes convertToRes(TenantBranding branding) {
        TenantBrandingRes res = new TenantBrandingRes();
        BeanUtils.copyProperties(branding, res);
        return res;
    }
}
