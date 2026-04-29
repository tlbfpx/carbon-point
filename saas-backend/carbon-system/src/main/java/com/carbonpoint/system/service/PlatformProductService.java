package com.carbonpoint.system.service;

import com.carbonpoint.system.dto.req.ProductCreateReq;
import com.carbonpoint.system.dto.req.ProductFeatureUpdateReq;
import com.carbonpoint.system.dto.req.ProductUpdateReq;
import com.carbonpoint.system.dto.res.PageRes;
import com.carbonpoint.system.dto.res.ProductFeatureRes;
import com.carbonpoint.system.dto.res.ProductPackageBriefRes;
import com.carbonpoint.system.dto.res.ProductRes;

import java.util.List;

/**
 * Service for managing platform products (the core products that tenants can subscribe to).
 * This includes product CRUD, feature management, and product-package relationships.
 */
public interface PlatformProductService {

    /**
     * Get a paginated list of platform products with optional filters.
     *
     * @param page the page number (1-based)
     * @param size the page size
     * @param category optional category filter
     * @param status optional status filter
     * @param keyword optional keyword search filter (name/code)
     * @return paginated product results
     */
    PageRes<ProductRes> getProducts(int page, int size, String category, Integer status, String keyword);

    /**
     * Get a single platform product by ID.
     *
     * @param id the product ID
     * @return the product details
     */
    ProductRes getProduct(String id);

    /**
     * Create a new platform product.
     *
     * @param req the product creation request
     * @return the created product
     */
    ProductRes createProduct(ProductCreateReq req);

    /**
     * Update an existing platform product.
     *
     * @param id the product ID
     * @param req the update request
     * @return the updated product
     */
    ProductRes updateProduct(String id, ProductUpdateReq req);

    /**
     * Delete a platform product (soft delete).
     *
     * @param id the product ID
     */
    void deleteProduct(String id);

    /**
     * Get all features associated with a product.
     *
     * @param productId the product ID
     * @return list of product features
     */
    List<ProductFeatureRes> getProductFeatures(String productId);

    /**
     * Update the features associated with a product.
     *
     * @param productId the product ID
     * @param req the feature update request
     */
    void updateProductFeatures(String productId, ProductFeatureUpdateReq req);

    /**
     * Get all packages that include this product.
     *
     * @param productId the product ID
     * @return list of packages briefs
     */
    List<ProductPackageBriefRes> getProductPackages(String productId);

    /**
     * Get the basic configuration JSON for a product.
     *
     * @param productId the product ID
     * @return the basic config JSON string
     */
    String getBasicConfig(String productId);

    /**
     * Update the basic configuration JSON for a product.
     *
     * @param productId the product ID
     * @param basicConfigJson the new basic config JSON
     */
    void updateBasicConfig(String productId, String basicConfigJson);
}
