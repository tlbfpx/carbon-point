package com.carbonpoint.system;

import com.carbonpoint.system.dto.res.MenuItemVO;
import com.carbonpoint.system.dto.res.MenuNode;
import com.carbonpoint.system.entity.*;
import com.carbonpoint.system.mapper.*;
import com.carbonpoint.system.service.MenuService;
import com.carbonpoint.system.service.ResourceRegistry;
import com.carbonpoint.system.service.impl.MenuServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

/**
 * Phase2BenchmarkTest - 阶段二性能基准测试。
 *
 * 测试场景：
 * 1. 大数据量下的菜单生成性能对比
 * 2. 并发访问性能测试
 * 3. 内存使用对比（模拟）
 * 4. 缓存命中率测试
 */
@ExtendWith(MockitoExtension.class)
class Phase2BenchmarkTest {

    @Mock
    private TenantMapper tenantMapper;

    @Mock
    private ProductMapper productMapper;

    @Mock
    private PackageProductMapper packageProductMapper;

    @Mock
    private ResourceRegistry resourceRegistry;

    @InjectMocks
    private MenuServiceImpl menuService;

    private Tenant testTenant;
    private List<ProductEntity> manyOldProducts;
    private List<PlatformResource> manyNewResources;
    private List<PackageProductEntity> manyPackageProducts;

    @BeforeEach
    void setUp() {
        // Setup test tenant
        testTenant = new Tenant();
        testTenant.setId(100L);
        testTenant.setPackageId(1L);

        // Create many products for performance testing
        manyOldProducts = new ArrayList<>();
        manyNewResources = new ArrayList<>();
        manyPackageProducts = new ArrayList<>();

        String[] categories = {"stairs_climbing", "walking", "quiz", "mall", "honor"};
        String[] productNames = {"楼梯打卡", "健走打卡", "知识问答", "积分商城", "荣誉体系"};

        for (int i = 1; i <= 50; i++) {
            // Old product
            ProductEntity oldProduct = new ProductEntity();
            oldProduct.setId("prod_" + i);
            oldProduct.setCode("product_" + i);
            oldProduct.setName(productNames[i % 5] + " " + i);
            oldProduct.setCategory(categories[i % 5]);
            oldProduct.setStatus(1);
            manyOldProducts.add(oldProduct);

            // New resource
            PlatformResource newResource = new PlatformResource();
            newResource.setId("res_" + i);
            newResource.setCode("product_" + i);
            newResource.setName(productNames[i % 5] + " " + i);
            newResource.setCategory(categories[i % 5]);
            newResource.setType("FUNCTION_PRODUCT");
            newResource.setStatus("ENABLED");
            newResource.setSortOrder(i);
            manyNewResources.add(newResource);

            // Package product
            PackageProductEntity pp = new PackageProductEntity();
            pp.setPackageId(1L);
            pp.setProductId("prod_" + i);
            manyPackageProducts.add(pp);
        }
    }

    @Nested
    @DisplayName("大数据量性能测试")
    class LargeDataPerformanceTests {

        private static final int ITERATIONS = 100;

        @Test
        @DisplayName("旧架构大数据量菜单生成性能")
        void oldArchitectureLargeDataPerformance() {
            // Given
            when(tenantMapper.selectById(anyLong())).thenReturn(testTenant);
            when(packageProductMapper.selectByPackageId(anyLong())).thenReturn(manyPackageProducts);
            for (int i = 0; i < manyOldProducts.size(); i++) {
                when(productMapper.selectById("prod_" + (i + 1))).thenReturn(manyOldProducts.get(i));
            }

            // Warmup
            for (int i = 0; i < 10; i++) {
                menuService.getTenantMenu(100L);
            }

            // Measurement
            long startTime = System.nanoTime();
            for (int i = 0; i < ITERATIONS; i++) {
                menuService.getTenantMenu(100L);
            }
            long totalTime = System.nanoTime() - startTime;

            double avgTimeMs = (totalTime / (double) ITERATIONS) / 1_000_000.0;
            double throughput = ITERATIONS / (totalTime / 1_000_000_000.0);

            System.out.println("=== 旧架构大数据量性能测试 ===");
            System.out.printf("数据量: %d 个产品%n", manyOldProducts.size());
            System.out.printf("迭代次数: %d%n", ITERATIONS);
            System.out.printf("总耗时: %.3f ms%n", totalTime / 1_000_000.0);
            System.out.printf("平均耗时: %.3f ms/次%n", avgTimeMs);
            System.out.printf("吞吐量: %.2f 次/秒%n", throughput);

            assertTrue(avgTimeMs < 100, "平均响应时间应小于 100ms");
        }

        @Test
        @DisplayName("新架构大数据量菜单生成性能")
        void newArchitectureLargeDataPerformance() {
            // Given
            when(tenantMapper.selectById(anyLong())).thenReturn(testTenant);
            when(resourceRegistry.getFunctionProducts()).thenReturn(manyNewResources);

            // Warmup
            for (int i = 0; i < 10; i++) {
                menuService.getResourceDrivenMenu(100L);
            }

            // Measurement
            long startTime = System.nanoTime();
            for (int i = 0; i < ITERATIONS; i++) {
                menuService.getResourceDrivenMenu(100L);
            }
            long totalTime = System.nanoTime() - startTime;

            double avgTimeMs = (totalTime / (double) ITERATIONS) / 1_000_000.0;
            double throughput = ITERATIONS / (totalTime / 1_000_000_000.0);

            System.out.println("=== 新架构大数据量性能测试 ===");
            System.out.printf("数据量: %d 个产品%n", manyNewResources.size());
            System.out.printf("迭代次数: %d%n", ITERATIONS);
            System.out.printf("总耗时: %.3f ms%n", totalTime / 1_000_000.0);
            System.out.printf("平均耗时: %.3f ms/次%n", avgTimeMs);
            System.out.printf("吞吐量: %.2f 次/秒%n", throughput);

            assertTrue(avgTimeMs < 100, "平均响应时间应小于 100ms");
        }
    }

    @Nested
    @DisplayName("内存使用对比测试")
    class MemoryUsageComparisonTests {

        @Test
        @DisplayName("对比新旧架构的内存使用")
        void compareMemoryUsage() {
            // Given
            when(tenantMapper.selectById(anyLong())).thenReturn(testTenant);
            when(packageProductMapper.selectByPackageId(anyLong())).thenReturn(manyPackageProducts);
            when(resourceRegistry.getFunctionProducts()).thenReturn(manyNewResources);
            for (int i = 0; i < manyOldProducts.size(); i++) {
                when(productMapper.selectById("prod_" + (i + 1))).thenReturn(manyOldProducts.get(i));
            }

            // Force GC to get a clean baseline
            System.gc();
            sleep(100);

            // Measure old architecture memory
            Runtime runtime = Runtime.getRuntime();
            long beforeOld = runtime.totalMemory() - runtime.freeMemory();

            List<MenuItemVO> oldMenu = menuService.getTenantMenu(100L);

            long afterOld = runtime.totalMemory() - runtime.freeMemory();
            long oldMemoryUsage = afterOld - beforeOld;

            // Force GC again
            System.gc();
            sleep(100);

            // Measure new architecture memory
            long beforeNew = runtime.totalMemory() - runtime.freeMemory();

            List<MenuNode> newMenu = menuService.getResourceDrivenMenu(100L);

            long afterNew = runtime.totalMemory() - runtime.freeMemory();
            long newMemoryUsage = afterNew - beforeNew;

            System.out.println("=== 内存使用对比测试 ===");
            System.out.printf("旧架构内存使用: %d bytes (%.2f KB)%n", oldMemoryUsage, oldMemoryUsage / 1024.0);
            System.out.printf("新架构内存使用: %d bytes (%.2f KB)%n", newMemoryUsage, newMemoryUsage / 1024.0);
            System.out.printf("差异: %s%d bytes%n", newMemoryUsage > oldMemoryUsage ? "+" : "", newMemoryUsage - oldMemoryUsage);

            // Basic assertions
            assertEquals(manyOldProducts.size() + 5, oldMenu.size(), "旧架构菜单数量应正确");
            assertEquals(manyNewResources.size() + 5, newMenu.size(), "新架构菜单数量应正确");
        }

        private void sleep(long ms) {
            try {
                Thread.sleep(ms);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
    }

    @Nested
    @DisplayName("扩展性测试")
    class ScalabilityTests {

        @Test
        @DisplayName("测试不同数据量下的性能表现")
        void testDifferentDataSizes() {
            int[] dataSizes = {1, 5, 10, 25, 50, 100};

            System.out.println("=== 不同数据量下的性能表现 ===");
            System.out.printf("%-10s %-20s %-20s%n", "数据量", "旧架构(ms)", "新架构(ms)");
            System.out.println("--------------------------------------------------");

            for (int size : dataSizes) {
                // Prepare test data for this size
                List<ProductEntity> oldProducts = manyOldProducts.subList(0, Math.min(size, manyOldProducts.size()));
                List<PlatformResource> newResources = manyNewResources.subList(0, Math.min(size, manyNewResources.size()));
                List<PackageProductEntity> packageProducts = manyPackageProducts.subList(0, Math.min(size, manyPackageProducts.size()));

                // Setup mocks
                when(tenantMapper.selectById(anyLong())).thenReturn(testTenant);
                when(packageProductMapper.selectByPackageId(anyLong())).thenReturn(packageProducts);
                when(resourceRegistry.getFunctionProducts()).thenReturn(newResources);
                for (int i = 0; i < oldProducts.size(); i++) {
                    when(productMapper.selectById((long) (i + 1))).thenReturn(oldProducts.get(i));
                }

                // Benchmark old architecture
                long oldAvg = benchmark(() -> menuService.getTenantMenu(100L));

                // Benchmark new architecture
                long newAvg = benchmark(() -> menuService.getResourceDrivenMenu(100L));

                System.out.printf("%-10d %-20.3f %-20.3f%n", size, oldAvg / 1_000_000.0, newAvg / 1_000_000.0);
            }
        }

        private long benchmark(Runnable task) {
            // Warmup
            for (int i = 0; i < 5; i++) {
                task.run();
            }

            // Measure
            int iterations = 50;
            long totalTime = 0;
            for (int i = 0; i < iterations; i++) {
                long start = System.nanoTime();
                task.run();
                totalTime += System.nanoTime() - start;
            }
            return totalTime / iterations;
        }
    }
}
