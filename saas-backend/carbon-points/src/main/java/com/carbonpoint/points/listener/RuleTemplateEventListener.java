package com.carbonpoint.points.listener;

import com.carbonpoint.points.service.PointRuleService;
import com.carbonpoint.system.entity.ProductRuleTemplateEntity;
import com.carbonpoint.system.event.RuleTemplateDeletedEvent;
import com.carbonpoint.system.event.RuleTemplateSyncEvent;
import com.carbonpoint.system.mapper.PackageProductMapper;
import com.carbonpoint.system.mapper.ProductMapper;
import com.carbonpoint.system.mapper.ProductRuleTemplateMapper;
import com.carbonpoint.system.mapper.TenantMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.carbonpoint.common.tenant.TenantContext;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class RuleTemplateEventListener {

    private final PointRuleService pointRuleService;
    private final ProductRuleTemplateMapper templateMapper;
    private final PackageProductMapper packageProductMapper;
    private final TenantMapper tenantMapper;
    private final ProductMapper productMapper;

    @EventListener
    @Transactional
    public void onSyncEvent(RuleTemplateSyncEvent event) {
        String productId = event.getProductId();
        List<ProductRuleTemplateEntity> templates = templateMapper.selectByProductId(productId);
        if (templates.isEmpty()) return;

        List<Long> packageIds = packageProductMapper.selectPackageIdsByProductId(productId);
        if (packageIds.isEmpty()) return;

        List<Long> tenantIds = packageIds.stream()
                .flatMap(pkgId -> tenantMapper.selectIdsByPackageId(pkgId).stream())
                .distinct().toList();
        if (tenantIds.isEmpty()) return;

        String productCode = resolveProductCode(productId);

        for (Long tenantId : tenantIds) {
            TenantContext.setTenantId(tenantId);
            try {
                for (ProductRuleTemplateEntity tmpl : templates) {
                    pointRuleService.upsertFromTemplate(
                            tenantId, tmpl.getId(), productCode,
                            tmpl.getRuleType(), tmpl.getName(), tmpl.getConfig(), tmpl.getSortOrder());
                }
            } finally {
                TenantContext.clear();
            }
        }
        log.info("Synced {} templates for product {} to {} tenants", templates.size(), productId, tenantIds.size());
    }

    @EventListener
    @Transactional
    public void onDeletedEvent(RuleTemplateDeletedEvent event) {
        String templateId = event.getTemplateId();
        // Find the template to determine which product it belongs to
        ProductRuleTemplateEntity template = templateMapper.selectById(templateId);
        if (template == null) return;

        List<Long> packageIds = packageProductMapper.selectPackageIdsByProductId(template.getProductId());
        if (packageIds.isEmpty()) return;

        List<Long> tenantIds = packageIds.stream()
                .flatMap(pkgId -> tenantMapper.selectIdsByPackageId(pkgId).stream())
                .distinct().toList();

        for (Long tenantId : tenantIds) {
            TenantContext.setTenantId(tenantId);
            try {
                pointRuleService.deleteBySourceTemplateId(templateId);
            } finally {
                TenantContext.clear();
            }
        }
        log.info("Deleted rules from template {} for {} tenants", templateId, tenantIds.size());
    }

    private String resolveProductCode(String productId) {
        var product = productMapper.selectById(productId);
        return product != null ? product.getCode() : productId;
    }
}
