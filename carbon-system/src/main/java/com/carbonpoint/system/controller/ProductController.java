package com.carbonpoint.system.controller;

import com.carbonpoint.common.result.Result;
import com.carbonpoint.system.dto.req.ProductCreateReq;
import com.carbonpoint.system.dto.req.ProductFeatureUpdateReq;
import com.carbonpoint.system.dto.req.ProductUpdateReq;
import com.carbonpoint.system.dto.res.PageRes;
import com.carbonpoint.system.dto.res.ProductFeatureRes;
import com.carbonpoint.system.dto.res.ProductRes;
import com.carbonpoint.system.service.ProductService;
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
}
