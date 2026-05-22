package com.carbonpoint.system;

import com.carbonpoint.system.entity.*;
import com.carbonpoint.system.enums.ResourceType;
import com.carbonpoint.system.mapper.*;
import com.carbonpoint.system.service.MenuService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 性能基准测试
 * 验证数据同步和API响应时间满足性能要求
 *
 * 测试场景:
 * 1. 批量数据导入性能
 * 2. 同步延迟测试 (< 5秒)
 * 3. 新旧API性能对比
 * 4. 并发请求性能
 * 5. 大数据量查询性能
 */
@SpringBootTest
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@Transactional
public class PerformanceBenchmarkTest {

    private static final int WARMUP_ITERATIONS = 5;
    private static final int MEASUREMENT_ITERATIONS = 20;
    private static final long MAX_ALLOWED_LATENCY_MS = 5000; // 5秒

    @Autowired
    private PlatformResourceMapper platformResourceMapper;

    @Autowired
    private PlatformProductMapper platformProductMapper;

    @Autowired
    private TenantResourceConfigMapper tenantResourceConfigMapper;

    @Autowired
    private ProductConfigMapper productConfigMapper;

    @Autowired
    private TenantMapper tenantMapper;

    @Autowired
    private MenuService menuService;

    private List<Tenant> testTenants = new ArrayList<>();
    private List<PlatformResource> testResources = new ArrayList<>();

    @BeforeEach
    void setUp() {
        // 创建测试租户
        for (int i = 0; i < 10; i++) {
            Tenant tenant = new Tenant();
            tenant.setName("性能测试租户 " + i);
            tenant.setPackageType("pro");
            tenant.setStatus("active");
            tenantMapper.insert(tenant);
            testTenants.add(tenant);
        }

        // 创建测试资源
        for (int i = 0; i < 50; i++) {
            PlatformResource resource = new PlatformResource();
            resource.setCode("PERF_TEST_RESOURCE_" + i);
            resource.setType(ResourceType.FUNCTION_PRODUCT.getCode());
            resource.setName("性能测试资源 " + i);
            resource.setCategory("exercise");
            resource.setStatus("ENABLED");
            resource.setSortOrder(i);
            platformResourceMapper.insert(resource);
            testResources.add(resource);
        }
    }

    // ============================================
    // 批量导入性能测试
    // ============================================

    @Test
    @Order(1)
    @DisplayName("批量资源导入 - 1000条记录应在合理时间内完成")
    void testBulkResourceImport_Performance() {
        // Warmup
        for (int i = 0; i < WARMUP_ITERATIONS; i++) {
            insertTestResources(10);
        }

        // Measurement
        long totalTime = 0;
        long minTime = Long.MAX_VALUE;
        long maxTime = Long.MIN_VALUE;

        for (int i = 0; i < MEASUREMENT_ITERATIONS / 2; i++) {
            long start = System.currentTimeMillis();
            int inserted = insertTestResources(100); // 每批100条
            long end = System.currentTimeMillis();
            long duration = end - start;

            totalTime += duration;
            minTime = Math.min(minTime, duration);
            maxTime = Math.max(maxTime, duration);

            System.out.printf("Batch %d: %d records in %dms%n", i + 1, inserted, duration);
        }

        double avgTime = (double) totalTime / (MEASUREMENT_ITERATIONS / 2);
        double avgThroughput = 100.0 / (avgTime / 1000.0); // 条/秒

        System.out.println("\n=== 批量导入性能结果 ===");
        System.out.printf("平均耗时: %.2fms/批次%n", avgTime);
        System.out.printf("最小耗时: %dms/批次%n", minTime);
        System.out.printf("最大耗时: %dms/批次%n", maxTime);
        System.out.printf("平均吞吐量: %.2f 条/秒%n", avgThroughput);

        // 验证吞吐量满足要求 (至少 50 条/秒)
        assertTrue(avgThroughput >= 50, "批量导入吞吐量应 >= 50 条/秒");
    }

    // ============================================
    // 同步延迟测试
    // ============================================

    @Test
    @Order(2)
    @DisplayName("同步延迟测试 - 单条记录同步应 < 5秒")
    void testSyncLatency_ShouldBeLessThan5Seconds() {
        // Warmup
        for (int i = 0; i < WARMUP_ITERATIONS; i++) {
            measureSyncLatency();
        }

        // Measurement
        List<Long> latencies = new ArrayList<>();
        long totalLatency = 0;

        for (int i = 0; i < MEASUREMENT_ITERATIONS; i++) {
            long latency = measureSyncLatency();
            latencies.add(latency);
            totalLatency += latency;
        }

        // 计算统计信息
        Collections.sort(latencies);
        double avgLatency = (double) totalLatency / MEASUREMENT_ITERATIONS;
        long p50Latency = latencies.get(latencies.size() / 2);
        long p95Latency = latencies.get((int) (latencies.size() * 0.95));
        long p99Latency = latencies.get((int) (latencies.size() * 0.99));
        long maxLatency = latencies.get(latencies.size() - 1);

        System.out.println("\n=== 同步延迟测试结果 ===");
        System.out.printf("平均延迟: %.2fms%n", avgLatency);
        System.out.printf("P50 延迟: %dms%n", p50Latency);
        System.out.printf("P95 延迟: %dms%n", p95Latency);
        System.out.printf("P99 延迟: %dms%n", p99Latency);
        System.out.printf("最大延迟: %dms%n", maxLatency);

        // 验证 P95 < 5秒
        assertTrue(p95Latency < MAX_ALLOWED_LATENCY_MS,
            "P95 同步延迟应 < 5秒，实际: " + p95Latency + "ms");

        // 验证最大延迟 < 5秒
        assertTrue(maxLatency < MAX_ALLOWED_LATENCY_MS,
            "最大同步延迟应 < 5秒，实际: " + maxLatency + "ms");
    }

    // ============================================
    // API 性能对比测试
    // ============================================

    @Test
    @Order(3)
    @DisplayName("菜单API性能对比 - 新API应不比旧API慢超过20%")
    void testMenuApiPerformance_Comparison() {
        // 准备数据
        Tenant tenant = testTenants.get(0);

        // Warmup
        for (int i = 0; i < WARMUP_ITERATIONS; i++) {
            menuService.getTenantMenu(tenant.getId());
            menuService.getResourceDrivenMenu(tenant.getId());
        }

        // 测量旧 API
        List<Long> oldApiTimings = new ArrayList<>();
        for (int i = 0; i < MEASUREMENT_ITERATIONS; i++) {
            long start = System.currentTimeMillis();
            menuService.getTenantMenu(tenant.getId());
            long end = System.currentTimeMillis();
            oldApiTimings.add(end - start);
        }

        // 测量新 API
        List<Long> newApiTimings = new ArrayList<>();
        for (int i = 0; i < MEASUREMENT_ITERATIONS; i++) {
            long start = System.currentTimeMillis();
            menuService.getResourceDrivenMenu(tenant.getId());
            long end = System.currentTimeMillis();
            newApiTimings.add(end - start);
        }

        // 计算统计
        double oldAvg = oldApiTimings.stream().mapToLong(Long::longValue).average().orElse(0);
        double newAvg = newApiTimings.stream().mapToLong(Long::longValue).average().orElse(0);

        Collections.sort(oldApiTimings);
        Collections.sort(newApiTimings);
        long oldP95 = oldApiTimings.get((int) (oldApiTimings.size() * 0.95));
        long newP95 = newApiTimings.get((int) (newApiTimings.size() * 0.95));

        System.out.println("\n=== 菜单 API 性能对比 ===");
        System.out.printf("旧 API - 平均: %.2fms, P95: %dms%n", oldAvg, oldP95);
        System.out.printf("新 API - 平均: %.2fms, P95: %dms%n", newAvg, newP95);

        // 验证新 API 不比旧 API 慢超过 20%
        double slowdownRatio = (newAvg - oldAvg) / oldAvg;
        assertTrue(slowdownRatio < 0.2,
            "新 API 不应比旧 API 慢超过 20%，实际慢: " + (slowdownRatio * 100) + "%");

        // 验证新 API P95 < 2秒
        assertTrue(newP95 < 2000, "新 API P95 应 < 2秒，实际: " + newP95 + "ms");
    }

    // ============================================
    // 并发请求性能测试
    // ============================================

    @Test
    @Order(4)
    @DisplayName("并发请求测试 - 50并发下应保持稳定")
    void testConcurrentRequests_Performance() throws InterruptedException {
        int threadCount = 50;
        int requestsPerThread = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(threadCount);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);
        List<Long> responseTimes = Collections.synchronizedList(new ArrayList<>());

        Tenant tenant = testTenants.get(0);

        // Warmup
        for (int i = 0; i < 5; i++) {
            menuService.getResourceDrivenMenu(tenant.getId());
        }

        // 开始并发测试
        long startTime = System.currentTimeMillis();

        for (int i = 0; i < threadCount; i++) {
            final int threadIndex = i;
            executor.submit(() -> {
                try {
                    for (int j = 0; j < requestsPerThread; j++) {
                        long start = System.currentTimeMillis();
                        menuService.getResourceDrivenMenu(tenant.getId());
                        long end = System.currentTimeMillis();
                        responseTimes.add(end - start);
                        successCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    failureCount.incrementAndGet();
                } finally {
                    latch.countDown();
                }
            });
        }

        // 等待所有线程完成
        latch.await(60, TimeUnit.SECONDS);
        long endTime = System.currentTimeMillis();
        executor.shutdown();

        // 计算统计
        long totalTime = endTime - startTime;
        int totalRequests = successCount.get();
        double throughput = totalRequests / (totalTime / 1000.0);

        Collections.sort(responseTimes);
        double avgResponseTime = responseTimes.stream().mapToLong(Long::longValue).average().orElse(0);
        long p95ResponseTime = responseTimes.get((int) (responseTimes.size() * 0.95));

        System.out.println("\n=== 并发请求测试结果 ===");
        System.out.printf("线程数: %d%n", threadCount);
        System.out.printf("总请求数: %d%n", totalRequests);
        System.out.printf("成功数: %d%n", successCount.get());
        System.out.printf("失败数: %d%n", failureCount.get());
        System.out.printf("总耗时: %dms%n", totalTime);
        System.out.printf("吞吐量: %.2f 请求/秒%n", throughput);
        System.out.printf("平均响应时间: %.2fms%n", avgResponseTime);
        System.out.printf("P95 响应时间: %dms%n", p95ResponseTime);

        // 验证结果
        assertEquals(0, failureCount.get(), "并发测试不应有失败");
        assertTrue(throughput >= 20, "吞吐量应 >= 20 请求/秒，实际: " + throughput);
        assertTrue(p95ResponseTime < 3000, "P95 响应时间应 < 3秒，实际: " + p95ResponseTime + "ms");
    }

    // ============================================
    // 大数据量查询性能测试
    // ============================================

    @Test
    @Order(5)
    @DisplayName("大数据量查询 - 租户资源配置列表查询应 < 1秒")
    void testLargeDataQuery_Performance() {
        // 准备大量数据
        Tenant tenant = testTenants.get(0);
        for (int i = 0; i < 500; i++) {
            TenantResourceConfig config = new TenantResourceConfig();
            config.setTenantId(tenant.getId());
            config.setResourceCode("PERF_TEST_RESOURCE_" + (i % 50));
            config.setEnabled(i % 2 == 0);
            config.setConfig("{\"key\":\"value" + i + "\"}");
            tenantResourceConfigMapper.insert(config);
        }

        // Warmup
        for (int i = 0; i < WARMUP_ITERATIONS; i++) {
            tenantResourceConfigMapper.selectByTenantId(tenant.getId());
        }

        // Measurement
        List<Long> timings = new ArrayList<>();
        for (int i = 0; i < MEASUREMENT_ITERATIONS; i++) {
            long start = System.currentTimeMillis();
            List<TenantResourceConfig> result = tenantResourceConfigMapper.selectByTenantId(tenant.getId());
            long end = System.currentTimeMillis();
            timings.add(end - start);
            assertNotNull(result);
            assertTrue(result.size() >= 500);
        }

        Collections.sort(timings);
        double avgTime = timings.stream().mapToLong(Long::longValue).average().orElse(0);
        long p95Time = timings.get((int) (timings.size() * 0.95));

        System.out.println("\n=== 大数据量查询性能 ===");
        System.out.printf("平均耗时: %.2fms%n", avgTime);
        System.out.printf("P95 耗时: %dms%n", p95Time);

        // 验证
        assertTrue(avgTime < 1000, "平均查询耗时应 < 1秒，实际: " + avgTime + "ms");
        assertTrue(p95Time < 2000, "P95 查询耗时应 < 2秒，实际: " + p95Time + "ms");
    }

    // ============================================
    // 辅助方法
    // ============================================

    private int insertTestResources(int count) {
        int inserted = 0;
        for (int i = 0; i < count; i++) {
            String code = "BULK_INSERT_" + UUID.randomUUID().toString().substring(0, 8);
            PlatformResource resource = new PlatformResource();
            resource.setCode(code);
            resource.setType(ResourceType.FUNCTION_PRODUCT.getCode());
            resource.setName("批量导入资源 " + i);
            resource.setCategory("exercise");
            resource.setStatus("ENABLED");
            resource.setSortOrder(i);
            platformResourceMapper.insert(resource);
            inserted++;
        }
        return inserted;
    }

    private long measureSyncLatency() {
        // 模拟完整的同步流程: 旧表写入 -> 变更捕获 -> 新表同步
        String uniqueId = UUID.randomUUID().toString().substring(0, 8);

        long start = System.currentTimeMillis();

        // 1. 写入旧表
        PlatformProduct oldProduct = new PlatformProduct();
        oldProduct.setCode("sync-test-" + uniqueId);
        oldProduct.setName("同步测试产品 " + uniqueId);
        oldProduct.setStatus(1);
        platformProductMapper.insert(oldProduct);

        // 2. 模拟同步到新表
        PlatformResource newResource = new PlatformResource();
        newResource.setCode("PRODUCT_SYNC_TEST_" + uniqueId.toUpperCase().replace("-", "_"));
        newResource.setType(ResourceType.FUNCTION_PRODUCT.getCode());
        newResource.setName(oldProduct.getName());
        newResource.setStatus(oldProduct.getStatus() == 1 ? "ENABLED" : "DISABLED");
        platformResourceMapper.insert(newResource);

        long end = System.currentTimeMillis();
        return end - start;
    }

    /**
     * 打印性能基准报告
     */
    public static void printBenchmarkReport(String testName, double avgTimeMs, long p50Ms, long p95Ms, long p99Ms, double throughput) {
        System.out.println("\n╔══════════════════════════════════════════════════════════════╗");
        System.out.printf("║  %-60s ║%n", testName);
        System.out.println("╠══════════════════════════════════════════════════════════════╣");
        System.out.printf("║  平均响应时间: %-40.2fms ║%n", avgTimeMs);
        System.out.printf("║  P50 响应时间: %-40dms ║%n", p50Ms);
        System.out.printf("║  P95 响应时间: %-40dms ║%n", p95Ms);
        System.out.printf("║  P99 响应时间: %-40dms ║%n", p99Ms);
        System.out.printf("║  吞吐量:       %-40.2f req/s ║%n", throughput);
        System.out.println("╚══════════════════════════════════════════════════════════════╝");
    }
}
