package com.carbonpoint.system.service;

import com.carbonpoint.system.dto.req.RuleTemplateCreateReq;
import com.carbonpoint.system.dto.req.RuleTemplateUpdateReq;
import com.carbonpoint.system.dto.res.RuleTemplateRes;

import java.util.List;

public interface ProductRuleTemplateService {
    List<RuleTemplateRes> listByProduct(String productId);
    RuleTemplateRes create(String productId, RuleTemplateCreateReq req);
    RuleTemplateRes update(String templateId, RuleTemplateUpdateReq req);
    void delete(String templateId);
    void syncToTenants(String productId);
}
