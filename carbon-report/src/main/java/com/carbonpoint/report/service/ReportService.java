package com.carbonpoint.report.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.checkin.entity.CheckInRecordEntity;
import com.carbonpoint.checkin.mapper.CheckInRecordMapper;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.mall.entity.ExchangeOrder;
import com.carbonpoint.mall.mapper.ExchangeOrderMapper;
import com.carbonpoint.mall.entity.Product;
import com.carbonpoint.mall.mapper.ProductMapper;
import com.carbonpoint.common.entity.PointTransactionEntity;
import com.carbonpoint.common.mapper.PointTransactionMapper;
import com.carbonpoint.report.dto.EnterpriseDashboardDTO;
import com.carbonpoint.report.dto.PlatformDashboardDTO;
import com.carbonpoint.report.dto.PointTrendDTO;
import com.carbonpoint.system.entity.Tenant;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.mapper.TenantMapper;
import com.carbonpoint.system.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import jakarta.servlet.http.HttpServletResponse;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private final CheckInRecordMapper checkInRecordMapper;
    private final PointTransactionMapper pointTransactionMapper;
    private final ExchangeOrderMapper exchangeOrderMapper;
    private final ProductMapper productMapper;
    private final TenantMapper tenantMapper;
    private final UserMapper userMapper;

    public EnterpriseDashboardDTO getEnterpriseDashboard(Long tenantId) {
        EnterpriseDashboardDTO dto = new EnterpriseDashboardDTO();
        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        
        // Today check-in count
        LocalDateTime todayStart = today.atStartOfDay();
        LocalDateTime todayEnd = today.atTime(LocalTime.MAX);
        Long todayCheckin = checkInRecordMapper.selectCount(
            new LambdaQueryWrapper<CheckInRecordEntity>()
                .eq(CheckInRecordEntity::getTenantId, tenantId)
                .ge(CheckInRecordEntity::getCheckinDate, today)
                .le(CheckInRecordEntity::getCheckinDate, today)
        );
        dto.setTodayCheckinCount(todayCheckin != null ? todayCheckin.intValue() : 0);

         // Today points issued
         List<PointTransactionEntity> todayTxs = pointTransactionMapper.selectList(
             new LambdaQueryWrapper<PointTransactionEntity>()
                 .eq(PointTransactionEntity::getTenantId, tenantId)
                 .ge(PointTransactionEntity::getCreatedAt, todayStart)
                 .le(PointTransactionEntity::getCreatedAt, todayEnd)
                 .in(PointTransactionEntity::getType, Arrays.asList("check_in", "streak_bonus"))
         );
         int todayPoints = todayTxs.stream().filter(tx -> tx.getAmount() != null && tx.getAmount() > 0).mapToInt(tx -> (int) tx.getAmount()).sum();
         dto.setTodayPointsIssued(todayPoints);

        // Week trend
        List<EnterpriseDashboardDTO.DailyTrend> weekTrend = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            LocalDate date = weekStart.plusDays(i);
            LocalDateTime dayStart = date.atStartOfDay();
            LocalDateTime dayEnd = date.atTime(LocalTime.MAX);

            Long dayCheckin = checkInRecordMapper.selectCount(
                new LambdaQueryWrapper<CheckInRecordEntity>()
                    .eq(CheckInRecordEntity::getTenantId, tenantId)
                    .eq(CheckInRecordEntity::getCheckinDate, date)
            );

            List<PointTransactionEntity> dayTxs = pointTransactionMapper.selectList(
                new LambdaQueryWrapper<PointTransactionEntity>()
                    .eq(PointTransactionEntity::getTenantId, tenantId)
                    .ge(PointTransactionEntity::getCreatedAt, dayStart)
                    .le(PointTransactionEntity::getCreatedAt, dayEnd)
                    .in(PointTransactionEntity::getType, Arrays.asList("check_in", "streak_bonus"))
            );
             int dayPoints = dayTxs.stream().filter(tx -> tx.getAmount() != null && tx.getAmount() > 0).mapToInt(tx -> (int) tx.getAmount()).sum();

            EnterpriseDashboardDTO.DailyTrend trend = new EnterpriseDashboardDTO.DailyTrend();
            trend.setDate(date.toString());
            trend.setCheckinCount(dayCheckin != null ? dayCheckin.intValue() : 0);
            trend.setPointsIssued(dayPoints);
            weekTrend.add(trend);
        }
        dto.setWeekTrend(weekTrend);

        // Active users this week (distinct users with check-ins this week)
        List<CheckInRecordEntity> weekRecords = checkInRecordMapper.selectList(
            new LambdaQueryWrapper<CheckInRecordEntity>()
                .eq(CheckInRecordEntity::getTenantId, tenantId)
                .ge(CheckInRecordEntity::getCheckinDate, weekStart)
        );
        long activeWeek = weekRecords.stream().map(CheckInRecordEntity::getUserId).distinct().count();
        dto.setActiveUsersWeek((int) activeWeek);

        // Active users this month
        LocalDate monthStart = today.withDayOfMonth(1);
        List<CheckInRecordEntity> monthRecords = checkInRecordMapper.selectList(
            new LambdaQueryWrapper<CheckInRecordEntity>()
                .eq(CheckInRecordEntity::getTenantId, tenantId)
                .ge(CheckInRecordEntity::getCheckinDate, monthStart)
        );
        long activeMonth = monthRecords.stream().map(CheckInRecordEntity::getUserId).distinct().count();
        dto.setActiveUsersMonth((int) activeMonth);

        // Top 10 products by exchange count
        List<ExchangeOrder> fulfilledOrders = exchangeOrderMapper.selectList(
            new LambdaQueryWrapper<ExchangeOrder>()
                .eq(ExchangeOrder::getTenantId, tenantId)
                .eq(ExchangeOrder::getOrderStatus, "fulfilled")
        );
        
        Map<Long, Long> productCount = fulfilledOrders.stream()
            .collect(Collectors.groupingBy(ExchangeOrder::getProductId, Collectors.counting()));
        
        List<Map.Entry<Long, Long>> sorted = productCount.entrySet().stream()
            .sorted(Map.Entry.<Long, Long>comparingByValue().reversed())
            .limit(10)
            .collect(Collectors.toList());
        
        List<EnterpriseDashboardDTO.ProductExchangeDTO> topProducts = new ArrayList<>();
        for (Map.Entry<Long, Long> entry : sorted) {
            EnterpriseDashboardDTO.ProductExchangeDTO pd = new EnterpriseDashboardDTO.ProductExchangeDTO();
            pd.setProductId(entry.getKey());
            Product product = productMapper.selectById(entry.getKey());
            pd.setProductName(product != null ? product.getName() : "未知商品");
            pd.setExchangeCount(entry.getValue().intValue());
            topProducts.add(pd);
        }
        dto.setTopProducts(topProducts);

        return dto;
    }

    public PlatformDashboardDTO getPlatformDashboard() {
        PlatformDashboardDTO dto = new PlatformDashboardDTO();

        // Total tenants
        Long totalTenants = tenantMapper.selectCount(null);
        dto.setTotalTenants(totalTenants != null ? totalTenants.intValue() : 0);

        // Active tenants (tenants with users active in last 30 days)
        LocalDateTime thirtyDaysAgo = LocalDate.now().minusDays(30).atStartOfDay();
        List<User> recentUsers = userMapper.selectList(
            new LambdaQueryWrapper<User>()
                .ge(User::getUpdatedAt, thirtyDaysAgo)
        );
        long uniqueTenants = recentUsers.stream().map(User::getTenantId).distinct().count();
        dto.setActiveTenants((int) uniqueTenants);

        // Total users
        Long totalUsers = userMapper.selectCount(null);
        dto.setTotalUsers(totalUsers != null ? totalUsers.intValue() : 0);

        // Total points issued
        List<PointTransactionEntity> allIssued = pointTransactionMapper.selectList(
            new LambdaQueryWrapper<PointTransactionEntity>()
                .in(PointTransactionEntity::getType, Arrays.asList("check_in", "streak_bonus", "manual_add"))
        );
        long totalIssued = allIssued.stream().mapToLong(PointTransactionEntity::getAmount).filter(a -> a > 0).sum();
        dto.setTotalPointsIssued(totalIssued);

        // Total points exchanged
        List<PointTransactionEntity> allExchanged = pointTransactionMapper.selectList(
            new LambdaQueryWrapper<PointTransactionEntity>()
                .eq(PointTransactionEntity::getType, "exchange")
        );
        long totalExchanged = allExchanged.stream().mapToLong(tx -> Math.abs(tx.getAmount())).sum();
        dto.setTotalPointsExchanged(totalExchanged);

        // Total exchange orders
        Long totalOrders = exchangeOrderMapper.selectCount(null);
        dto.setTotalExchangeOrders(totalOrders != null ? totalOrders.intValue() : 0);

        // Tenant ranking by total points
        List<User> allUsers = userMapper.selectList(null);
        Map<Long, Long> tenantPoints = allUsers.stream()
            .collect(Collectors.groupingBy(User::getTenantId, Collectors.summingLong(u -> u.getTotalPoints() != null ? u.getTotalPoints() : 0)));
        Map<Long, Long> tenantUserCount = allUsers.stream()
            .collect(Collectors.groupingBy(User::getTenantId, Collectors.counting()));
        
        List<Map.Entry<Long, Long>> ranked = tenantPoints.entrySet().stream()
            .sorted(Map.Entry.<Long, Long>comparingByValue().reversed())
            .limit(20)
            .collect(Collectors.toList());
        
        List<PlatformDashboardDTO.TenantRankDTO> ranking = new ArrayList<>();
        for (Map.Entry<Long, Long> entry : ranked) {
            PlatformDashboardDTO.TenantRankDTO rd = new PlatformDashboardDTO.TenantRankDTO();
            rd.setTenantId(entry.getKey());
            Tenant tenant = tenantMapper.selectById(entry.getKey());
            rd.setTenantName(tenant != null ? tenant.getName() : "未知企业");
            rd.setUserCount(tenantUserCount.getOrDefault(entry.getKey(), 0L).intValue());
            rd.setTotalPoints(entry.getValue());
            ranking.add(rd);
        }
        dto.setTenantRanking(ranking);

        return dto;
    }

    public PointTrendDTO getPointTrend(Long tenantId, String dimension, LocalDate start, LocalDate end) {
        PointTrendDTO dto = new PointTrendDTO();
        dto.setDimension(dimension);
        
        List<PointTrendDTO.TrendPoint> series = new ArrayList<>();
        LocalDate current = start;
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        
        while (!current.isAfter(end)) {
            LocalDate periodStart;
            LocalDate periodEnd;
            String periodLabel;
            
            switch (dimension) {
                case "week":
                    periodStart = current;
                    periodEnd = current.plusDays(6);
                    periodLabel = current.format(fmt) + " ~ " + periodEnd.format(fmt);
                    current = current.plusWeeks(1);
                    break;
                case "month":
                    periodStart = current.withDayOfMonth(1);
                    periodEnd = current.with(TemporalAdjusters.lastDayOfMonth());
                    periodLabel = current.format(DateTimeFormatter.ofPattern("yyyy-MM"));
                    current = current.plusMonths(1);
                    break;
                default: // day
                    periodStart = current;
                    periodEnd = current;
                    periodLabel = current.format(fmt);
                    current = current.plusDays(1);
            }
            
            LocalDateTime ps = periodStart.atStartOfDay();
            LocalDateTime pe = periodEnd.atTime(LocalTime.MAX);
            
            LambdaQueryWrapper<PointTransactionEntity> qw = new LambdaQueryWrapper<PointTransactionEntity>()
                .eq(tenantId != null, PointTransactionEntity::getTenantId, tenantId)
                .ge(PointTransactionEntity::getCreatedAt, ps)
                .le(PointTransactionEntity::getCreatedAt, pe);
            
            List<PointTransactionEntity> txs = pointTransactionMapper.selectList(qw);
            
            long issued = txs.stream().mapToLong(PointTransactionEntity::getAmount).filter(a -> a > 0).sum();
            long consumed = txs.stream().mapToLong(tx -> Math.abs(tx.getAmount())).filter(a -> a > 0).sum();
            
            PointTrendDTO.TrendPoint tp = new PointTrendDTO.TrendPoint();
            tp.setPeriod(periodLabel);
            tp.setIssued(issued);
            tp.setConsumed(consumed);
            series.add(tp);
        }
        
        dto.setSeries(series);
        return dto;
    }

    public void exportReport(Long tenantId, String type, HttpServletResponse response) {
        try {
            Workbook workbook = new XSSFWorkbook();
            Sheet sheet = workbook.createSheet("报表数据");
            
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);
            
            if ("transactions".equals(type)) {
                exportTransactions(sheet, headerStyle, tenantId);
            } else if ("orders".equals(type)) {
                exportOrders(sheet, headerStyle, tenantId);
            } else if ("users".equals(type)) {
                exportUsers(sheet, headerStyle, tenantId);
            }
            
            response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            response.setHeader("Content-Disposition", 
                "attachment;filename=" + URLEncoder.encode(type + "_report.xlsx", StandardCharsets.UTF_8));
            workbook.write(response.getOutputStream());
            workbook.close();
            log.info("exportReport: type={}, tenantId={}", type, tenantId);
        } catch (Exception e) {
            log.error("exportReport failed", e);
            throw new BusinessException(ErrorCode.REPORT_EXPORT_FAILED);
        }
    }

    private void exportTransactions(Sheet sheet, CellStyle headerStyle, Long tenantId) {
        Row header = sheet.createRow(0);
        String[] cols = {"序号", "用户ID", "积分变动", "类型", "变动后余额", "备注", "时间"};
        for (int i = 0; i < cols.length; i++) {
            Cell cell = header.createCell(i);
            cell.setCellValue(cols[i]);
            cell.setCellStyle(headerStyle);
        }
        
        List<PointTransactionEntity> txs = pointTransactionMapper.selectList(
            new LambdaQueryWrapper<PointTransactionEntity>()
                .eq(tenantId != null, PointTransactionEntity::getTenantId, tenantId)
                .orderByDesc(PointTransactionEntity::getCreatedAt)
                .last("LIMIT 10000")
        );
        
        int rowNum = 1;
        for (PointTransactionEntity tx : txs) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(rowNum - 1);
            row.createCell(1).setCellValue(tx.getUserId());
            row.createCell(2).setCellValue(tx.getAmount());
            row.createCell(3).setCellValue(tx.getType());
            row.createCell(4).setCellValue(tx.getBalanceAfter());
            row.createCell(5).setCellValue(tx.getRemark() != null ? tx.getRemark() : "");
            row.createCell(6).setCellValue(tx.getCreatedAt() != null ? tx.getCreatedAt().toString() : "");
        }
        
        for (int i = 0; i < cols.length; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private void exportOrders(Sheet sheet, CellStyle headerStyle, Long tenantId) {
        Row header = sheet.createRow(0);
        String[] cols = {"序号", "订单ID", "用户ID", "商品名称", "积分", "状态", "创建时间"};
        for (int i = 0; i < cols.length; i++) {
            Cell cell = header.createCell(i);
            cell.setCellValue(cols[i]);
            cell.setCellStyle(headerStyle);
        }
        
        List<ExchangeOrder> orders = exchangeOrderMapper.selectList(
            new LambdaQueryWrapper<ExchangeOrder>()
                .eq(tenantId != null, ExchangeOrder::getTenantId, tenantId)
                .orderByDesc(ExchangeOrder::getCreatedAt)
                .last("LIMIT 10000")
        );
        
        int rowNum = 1;
        for (ExchangeOrder order : orders) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(rowNum - 1);
            row.createCell(1).setCellValue(order.getId());
            row.createCell(2).setCellValue(order.getUserId());
            row.createCell(3).setCellValue(order.getProductName() != null ? order.getProductName() : "");
            row.createCell(4).setCellValue(order.getPointsSpent());
            row.createCell(5).setCellValue(order.getOrderStatus());
            row.createCell(6).setCellValue(order.getCreatedAt() != null ? order.getCreatedAt().toString() : "");
        }
        
        for (int i = 0; i < cols.length; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private void exportUsers(Sheet sheet, CellStyle headerStyle, Long tenantId) {
        Row header = sheet.createRow(0);
        String[] cols = {"序号", "用户ID", "昵称", "累计积分", "可用积分", "冻结积分", "等级", "连续打卡天数"};
        for (int i = 0; i < cols.length; i++) {
            Cell cell = header.createCell(i);
            cell.setCellValue(cols[i]);
            cell.setCellStyle(headerStyle);
        }
        
        LambdaQueryWrapper<User> qw = new LambdaQueryWrapper<User>();
        if (tenantId != null) {
            qw.eq(User::getTenantId, tenantId);
        }
        qw.orderByDesc(User::getTotalPoints);
        List<User> users = userMapper.selectList(qw.last("LIMIT 10000"));
        
        int rowNum = 1;
        for (User user : users) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(rowNum - 1);
            row.createCell(1).setCellValue(user.getId());
            row.createCell(2).setCellValue(user.getNickname() != null ? user.getNickname() : "");
            row.createCell(3).setCellValue(user.getTotalPoints() != null ? user.getTotalPoints() : 0);
            row.createCell(4).setCellValue(user.getAvailablePoints() != null ? user.getAvailablePoints() : 0);
            row.createCell(5).setCellValue(user.getFrozenPoints() != null ? user.getFrozenPoints() : 0);
            row.createCell(6).setCellValue(user.getLevel() != null ? user.getLevel() : 1);
            row.createCell(7).setCellValue(user.getConsecutiveDays() != null ? user.getConsecutiveDays() : 0);
        }
        
        for (int i = 0; i < cols.length; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    /**
     * Dashboard stats summary for the frontend Dashboard component.
     */
    public Map<String, Object> getDashboardStats(Long tenantId) {
        LocalDate today = LocalDate.now();
        LocalDateTime todayStart = today.atStartOfDay();
        LocalDateTime todayEnd = today.atTime(LocalTime.MAX);
        LocalDate weekStart = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate monthStart = today.withDayOfMonth(1);

        // Today check-in count (use checkinDate for correctness)
        Long todayCheckin = checkInRecordMapper.selectCount(
            new LambdaQueryWrapper<CheckInRecordEntity>()
                .eq(CheckInRecordEntity::getTenantId, tenantId)
                .ge(CheckInRecordEntity::getCheckinDate, today)
                .le(CheckInRecordEntity::getCheckinDate, today)
        );

        // Today points issued
        List<PointTransactionEntity> todayTxs = pointTransactionMapper.selectList(
            new LambdaQueryWrapper<PointTransactionEntity>()
                .eq(PointTransactionEntity::getTenantId, tenantId)
                .ge(PointTransactionEntity::getCreatedAt, todayStart)
                .le(PointTransactionEntity::getCreatedAt, todayEnd)
                .in(PointTransactionEntity::getType, Arrays.asList("check_in", "streak_bonus"))
        );
         int todayPoints = todayTxs.stream().filter(tx -> tx.getAmount() != null && tx.getAmount() > 0).mapToInt(tx -> (int) tx.getAmount()).sum();

        // Active users this month (distinct users with check-in records)
        List<CheckInRecordEntity> monthRecords = checkInRecordMapper.selectList(
            new LambdaQueryWrapper<CheckInRecordEntity>()
                .eq(CheckInRecordEntity::getTenantId, tenantId)
                .ge(CheckInRecordEntity::getCheckinDate, monthStart)
        );
        long activeUsersMonth = monthRecords.stream().map(CheckInRecordEntity::getUserId).distinct().count();

        // Month exchange count (fulfilled orders)
        Long monthExchangeCount = exchangeOrderMapper.selectCount(
            new LambdaQueryWrapper<ExchangeOrder>()
                .eq(ExchangeOrder::getTenantId, tenantId)
                .eq(ExchangeOrder::getOrderStatus, "fulfilled")
                .ge(ExchangeOrder::getFulfilledAt, monthStart.atStartOfDay())
        );

        Map<String, Object> stats = new HashMap<>();
        stats.put("todayCheckInCount", todayCheckin != null ? todayCheckin.intValue() : 0);
        stats.put("todayPointsGranted", todayPoints);
        stats.put("activeUsers", (int) activeUsersMonth);
        stats.put("monthExchangeCount", monthExchangeCount != null ? monthExchangeCount.intValue() : 0);
        return stats;
    }

    /**
     * Daily check-in trend for the last N days.
     */
    public List<Map<String, Object>> getCheckInTrend(Long tenantId, int days) {
        LocalDate today = LocalDate.now();
        List<Map<String, Object>> trend = new ArrayList<>();
        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            Long count = checkInRecordMapper.selectCount(
                new LambdaQueryWrapper<CheckInRecordEntity>()
                    .eq(CheckInRecordEntity::getTenantId, tenantId)
                    .eq(CheckInRecordEntity::getCheckinDate, date)
            );
            Map<String, Object> point = new HashMap<>();
            point.put("date", date.toString());
            point.put("count", count != null ? count.intValue() : 0);
            trend.add(point);
        }
        return trend;
    }

    /**
     * Points trend (granted vs consumed) for the last N days.
     */
    public List<Map<String, Object>> getPointsTrend(Long tenantId, int days) {
        LocalDate today = LocalDate.now();
        List<Map<String, Object>> trend = new ArrayList<>();
        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            LocalDateTime dayStart = date.atStartOfDay();
            LocalDateTime dayEnd = date.atTime(LocalTime.MAX);

            List<PointTransactionEntity> dayTxs = pointTransactionMapper.selectList(
                new LambdaQueryWrapper<PointTransactionEntity>()
                    .eq(PointTransactionEntity::getTenantId, tenantId)
                    .ge(PointTransactionEntity::getCreatedAt, dayStart)
                    .le(PointTransactionEntity::getCreatedAt, dayEnd)
            );

            long granted = dayTxs.stream()
                .filter(tx -> tx.getAmount() != null && tx.getAmount() > 0)
                .mapToLong(tx -> (long) tx.getAmount())
                .sum();
            long consumed = dayTxs.stream()
                .filter(tx -> tx.getAmount() != null && tx.getAmount() < 0)
                .mapToLong(tx -> Math.abs((long) tx.getAmount()))
                .sum();

            Map<String, Object> point = new HashMap<>();
            point.put("date", date.toString());
            point.put("granted", granted);
            point.put("consumed", consumed);
            trend.add(point);
        }
        return trend;
    }

    /**
     * Top exchanged products.
     */
    public List<Map<String, Object>> getHotProducts(Long tenantId, int limit) {
        LocalDate monthStart = LocalDate.now().withDayOfMonth(1);

        // Get fulfilled orders in current month
        List<ExchangeOrder> fulfilledOrders = exchangeOrderMapper.selectList(
            new LambdaQueryWrapper<ExchangeOrder>()
                .eq(ExchangeOrder::getTenantId, tenantId)
                .eq(ExchangeOrder::getOrderStatus, "fulfilled")
                .ge(ExchangeOrder::getFulfilledAt, monthStart.atStartOfDay())
        );

        // Group by product and count
        Map<Long, List<ExchangeOrder>> byProduct = fulfilledOrders.stream()
            .collect(Collectors.groupingBy(ExchangeOrder::getProductId));

        return byProduct.entrySet().stream()
            .sorted((a, b) -> Integer.compare(b.getValue().size(), a.getValue().size()))
            .limit(limit)
            .map(entry -> {
                Long productId = entry.getKey();
                List<ExchangeOrder> orders = entry.getValue();
                Product product = productMapper.selectById(productId);
                Map<String, Object> item = new HashMap<>();
                item.put("productId", productId.toString());
                item.put("productName", product != null ? product.getName() : "未知商品");
                item.put("exchangeCount", orders.size());
                 item.put("totalPoints", orders.stream()
                     .filter(o -> o.getPointsSpent() != null)
                     .mapToInt(o -> (int) o.getPointsSpent())
                     .sum());
                return item;
            })
            .collect(Collectors.toList());
    }
}
