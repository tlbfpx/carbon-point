package com.carbonpoint.system.controller;

import com.carbonpoint.common.result.Result;
import com.carbonpoint.system.dto.PlatformStats;
import com.carbonpoint.system.entity.Tenant;
import com.carbonpoint.system.mapper.TenantMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Platform statistics controller.
 * Provides aggregate stats for the platform dashboard.
 */
@RestController
@RequestMapping("/platform")
@RequiredArgsConstructor
public class PlatformStatsController {

    private final TenantMapper tenantMapper;
    private final DataSource dataSource;

    /**
     * Get platform-wide statistics.
     * GET /platform/stats
     */
    @GetMapping("/stats")
    public Result<PlatformStats> getStats() {
        List<Tenant> tenants = tenantMapper.selectAllForPlatform();

        int totalEnterprises = tenants.size();
        long activeEnterprises = tenants.stream().filter(t -> "active".equals(t.getStatus())).count();

        long totalUsers = 0;
        long totalPoints = 0;
        long totalExchanges = 0;

        try (Connection conn = dataSource.getConnection()) {
            try (PreparedStatement stmt = conn.prepareStatement("SELECT COUNT(*) FROM users");
                 ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) totalUsers = rs.getLong(1);
            }
            try (PreparedStatement stmt = conn.prepareStatement(
                     "SELECT COALESCE(SUM(amount), 0) FROM point_transactions WHERE amount > 0");
                 ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) totalPoints = rs.getLong(1);
            }
            try (PreparedStatement stmt = conn.prepareStatement(
                     "SELECT COUNT(*) FROM exchange_orders WHERE order_status = 'fulfilled'");
                 ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) totalExchanges = rs.getLong(1);
            }
        } catch (Exception e) {
            // Return 0 for stats on error
        }

        PlatformStats stats = new PlatformStats();
        stats.setTotalEnterprises(totalEnterprises);
        stats.setActiveEnterprises((int) activeEnterprises);
        stats.setTotalUsers((int) totalUsers);
        stats.setTotalPoints((int) totalPoints);
        stats.setTotalExchanges((int) totalExchanges);
        return Result.success(stats);
    }

    /**
     * Get enterprise ranking by user count.
     * GET /platform/enterprise-ranking
     */
    @GetMapping("/enterprise-ranking")
    public Result<List<Map<String, Object>>> getEnterpriseRanking(@RequestParam(defaultValue = "10") int limit) {
        List<Map<String, Object>> result = new ArrayList<>();
        try (Connection conn = dataSource.getConnection();
             PreparedStatement stmt = conn.prepareStatement(
                     "SELECT t.id, t.name, COUNT(DISTINCT u.id) AS user_count, " +
                     "COALESCE(SUM(CASE WHEN pt.amount > 0 THEN pt.amount ELSE 0 END), 0) AS total_points, " +
                     "COUNT(DISTINCT cir.id) AS total_checkins, " +
                     "COUNT(DISTINCT DATE(cir.checkin_date)) AS active_days " +
                     "FROM tenants t " +
                     "LEFT JOIN users u ON u.tenant_id = t.id " +
                     "LEFT JOIN point_transactions pt ON pt.user_id = u.id " +
                     "LEFT JOIN check_in_records cir ON cir.user_id = u.id " +
                     "GROUP BY t.id, t.name " +
                     "ORDER BY total_points DESC, user_count DESC " +
                     "LIMIT ?")) {
            stmt.setInt(1, limit);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", String.valueOf(rs.getLong("id")));
                    row.put("name", rs.getString("name"));
                    row.put("userCount", rs.getInt("user_count"));
                    row.put("totalPoints", rs.getInt("total_points"));
                    row.put("totalCheckIns", rs.getInt("total_checkins"));
                    row.put("activeDays", rs.getInt("active_days"));
                    result.add(row);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            // Return empty list on error
        }
        return Result.success(result);
    }

    /**
     * Get platform trend data over time.
     * GET /platform/platform-trend
     */
    @GetMapping("/platform-trend")
    public Result<List<Map<String, Object>>> getPlatformTrend(
            @RequestParam(defaultValue = "day") String dimension,
            @RequestParam(defaultValue = "30") int limit) {
        List<Map<String, Object>> result = new ArrayList<>();
        LocalDate today = LocalDate.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        try (Connection conn = dataSource.getConnection()) {
            for (int i = limit - 1; i >= 0; i--) {
                LocalDate date = today.minusDays(i);
                String dateStr = date.format(formatter);

                if ("week".equals(dimension)) {
                    // For week dimension, group by week
                    date = date.minusDays(date.getDayOfWeek().getValue() - 1);
                } else if ("month".equals(dimension)) {
                    // For month dimension, group by month
                    date = date.withDayOfMonth(1);
                }

                final String finalDateStr = date.format(formatter);

                // Check if we already have this date in result
                boolean exists = result.stream().anyMatch(r -> finalDateStr.equals(r.get("date")));
                if (exists) continue;

                Map<String, Object> row = new LinkedHashMap<>();
                row.put("date", finalDateStr);

                // Get enterprises created on or before this date (cumulative)
                try (PreparedStatement stmt = conn.prepareStatement(
                        "SELECT COUNT(*) FROM tenants WHERE DATE(created_at) <= ?")) {
                    stmt.setString(1, finalDateStr);
                    try (ResultSet rs = stmt.executeQuery()) {
                        if (rs.next()) row.put("enterprises", rs.getInt(1));
                        else row.put("enterprises", 0);
                    }
                }

                // Get users created on this date (not cumulative)
                try (PreparedStatement stmt = conn.prepareStatement(
                        "SELECT COUNT(*) FROM users WHERE DATE(created_at) = ?")) {
                    stmt.setString(1, finalDateStr);
                    try (ResultSet rs = stmt.executeQuery()) {
                        if (rs.next()) row.put("users", rs.getInt(1));
                        else row.put("users", 0);
                    }
                }

                // Get points granted on this date
                try (PreparedStatement stmt = conn.prepareStatement(
                        "SELECT COALESCE(SUM(amount), 0) FROM point_transactions WHERE amount > 0 AND DATE(created_at) = ?")) {
                    stmt.setString(1, finalDateStr);
                    try (ResultSet rs = stmt.executeQuery()) {
                        if (rs.next()) row.put("pointsGranted", rs.getInt(1));
                        else row.put("pointsGranted", 0);
                    }
                }

                // Get points consumed on this date
                try (PreparedStatement stmt = conn.prepareStatement(
                        "SELECT COALESCE(SUM(ABS(amount)), 0) FROM point_transactions WHERE amount < 0 AND DATE(created_at) = ?")) {
                    stmt.setString(1, finalDateStr);
                    try (ResultSet rs = stmt.executeQuery()) {
                        if (rs.next()) row.put("pointsConsumed", rs.getInt(1));
                        else row.put("pointsConsumed", 0);
                    }
                }

                // Get exchanges on this date
                try (PreparedStatement stmt = conn.prepareStatement(
                        "SELECT COUNT(*) FROM exchange_orders WHERE DATE(created_at) = ?")) {
                    stmt.setString(1, finalDateStr);
                    try (ResultSet rs = stmt.executeQuery()) {
                        if (rs.next()) row.put("exchanges", rs.getInt(1));
                        else row.put("exchanges", 0);
                    }
                }

                result.add(row);
            }
        } catch (Exception e) {
            e.printStackTrace();
            // Return empty list on error
        }
        return Result.success(result);
    }
}
