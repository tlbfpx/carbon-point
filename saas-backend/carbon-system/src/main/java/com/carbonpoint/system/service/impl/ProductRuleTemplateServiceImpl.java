package com.carbonpoint.system.service.impl;

import com.carbonpoint.system.dto.req.RuleTemplateCreateReq;
import com.carbonpoint.system.dto.req.RuleTemplateUpdateReq;
import com.carbonpoint.system.dto.res.RuleTemplateRes;
import com.carbonpoint.system.entity.ProductEntity;
import com.carbonpoint.system.entity.ProductRuleTemplateEntity;
import com.carbonpoint.system.event.RuleTemplateDeletedEvent;
import com.carbonpoint.system.event.RuleTemplateSyncEvent;
import com.carbonpoint.system.mapper.PackageProductMapper;
import com.carbonpoint.system.mapper.ProductMapper;
import com.carbonpoint.system.mapper.ProductRuleTemplateMapper;
import com.carbonpoint.system.mapper.TenantMapper;
import com.carbonpoint.system.service.ProductRuleTemplateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductRuleTemplateServiceImpl implements ProductRuleTemplateService {

    private final ProductRuleTemplateMapper templateMapper;
    private final PackageProductMapper packageProductMapper;
    private final TenantMapper tenantMapper;
    private final ProductMapper productMapper;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    public List<RuleTemplateRes> listByProduct(String productId) {
        return templateMapper.selectByProductId(productId).stream()
                .map(this::toRes).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public RuleTemplateRes create(String productId, RuleTemplateCreateReq req) {
        ProductRuleTemplateEntity entity = new ProductRuleTemplateEntity();
        entity.setProductId(productId);
        entity.setRuleType(req.getRuleType());
        entity.setName(req.getName());
        entity.setConfig(req.getConfig());
        entity.setEnabled(req.getEnabled() != null && req.getEnabled() ? 1 : 0);
        entity.setSortOrder(req.getSortOrder() != null ? req.getSortOrder() : 0);
        entity.setDescription(req.getDescription());
        templateMapper.insert(entity);
        return toRes(entity);
    }

    @Override
    @Transactional
    public RuleTemplateRes update(String templateId, RuleTemplateUpdateReq req) {
        ProductRuleTemplateEntity entity = templateMapper.selectById(templateId);
        if (entity == null) throw new IllegalArgumentException("规则模板不存在: " + templateId);
        if (req.getName() != null) entity.setName(req.getName());
        if (req.getConfig() != null) entity.setConfig(req.getConfig());
        if (req.getEnabled() != null) entity.setEnabled(req.getEnabled() ? 1 : 0);
        if (req.getSortOrder() != null) entity.setSortOrder(req.getSortOrder());
        if (req.getDescription() != null) entity.setDescription(req.getDescription());
        templateMapper.updateById(entity);
        return toRes(entity);
    }

    @Override
    @Transactional
    public void delete(String templateId) {
        ProductRuleTemplateEntity entity = templateMapper.selectById(templateId);
        if (entity == null) return;
        // Publish event so carbon-points can clean up related tenant point rules
        eventPublisher.publishEvent(new RuleTemplateDeletedEvent(templateId));
        templateMapper.deleteById(templateId);
    }

    @Override
    @Transactional
    public void syncToTenants(String productId) {
        List<ProductRuleTemplateEntity> templates = templateMapper.selectByProductId(productId);
        if (templates.isEmpty()) return;

        List<Long> packageIds = packageProductMapper.selectPackageIdsByProductId(productId);
        if (packageIds.isEmpty()) return;

        List<Long> tenantIds = packageIds.stream()
                .flatMap(pkgId -> tenantMapper.selectIdsByPackageId(pkgId).stream())
                .distinct().toList();
        if (tenantIds.isEmpty()) return;

        String productCode = resolveProductCode(productId);

        // Publish sync event for carbon-points to handle the actual upsert
        eventPublisher.publishEvent(new RuleTemplateSyncEvent(productId));

        log.info("Published RuleTemplateSyncEvent for product {} ({} templates, {} tenants, code={})",
                productId, templates.size(), tenantIds.size(), productCode);
    }

    private String resolveProductCode(String productId) {
        ProductEntity product = productMapper.selectById(productId);
        return product != null ? product.getCode() : productId;
    }

    private RuleTemplateRes toRes(ProductRuleTemplateEntity entity) {
        RuleTemplateRes res = new RuleTemplateRes();
        res.setId(entity.getId());
        res.setProductId(entity.getProductId());
        res.setRuleType(entity.getRuleType());
        res.setName(entity.getName());
        res.setConfig(entity.getConfig());
        res.setEnabled(entity.getEnabled());
        res.setSortOrder(entity.getSortOrder());
        res.setDescription(entity.getDescription());
        res.setCreatedAt(entity.getCreatedAt());
        res.setUpdatedAt(entity.getUpdatedAt());
        return res;
    }
}
