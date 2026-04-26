package com.carbonpoint.mall.service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 商城报表服务接口。
 */
public interface MallReportService {

    /**
     * 获取兑换统计概览。
     *
     * @param tenantId 租户ID
     * @param startDate 开始日期（可选）
     * @param endDate   结束日期（可选）
     * @return 统计数据（totalOrders, totalPointsSpent, pendingCount, fulfilledCount, cancelledCount, expiredCount）
     */
    Map<String, Object> getExchangeStats(Long tenantId, LocalDate startDate, LocalDate endDate);

    /**
     * 获取积分消费趋势。
     *
     * @param tenantId    租户ID
     * @param granularity 粒度: daily / weekly / monthly
     * @param startDate   开始日期（可选）
     * @param endDate     结束日期（可选）
     * @return 消费趋势列表（date, pointsSpent, orderCount）
     */
    List<Map<String, Object>> getConsumptionTrend(Long tenantId, String granularity, LocalDate startDate, LocalDate endDate);

    /**
     * 获取商品热度排行。
     *
     * @param tenantId 租户ID
     * @param limit    排行数量
     * @param startDate 开始日期（可选）
     * @param endDate   结束日期（可选）
     * @return 商品排行列表（productId, productName, orderCount, pointsSpent）
     */
    List<Map<String, Object>> getProductPopularity(Long tenantId, int limit, LocalDate startDate, LocalDate endDate);
}
