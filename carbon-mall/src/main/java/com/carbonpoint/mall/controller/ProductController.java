package com.carbonpoint.mall.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.system.security.RequirePerm;
import com.carbonpoint.common.result.Result;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.mall.dto.ProductCreateDTO;
import com.carbonpoint.mall.entity.Product;
import com.carbonpoint.mall.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @PostMapping
    @RequirePerm("enterprise:product:create")
    public Result<Product> create(@RequestBody @Valid ProductCreateDTO dto) {
        return Result.success(productService.create(dto));
    }

    @PutMapping("/{id}")
    @RequirePerm("enterprise:product:edit")
    public Result<Product> update(@PathVariable Long id, @RequestBody ProductCreateDTO dto) {
        return Result.success(productService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @RequirePerm("enterprise:product:delete")
    public Result<Void> delete(@PathVariable Long id) {
        productService.delete(id);
        return Result.success();
    }

    @PutMapping("/{id}/toggle")
    @RequirePerm("enterprise:product:toggle")
    public Result<Product> toggleStatus(@PathVariable Long id) {
        return Result.success(productService.toggleStatus(id));
    }

    @PutMapping("/{id}/stock")
    @RequirePerm("enterprise:product:stock")
    public Result<Integer> updateStock(@PathVariable Long id, @RequestParam int delta) {
        return Result.success(productService.updateStock(id, delta));
    }

    @GetMapping
    @RequirePerm("enterprise:product:list")
    public Result<Page<Product>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type) {
        Long tenantId = TenantContext.getTenantId();
        return Result.success(productService.list(tenantId, page, size, status, type));
    }

    @GetMapping("/{id}")
    @RequirePerm("enterprise:product:list")
    public Result<Product> getById(@PathVariable Long id) {
        return Result.success(productService.getById(id));
    }
}
