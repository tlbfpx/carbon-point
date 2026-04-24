package com.carbonpoint.system.service;

import com.carbonpoint.system.dto.req.ProductCreateReq;
import com.carbonpoint.system.dto.req.ProductFeatureUpdateReq;
import com.carbonpoint.system.dto.req.ProductUpdateReq;
import com.carbonpoint.system.dto.res.PageRes;
import com.carbonpoint.system.dto.res.ProductFeatureRes;
import com.carbonpoint.system.dto.res.ProductRes;
import com.carbonpoint.system.dto.res.ProductPackageBriefRes;

import java.util.List;

public interface ProductService {

    PageRes<ProductRes> getProducts(int page, int size, String category, Integer status, String keyword);

    ProductRes getProduct(String id);

    ProductRes createProduct(ProductCreateReq req);

    ProductRes updateProduct(String id, ProductUpdateReq req);

    void deleteProduct(String id);

    List<ProductFeatureRes> getProductFeatures(String productId);

    void updateProductFeatures(String productId, ProductFeatureUpdateReq req);

    List<ProductPackageBriefRes> getProductPackages(String productId);

    String getBasicConfig(String productId);

    void updateBasicConfig(String productId, String basicConfigJson);
}
