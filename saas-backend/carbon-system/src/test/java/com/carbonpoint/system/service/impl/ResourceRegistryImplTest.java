package com.carbonpoint.system.service.impl;

import com.carbonpoint.system.entity.FeatureEntity;
import com.carbonpoint.system.entity.PlatformProduct;
import com.carbonpoint.system.entity.PlatformResource;
import com.carbonpoint.system.enums.ResourceType;
import com.carbonpoint.system.mapper.FeatureMapper;
import com.carbonpoint.system.mapper.PlatformProductMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * ResourceRegistryImpl unit tests.
 */
@ExtendWith(MockitoExtension.class)
class ResourceRegistryImplTest {

    @Mock
    private FeatureMapper featureMapper;

    @Mock
    private PlatformProductMapper productMapper;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private ResourceRegistryImpl resourceRegistry;

    private FeatureEntity testFeature;
    private PlatformProduct testProduct;
    private LocalDateTime testTime;

    @BeforeEach
    void setUp() {
        testTime = LocalDateTime.now();

        // Setup test feature
        testFeature = new FeatureEntity();
        testFeature.setId("feature-1");
        testFeature.setCode("test.feature");
        testFeature.setName("测试功能");
        testFeature.setType("config");
        testFeature.setValueType("boolean");
        testFeature.setDefaultValue("true");
        testFeature.setDescription("测试功能描述");
        testFeature.setGroup("general");
        testFeature.setCreatedAt(testTime);
        testFeature.setUpdatedAt(testTime);

        // Setup test product
        testProduct = new PlatformProduct();
        testProduct.setId("product-1");
        testProduct.setCode("test.product");
        testProduct.setName("测试产品");
        testProduct.setCategory("stairs_climbing");
        testProduct.setDescription("测试产品描述");
        testProduct.setStatus(1);
        testProduct.setSortOrder(10);
        testProduct.setTriggerType("daily_checkin");
        testProduct.setRuleChainConfig("{}");
        testProduct.setDefaultConfig("{}");
        testProduct.setBasicConfig("{}");
        testProduct.setDeleted(0);
        testProduct.setCreatedAt(testTime);
        testProduct.setUpdatedAt(testTime);
    }

    @Nested
    @DisplayName("refresh")
    class RefreshTests {

        @Test
        @DisplayName("刷新应加载功能和产品到缓存")
        void shouldLoadFeaturesAndProductsIntoCache() throws Exception {
            // Given
            when(featureMapper.selectList(null)).thenReturn(List.of(testFeature));
            when(productMapper.selectList(null)).thenReturn(List.of(testProduct));
            when(objectMapper.writeValueAsString(any())).thenReturn("{}");

            // When
            resourceRegistry.refresh();

            // Then
            verify(featureMapper, times(1)).selectList(null);
            verify(productMapper, times(1)).selectList(null);

            List<PlatformResource> allResources = resourceRegistry.getAllResources();
            assertEquals(2, allResources.size());
        }

        @Test
        @DisplayName("刷新应正确构建功能资源")
        void shouldBuildFeatureResourceCorrectly() throws Exception {
            // Given
            when(featureMapper.selectList(null)).thenReturn(List.of(testFeature));
            when(productMapper.selectList(null)).thenReturn(List.of());
            when(objectMapper.writeValueAsString(any())).thenReturn("{\"featureType\":\"config\"}");

            // When
            resourceRegistry.refresh();

            // Then
            PlatformResource resource = resourceRegistry.getResourceByCode("test.feature");
            assertNotNull(resource);
            assertEquals("test.feature", resource.getCode());
            assertEquals(ResourceType.FEATURE.getCode(), resource.getType());
            assertEquals("测试功能", resource.getName());
            assertEquals("ENABLED", resource.getStatus());

            FeatureEntity feature = resourceRegistry.getFeatureEntityByCode("test.feature");
            assertNotNull(feature);
            assertEquals("test.feature", feature.getCode());
        }

        @Test
        @DisplayName("刷新应正确构建产品资源")
        void shouldBuildProductResourceCorrectly() throws Exception {
            // Given
            when(featureMapper.selectList(null)).thenReturn(List.of());
            when(productMapper.selectList(null)).thenReturn(List.of(testProduct));
            when(objectMapper.writeValueAsString(any())).thenReturn("{\"triggerType\":\"daily_checkin\"}");

            // When
            resourceRegistry.refresh();

            // Then
            PlatformResource resource = resourceRegistry.getResourceByCode("test.product");
            assertNotNull(resource);
            assertEquals("test.product", resource.getCode());
            assertEquals(ResourceType.FUNCTION_PRODUCT.getCode(), resource.getType());
            assertEquals("测试产品", resource.getName());
            assertEquals("ENABLED", resource.getStatus());

            PlatformProduct product = resourceRegistry.getProductByCode("test.product");
            assertNotNull(product);
            assertEquals("test.product", product.getCode());
        }
    }

    @Nested
    @DisplayName("getAllResources")
    class GetAllResourcesTests {

        @Test
        @DisplayName("应返回所有资源")
        void shouldReturnAllResources() throws Exception {
            // Given
            when(featureMapper.selectList(null)).thenReturn(List.of(testFeature));
            when(productMapper.selectList(null)).thenReturn(List.of(testProduct));
            when(objectMapper.writeValueAsString(any())).thenReturn("{}");
            resourceRegistry.refresh();

            // When
            List<PlatformResource> result = resourceRegistry.getAllResources();

            // Then
            assertEquals(2, result.size());
        }

        @Test
        @DisplayName("无资源时应返回空列表")
        void shouldReturnEmptyListWhenNoResources() {
            // Given
            when(featureMapper.selectList(null)).thenReturn(List.of());
            when(productMapper.selectList(null)).thenReturn(List.of());
            resourceRegistry.refresh();

            // When
            List<PlatformResource> result = resourceRegistry.getAllResources();

            // Then
            assertTrue(result.isEmpty());
        }
    }

    @Nested
    @DisplayName("getResourceByCode")
    class GetResourceByCodeTests {

        @Test
        @DisplayName("应返回匹配代码的资源")
        void shouldReturnResourceByCode() throws Exception {
            // Given
            when(featureMapper.selectList(null)).thenReturn(List.of(testFeature));
            when(productMapper.selectList(null)).thenReturn(List.of());
            when(objectMapper.writeValueAsString(any())).thenReturn("{}");
            resourceRegistry.refresh();

            // When
            PlatformResource result = resourceRegistry.getResourceByCode("test.feature");

            // Then
            assertNotNull(result);
            assertEquals("test.feature", result.getCode());
        }

        @Test
        @DisplayName("不存在的代码应返回 null")
        void shouldReturnNullForNonExistentCode() throws Exception {
            // Given
            when(featureMapper.selectList(null)).thenReturn(List.of(testFeature));
            when(productMapper.selectList(null)).thenReturn(List.of());
            when(objectMapper.writeValueAsString(any())).thenReturn("{}");
            resourceRegistry.refresh();

            // When
            PlatformResource result = resourceRegistry.getResourceByCode("nonexistent.code");

            // Then
            assertNull(result);
        }
    }

    @Nested
    @DisplayName("getFunctionProducts")
    class GetFunctionProductsTests {

        @Test
        @DisplayName("应只返回功能产品类型的资源并按排序顺序")
        void shouldReturnOnlyFunctionProductsSorted() throws Exception {
            // Given
            PlatformProduct product2 = new PlatformProduct();
            product2.setCode("product.2");
            product2.setName("产品2");
            product2.setStatus(1);
            product2.setSortOrder(20);
            product2.setDeleted(0);

            when(featureMapper.selectList(null)).thenReturn(List.of(testFeature));
            when(productMapper.selectList(null)).thenReturn(List.of(testProduct, product2));
            when(objectMapper.writeValueAsString(any())).thenReturn("{}");
            resourceRegistry.refresh();

            // When
            List<PlatformResource> result = resourceRegistry.getFunctionProducts();

            // Then
            assertEquals(2, result.size());
            assertEquals("test.product", result.get(0).getCode());
            assertEquals("product.2", result.get(1).getCode());
        }
    }

    @Nested
    @DisplayName("getFeatures")
    class GetFeaturesTests {

        @Test
        @DisplayName("应只返回功能类型的资源并按排序顺序")
        void shouldReturnOnlyFeaturesSorted() throws Exception {
            // Given
            FeatureEntity feature2 = new FeatureEntity();
            feature2.setCode("feature.2");
            feature2.setName("功能2");

            when(featureMapper.selectList(null)).thenReturn(List.of(testFeature, feature2));
            when(productMapper.selectList(null)).thenReturn(List.of(testProduct));
            when(objectMapper.writeValueAsString(any())).thenReturn("{}");
            resourceRegistry.refresh();

            // When
            List<PlatformResource> result = resourceRegistry.getFeatures();

            // Then
            assertEquals(2, result.size());
            assertTrue(result.stream().allMatch(r -> ResourceType.FEATURE.getCode().equals(r.getType())));
        }
    }

    @Nested
    @DisplayName("getFeatureEntityByCode")
    class GetFeatureEntityByCodeTests {

        @Test
        @DisplayName("应返回匹配代码的功能实体")
        void shouldReturnFeatureEntityByCode() throws Exception {
            // Given
            when(featureMapper.selectList(null)).thenReturn(List.of(testFeature));
            when(productMapper.selectList(null)).thenReturn(List.of());
            when(objectMapper.writeValueAsString(any())).thenReturn("{}");
            resourceRegistry.refresh();

            // When
            FeatureEntity result = resourceRegistry.getFeatureEntityByCode("test.feature");

            // Then
            assertNotNull(result);
            assertEquals("test.feature", result.getCode());
        }
    }

    @Nested
    @DisplayName("getProductByCode")
    class GetProductByCodeTests {

        @Test
        @DisplayName("应返回匹配代码的产品实体")
        void shouldReturnProductByCode() throws Exception {
            // Given
            when(featureMapper.selectList(null)).thenReturn(List.of());
            when(productMapper.selectList(null)).thenReturn(List.of(testProduct));
            when(objectMapper.writeValueAsString(any())).thenReturn("{}");
            resourceRegistry.refresh();

            // When
            PlatformProduct result = resourceRegistry.getProductByCode("test.product");

            // Then
            assertNotNull(result);
            assertEquals("test.product", result.getCode());
        }
    }
}
