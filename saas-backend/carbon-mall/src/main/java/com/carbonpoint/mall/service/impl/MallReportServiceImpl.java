package com.carbonpoint.mall.service.impl;

import com.carbonpoint.mall.service.MallReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

/**
 * 商城报表服务实现。
 */
@Service
@RequiredArgsConstructor
public class MallReportServiceImpl implements MallReportService {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public Map<String, Object> getExchangeStats(Long tenantId, LocalDate startDate, LocalDate endDate) {
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT COUNT(*) AS totalOrders, ");
        sql.append("COALESCE(SUM(points_spent), 0) AS totalPointsSpent, ");
        sql.append("SUM(CASE WHEN order_status = 'pending' THEN 1 ELSE 0 END) AS pendingCount, ");
        sql.append("SUM(CASE WHEN order_status = 'fulfilled' THEN 1 ELSE 0 END) AS fulfilledCount, ");
        sql.append("SUM(CASE WHEN order_status = 'used' THEN 1 ELSE 0 END) AS usedCount, ");
        sql.append("SUM(CASE WHEN order_status = 'cancelled' THEN 1 ELSE 0 END) AS cancelledCount, ");
        sql.append("SUM(CASE WHEN order_status = 'expired' THEN 1 ELSE 0 END) AS expiredCount ");
        sql.append("FROM exchange_orders WHERE tenant_id = ? AND deleted = 0");

        List<Object> params = new ArrayList<>();
        params.add(tenantId);

        if (startDate != null) {
            sql.append(" AND created_at >= ?");
            params.add(startDate.atStartOfDay());
        }
        if (endDate != null) {
            sql.append(" AND created_at <= ?");
            params.add(endDate.atTime(LocalTime.MAX));
        }

        return jdbcTemplate.queryForMap(sql.toString(), params.toArray());
    }

    @Override
    public List<Map<String, Object>> getConsumptionTrend(Long tenantId, String granularity, LocalDate startDate, LocalDate endDate) {
        // Default date range: last 30 days
        if (startDate == null) {
            startDate = LocalDate.now().minusDays(30);
        }
        if (endDate == null) {
            endDate = LocalDate.now();
        }

        String dateFormat;
        switch (granularity) {
            case "weekly":
                dateFormat = "%Y-W%v";
                break;
            case "monthly":
                dateFormat = "%Y-%m";
                break;
            default:
                dateFormat = "%Y-%m-%d";
                break;
        }

        String sql = "SELECT DATE_FORMAT(created_at, '" + dateFormat + "') AS period, " +
                "COUNT(*) AS orderCount, " +
                "COALESCE(SUM(points_spent), 0) AS pointsSpent " +
                "FROM exchange_orders " +
                "WHERE tenant_id = ? AND deleted = 0 " +
                "AND order_status NOT IN ('cancelled') " +
                "AND created_at >= ? AND created_at <= ? " +
                "GROUP BY period ORDER BY period ASC";

        return jdbcTemplate.queryForList(sql,
                tenantId,
                startDate.atStartOfDay(),
                endDate.atTime(LocalTime.MAX));
    }

    @Override
    public List<Map<String, Object>> getProductPopularity(Long tenantId, int limit, LocalDate startDate, LocalDate endDate) {
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT product_id AS productId, product_name AS productName, product_type AS productType, ");
        sql.append("COUNT(*) AS orderCount, COALESCE(SUM(points_spent), 0) AS pointsSpent ");
        sql.append("FROM exchange_orders WHERE tenant_id = ? AND deleted = 0 ");
        sql.append("AND order_status NOT IN ('cancelled') ");

        List<Object> params = new ArrayList<>();
        params.add(tenantId);

        if (startDate != null) {
            sql.append("AND created_at >= ? ");
            params.add(startDate.atStartOfDay());
        }
        if (endDate != null) {
            sql.append("AND created_at <= ? ");
            params.add(endDate.atTime(LocalTime.MAX));
        }

        sql.append("GROUP BY product_id, product_name, product_type ");
        sql.append("ORDER BY orderCount DESC LIMIT ?");
        params.add(Math.min(limit, 100));

        return jdbcTemplate.queryForList(sql.toString(), params.toArray());
    }
}
