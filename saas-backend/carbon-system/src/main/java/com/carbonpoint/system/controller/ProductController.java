package com.carbonpoint.system.controller;

import com.carbonpoint.common.result.Result;
import com.carbonpoint.system.dto.req.BasicConfigUpdateReq;
import com.carbonpoint.system.dto.req.ProductCreateReq;
import com.carbonpoint.system.dto.req.ProductFeatureUpdateReq;
import com.carbonpoint.system.dto.req.ProductUpdateReq;
import com.carbonpoint.system.dto.req.RuleTemplateCreateReq;
import com.carbonpoint.system.dto.req.RuleTemplateUpdateReq;
import com.carbonpoint.system.dto.res.PageRes;
import com.carbonpoint.system.dto.res.ProductFeatureRes;
import com.carbonpoint.system.dto.res.ProductPackageBriefRes;
import com.carbonpoint.system.dto.res.ProductRes;
import com.carbonpoint.system.dto.res.RuleTemplateRes;
import com.carbonpoint.system.security.PlatformAdminOnly;
import com.carbonpoint.system.service.ProductRuleTemplateService;
import com.carbonpoint.system.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Product management controller - platform level.
 */
@RestController
@RequestMapping("/platform/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;
    private final ProductRuleTemplateService ruleTemplateService;

    /**
     * List products with pagination.
     * GET /products?page=1&size=20&category=stairs_climbing&status=1&keyword=xxx
     */
    @GetMapping
    public Result<PageRes<ProductRes>> getProducts(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false) String keyword) {
        return Result.success(productService.getProducts(page, size, category, status, keyword));
    }

    /**
     * Get a single product by ID.
     * GET /products/{id}
     */
    @GetMapping("/{id}")
    public Result<ProductRes> getProduct(@PathVariable String id) {
        return Result.success(productService.getProduct(id));
    }

    /**
     * Create a new product.
     * POST /products
     */
    @PostMapping
    public Result<ProductRes> createProduct(@RequestBody ProductCreateReq req) {
        return Result.success(productService.createProduct(req));
    }

    /**
     * Update an existing product.
     * PUT /products/{id}
     */
    @PutMapping("/{id}")
    public Result<ProductRes> updateProduct(@PathVariable String id,
                                            @RequestBody ProductUpdateReq req) {
        return Result.success(productService.updateProduct(id, req));
    }

    /**
     * Delete a product (physical delete).
     * DELETE /products/{id}
     */
    @DeleteMapping("/{id}")
    public Result<Void> deleteProduct(@PathVariable String id) {
        productService.deleteProduct(id);
        return Result.success();
    }

    /**
     * Get features associated with a product.
     * GET /products/{productId}/features
     */
    @GetMapping("/{productId}/features")
    public Result<List<ProductFeatureRes>> getProductFeatures(@PathVariable String productId) {
        return Result.success(productService.getProductFeatures(productId));
    }

    /**
     * Update features associated with a product.
     * PUT /products/{productId}/features
     */
    @PutMapping("/{productId}/features")
    public Result<Void> updateProductFeatures(@PathVariable String productId,
                                              @RequestBody ProductFeatureUpdateReq req) {
        productService.updateProductFeatures(productId, req);
        return Result.success();
    }

    @GetMapping("/{productId}/packages")
    public Result<List<ProductPackageBriefRes>> getProductPackages(@PathVariable String productId) {
        return Result.success(productService.getProductPackages(productId));
    }

    @PlatformAdminOnly
    @GetMapping("/{id}/basic-config")
    public Result<String> getBasicConfig(@PathVariable String id) {
        return Result.success(productService.getBasicConfig(id));
    }

    @PlatformAdminOnly
    @PutMapping("/{id}/basic-config")
    public Result<Void> updateBasicConfig(@PathVariable String id, @RequestBody @Valid BasicConfigUpdateReq req) {
        productService.updateBasicConfig(id, req.getBasicConfig());
        return Result.success(null);
    }

    @PlatformAdminOnly
    @GetMapping("/{id}/rule-templates")
    public Result<List<RuleTemplateRes>> listRuleTemplates(@PathVariable String id) {
        return Result.success(ruleTemplateService.listByProduct(id));
    }

    @PlatformAdminOnly
    @PostMapping("/{id}/rule-templates")
    public Result<RuleTemplateRes> createRuleTemplate(@PathVariable String id, @RequestBody @Valid RuleTemplateCreateReq req) {
        RuleTemplateRes res = ruleTemplateService.create(id, req);
        ruleTemplateService.syncToTenants(id);
        return Result.success(res);
    }

    @PlatformAdminOnly
    @PutMapping("/{id}/rule-templates/{templateId}")
    public Result<RuleTemplateRes> updateRuleTemplate(@PathVariable String id, @PathVariable String templateId,
                                                       @RequestBody @Valid RuleTemplateUpdateReq req) {
        RuleTemplateRes res = ruleTemplateService.update(templateId, req);
        ruleTemplateService.syncToTenants(id);
        return Result.success(res);
    }

    @PlatformAdminOnly
    @DeleteMapping("/{id}/rule-templates/{templateId}")
    public Result<Void> deleteRuleTemplate(@PathVariable String id, @PathVariable String templateId) {
        ruleTemplateService.delete(templateId);
        return Result.success(null);
    }
}
