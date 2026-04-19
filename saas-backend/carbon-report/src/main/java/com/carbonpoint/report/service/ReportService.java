package com.carbonpoint.report.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.stair.entity.CheckInRecordEntity;
import com.carbonpoint.stair.mapper.CheckInRecordMapper;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.mall.entity.ExchangeOrder;
import com.carbonpoint.mall.mapper.ExchangeOrderMapper;
import com.carbonpoint.mall.entity.Product;
import com.carbonpoint.mall.mapper.MallProductMapper;
import com.carbonpoint.common.entity.PointTransactionEntity;
import com.carbonpoint.common.mapper.PointTransactionMapper;
import com.carbonpoint.report.dto.CrossProductOverviewDTO;
import com.carbonpoint.report.dto.EnterpriseDashboardDTO;
import com.carbonpoint.report.dto.PlatformDashboardDTO;
import com.carbonpoint.report.dto.PointTrendDTO;
import com.carbonpoint.report.dto.ProductPointStatsDTO;
import com.carbonpoint.report.dto.WalkingStatsDTO;
import com.carbonpoint.system.entity.Tenant;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.mapper.TenantMapper;
import com.carbonpoint.system.mapper.UserMapper;
import com.carbonpoint.walking.entity.StepDailyRecordEntity;
import com.carbonpoint.walking.mapper.StepDailyRecordMapper;
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
    private final MallProductMapper productMapper;
    private final TenantMapper tenantMapper;
    private final UserMapper userMapper;
    private final StepDailyRecordMapper stepDailyRecordMapper;

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
        QueryWrapper<User> activeTenantsWrapper = new QueryWrapper<>();
        activeTenantsWrapper.select("COUNT(DISTINCT tenant_id) as cnt")
                .ge("updated_at", thirtyDaysAgo);
        List<Map<String, Object>> activeTenantsResult = userMapper.selectMaps(activeTenantsWrapper);
        int uniqueTenants = activeTenantsResult.isEmpty() ? 0 :
                ((Number) activeTenantsResult.get(0).getOrDefault("cnt", 0)).intValue();
        dto.setActiveTenants(uniqueTenants);

        // Total users
        Long totalUsers = userMapper.selectCount(null);
        dto.setTotalUsers(totalUsers != null ? totalUsers.intValue() : 0);

        // Total points issued (aggregate SUM)
        QueryWrapper<PointTransactionEntity> issuedWrapper = new QueryWrapper<>();
        issuedWrapper.select("COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total")
                .in("type", Arrays.asList("check_in", "streak_bonus", "manual_add"));
        List<Map<String, Object>> issuedResult = pointTransactionMapper.selectMaps(issuedWrapper);
        long totalIssued = issuedResult.isEmpty() ? 0 :
                ((Number) issuedResult.get(0).getOrDefault("total", 0)).longValue();
        dto.setTotalPointsIssued(totalIssued);

        // Total points exchanged (aggregate SUM)
        QueryWrapper<PointTransactionEntity> exchangedWrapper = new QueryWrapper<>();
        exchangedWrapper.select("COALESCE(SUM(ABS(amount)), 0) as total")
                .eq("type", "exchange");
        List<Map<String, Object>> exchangedResult = pointTransactionMapper.selectMaps(exchangedWrapper);
        long totalExchanged = exchangedResult.isEmpty() ? 0 :
                ((Number) exchangedResult.get(0).getOrDefault("total", 0)).longValue();
        dto.setTotalPointsExchanged(totalExchanged);

        // Total exchange orders
        Long totalOrders = exchangeOrderMapper.selectCount(null);
        dto.setTotalExchangeOrders(totalOrders != null ? totalOrders.intValue() : 0);

        // Tenant ranking by total points (aggregate query)
        QueryWrapper<User> tenantRankWrapper = new QueryWrapper<>();
        tenantRankWrapper.select("tenant_id", "COUNT(*) as user_count",
                        "COALESCE(SUM(total_points), 0) as total_points")
                .groupBy("tenant_id")
                .orderByDesc("total_points")
                .last("LIMIT 20");
        List<Map<String, Object>> tenantStats = userMapper.selectMaps(tenantRankWrapper);

        List<PlatformDashboardDTO.TenantRankDTO> ranking = new ArrayList<>();
        for (Map<String, Object> stat : tenantStats) {
            PlatformDashboardDTO.TenantRankDTO rd = new PlatformDashboardDTO.TenantRankDTO();
            Long tId = ((Number) stat.get("tenant_id")).longValue();
            rd.setTenantId(tId);
            Tenant tenant = tenantMapper.selectById(tId);
            rd.setTenantName(tenant != null ? tenant.getName() : "未知企业");
            rd.setUserCount(((Number) stat.get("user_count")).intValue());
            rd.setTotalPoints(((Number) stat.get("total_points")).longValue());
            ranking.add(rd);
        }
        dto.setTenantRanking(ranking);

        return dto;
    }

    public PointTrendDTO getPointTrend(Long tenantId, String dimension, LocalDate start, LocalDate end) {
        PointTrendDTO dto = new PointTrendDTO();
        dto.setDimension(dimension);

        LocalDateTime rangeStart = start.atStartOfDay();
        LocalDateTime rangeEnd = end.atTime(LocalTime.MAX);

        // Single aggregate query grouped by date
        QueryWrapper<PointTransactionEntity> qw = new QueryWrapper<>();
        qw.select("DATE(created_at) as period",
                        "COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as issued",
                        "COALESCE(SUM(ABS(amount)), 0) as consumed")
                .ge("created_at", rangeStart)
                .le("created_at", rangeEnd)
                .groupBy("DATE(created_at)")
                .orderBy(true, true, "DATE(created_at)");
        if (tenantId != null) {
            qw.eq("tenant_id", tenantId);
        }

        List<Map<String, Object>> rows = pointTransactionMapper.selectMaps(qw);

        // Build daily lookup map
        Map<LocalDate, long[]> dailyMap = new LinkedHashMap<>();
        for (Map<String, Object> row : rows) {
            LocalDate date = LocalDate.parse(String.valueOf(row.get("period")));
            long issued = ((Number) row.get("issued")).longValue();
            long consumed = ((Number) row.get("consumed")).longValue();
            dailyMap.put(date, new long[]{issued, consumed});
        }

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        // Generate series based on dimension, aggregating from daily data
        List<PointTrendDTO.TrendPoint> series = new ArrayList<>();
        LocalDate current = start;
        while (!current.isAfter(end)) {
            LocalDate periodStart;
            LocalDate periodEnd;
            String periodLabel;

            switch (dimension) {
                case "week":
                    periodStart = current;
                    periodEnd = current.plusDays(6);
                    periodLabel = current.format(fmt) + " ~ " + periodEnd.format(fmt);
                    break;
                case "month":
                    periodStart = current.withDayOfMonth(1);
                    periodEnd = current.with(TemporalAdjusters.lastDayOfMonth());
                    periodLabel = current.format(DateTimeFormatter.ofPattern("yyyy-MM"));
                    break;
                default:
                    periodStart = current;
                    periodEnd = current;
                    periodLabel = current.format(fmt);
            }

            long issued = 0, consumed = 0;
            for (LocalDate d = periodStart; !d.isAfter(periodEnd); d = d.plusDays(1)) {
                long[] vals = dailyMap.get(d);
                if (vals != null) {
                    issued += vals[0];
                    consumed += vals[1];
                }
            }

            PointTrendDTO.TrendPoint tp = new PointTrendDTO.TrendPoint();
            tp.setPeriod(periodLabel);
            tp.setIssued(issued);
            tp.setConsumed(consumed);
            series.add(tp);

            switch (dimension) {
                case "week" -> current = current.plusWeeks(1);
                case "month" -> current = current.plusMonths(1);
                default -> current = current.plusDays(1);
            }
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
        LocalDate startDate = today.minusDays(days - 1);

        // Single aggregate query for check-in counts
        QueryWrapper<CheckInRecordEntity> checkinWrapper = new QueryWrapper<>();
        checkinWrapper.select("checkin_date as d", "COUNT(*) as cnt")
                .eq("tenant_id", tenantId)
                .ge("checkin_date", startDate)
                .le("checkin_date", today)
                .groupBy("checkin_date");
        List<Map<String, Object>> checkinRows = checkInRecordMapper.selectMaps(checkinWrapper);
        Map<String, Integer> checkinMap = new LinkedHashMap<>();
        for (Map<String, Object> row : checkinRows) {
            String dateKey = String.valueOf(row.get("d"));
            int count = ((Number) row.get("cnt")).intValue();
            checkinMap.put(dateKey, count);
        }

        // Single aggregate query for points
        QueryWrapper<PointTransactionEntity> pointsWrapper = new QueryWrapper<>();
        pointsWrapper.select("DATE(created_at) as d",
                        "COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total")
                .eq("tenant_id", tenantId)
                .ge("created_at", startDate.atStartOfDay())
                .le("created_at", today.atTime(LocalTime.MAX))
                .in("type", Arrays.asList("check_in", "streak_bonus"))
                .groupBy("DATE(created_at)");
        List<Map<String, Object>> pointsRows = pointTransactionMapper.selectMaps(pointsWrapper);
        Map<String, Integer> pointsMap = new LinkedHashMap<>();
        for (Map<String, Object> row : pointsRows) {
            String dateKey = String.valueOf(row.get("d"));
            int total = ((Number) row.get("total")).intValue();
            pointsMap.put(dateKey, total);
        }

        // Assemble trend with zero-fill for missing days
        List<Map<String, Object>> trend = new ArrayList<>();
        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            String dateKey = date.toString();
            Map<String, Object> point = new HashMap<>();
            point.put("date", dateKey);
            point.put("count", checkinMap.getOrDefault(dateKey, 0));
            point.put("totalPoints", pointsMap.getOrDefault(dateKey, 0));
            trend.add(point);
        }
        return trend;
    }

    /**
     * Points trend (granted vs consumed) for the last N days.
     */
    public List<Map<String, Object>> getPointsTrend(Long tenantId, int days) {
        LocalDate today = LocalDate.now();
        LocalDate startDate = today.minusDays(days - 1);

        // Single aggregate query
        QueryWrapper<PointTransactionEntity> qw = new QueryWrapper<>();
        qw.select("DATE(created_at) as d",
                        "COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as granted",
                        "COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as consumed")
                .eq("tenant_id", tenantId)
                .ge("created_at", startDate.atStartOfDay())
                .le("created_at", today.atTime(LocalTime.MAX))
                .groupBy("DATE(created_at)");
        List<Map<String, Object>> rows = pointTransactionMapper.selectMaps(qw);

        Map<String, Map<String, Object>> rowMap = new LinkedHashMap<>();
        for (Map<String, Object> row : rows) {
            rowMap.put(String.valueOf(row.get("d")), row);
        }

        // Assemble trend with zero-fill for missing days
        List<Map<String, Object>> trend = new ArrayList<>();
        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            String dateKey = date.toString();
            Map<String, Object> row = rowMap.get(dateKey);
            Map<String, Object> point = new HashMap<>();
            point.put("date", dateKey);
            point.put("granted", row != null ? ((Number) row.get("granted")).longValue() : 0L);
            point.put("consumed", row != null ? ((Number) row.get("consumed")).longValue() : 0L);
            trend.add(point);
        }
        return trend;
    }

    /**
     * Per-product point statistics with daily breakdown.
     */
    public List<ProductPointStatsDTO> getProductStats(Long tenantId, LocalDate start, LocalDate end) {
        LocalDateTime startDateTime = start.atStartOfDay();
        LocalDateTime endDateTime = end.atTime(LocalTime.MAX);

        // Fetch all positive point transactions in the period for this tenant
        List<PointTransactionEntity> txs = pointTransactionMapper.selectList(
            new LambdaQueryWrapper<PointTransactionEntity>()
                .eq(PointTransactionEntity::getTenantId, tenantId)
                .ge(PointTransactionEntity::getCreatedAt, startDateTime)
                .le(PointTransactionEntity::getCreatedAt, endDateTime)
                .gt(PointTransactionEntity::getAmount, 0)
        );

        // Group by product_code (null -> "stair_climbing" for backward compat)
        Map<String, List<PointTransactionEntity>> byProduct = txs.stream()
            .collect(Collectors.groupingBy(tx ->
                tx.getProductCode() != null ? tx.getProductCode() : "stair_climbing"));

        List<ProductPointStatsDTO> result = new ArrayList<>();
        for (Map.Entry<String, List<PointTransactionEntity>> entry : byProduct.entrySet()) {
            String productCode = entry.getKey();
            List<PointTransactionEntity> productTxs = entry.getValue();

            long totalPoints = productTxs.stream().mapToLong(PointTransactionEntity::getAmount).sum();

            // Build daily stats
            Map<LocalDate, List<PointTransactionEntity>> byDate = productTxs.stream()
                .collect(Collectors.groupingBy(tx -> tx.getCreatedAt().toLocalDate()));

            List<ProductPointStatsDTO.DailyPointStat> dailyStats = new ArrayList<>();
            LocalDate current = start;
            while (!current.isAfter(end)) {
                List<PointTransactionEntity> dayTxs = byDate.getOrDefault(current, Collections.emptyList());
                if (!dayTxs.isEmpty()) {
                    dailyStats.add(ProductPointStatsDTO.DailyPointStat.builder()
                        .date(current.toString())
                        .points(dayTxs.stream().mapToInt(PointTransactionEntity::getAmount).sum())
                        .count(dayTxs.size())
                        .build());
                }
                current = current.plusDays(1);
            }

            // Derive display name from code
            String productName = deriveProductName(productCode);

            result.add(ProductPointStatsDTO.builder()
                .productCode(productCode)
                .productName(productName)
                .totalPointsIssued(totalPoints)
                .transactionCount(productTxs.size())
                .dailyStats(dailyStats)
                .build());
        }

        return result;
    }

    /**
     * Cross-product overview for pie chart visualization.
     */
    public CrossProductOverviewDTO getCrossProductOverview(Long tenantId, LocalDate start, LocalDate end) {
        LocalDateTime startDateTime = start.atStartOfDay();
        LocalDateTime endDateTime = end.atTime(LocalTime.MAX);

        List<PointTransactionEntity> txs = pointTransactionMapper.selectList(
            new LambdaQueryWrapper<PointTransactionEntity>()
                .eq(PointTransactionEntity::getTenantId, tenantId)
                .ge(PointTransactionEntity::getCreatedAt, startDateTime)
                .le(PointTransactionEntity::getCreatedAt, endDateTime)
                .gt(PointTransactionEntity::getAmount, 0)
        );

        Map<String, Long> byProduct = txs.stream()
            .collect(Collectors.groupingBy(
                tx -> tx.getProductCode() != null ? tx.getProductCode() : "stair_climbing",
                Collectors.summingLong(PointTransactionEntity::getAmount)));

        long totalPoints = byProduct.values().stream().mapToLong(Long::longValue).sum();

        List<CrossProductOverviewDTO.ProductSlice> slices = byProduct.entrySet().stream()
            .map(entry -> {
                double percentage = totalPoints > 0
                    ? Math.round(entry.getValue() * 10000.0 / totalPoints) / 100.0
                    : 0.0;
                return CrossProductOverviewDTO.ProductSlice.builder()
                    .productCode(entry.getKey())
                    .productName(deriveProductName(entry.getKey()))
                    .points(entry.getValue())
                    .percentage(percentage)
                    .build();
            })
            .sorted((a, b) -> Long.compare(b.getPoints(), a.getPoints()))
            .collect(Collectors.toList());

        return CrossProductOverviewDTO.builder()
            .slices(slices)
            .totalPoints(totalPoints)
            .build();
    }

    /**
     * Walking-specific statistics.
     */
    public WalkingStatsDTO getWalkingStats(Long tenantId, LocalDate start, LocalDate end) {
        List<StepDailyRecordEntity> records = stepDailyRecordMapper.selectList(
            new LambdaQueryWrapper<StepDailyRecordEntity>()
                .eq(StepDailyRecordEntity::getTenantId, tenantId)
                .ge(StepDailyRecordEntity::getRecordDate, start)
                .le(StepDailyRecordEntity::getRecordDate, end)
        );

        if (records.isEmpty()) {
            return WalkingStatsDTO.builder()
                .averageDailySteps(0.0)
                .totalRecords(0)
                .uniqueUsers(0)
                .stepDistribution(Map.of())
                .claimRate(0.0)
                .totalPointsAwarded(0L)
                .build();
        }

        // Average daily steps
        double avgSteps = records.stream()
            .mapToInt(StepDailyRecordEntity::getStepCount)
            .average()
            .orElse(0.0);

        // Unique users
        long uniqueUsers = records.stream()
            .map(StepDailyRecordEntity::getUserId)
            .distinct()
            .count();

        // Step distribution: 0-3k, 3k-6k, 6k-10k, 10k+
        Map<String, Integer> distribution = new LinkedHashMap<>();
        distribution.put("0-3000", 0);
        distribution.put("3000-6000", 0);
        distribution.put("6000-10000", 0);
        distribution.put("10000+", 0);
        for (StepDailyRecordEntity r : records) {
            int steps = r.getStepCount();
            if (steps < 3000) {
                distribution.merge("0-3000", 1, Integer::sum);
            } else if (steps < 6000) {
                distribution.merge("3000-6000", 1, Integer::sum);
            } else if (steps < 10000) {
                distribution.merge("6000-10000", 1, Integer::sum);
            } else {
                distribution.merge("10000+", 1, Integer::sum);
            }
        }

        // Claim rate
        long claimed = records.stream().filter(r -> Boolean.TRUE.equals(r.getClaimed())).count();
        double claimRate = Math.round(claimed * 10000.0 / records.size()) / 100.0;

        // Total points awarded from claims
        long totalPointsAwarded = records.stream()
            .filter(r -> Boolean.TRUE.equals(r.getClaimed()) && r.getPointsAwarded() != null)
            .mapToLong(StepDailyRecordEntity::getPointsAwarded)
            .sum();

        return WalkingStatsDTO.builder()
            .averageDailySteps(Math.round(avgSteps * 100.0) / 100.0)
            .totalRecords(records.size())
            .uniqueUsers((int) uniqueUsers)
            .stepDistribution(distribution)
            .claimRate(claimRate)
            .totalPointsAwarded(totalPointsAwarded)
            .build();
    }

    /**
     * Derive human-readable product name from product code.
     */
    private String deriveProductName(String productCode) {
        if (productCode == null) return "爬楼梯";
        return switch (productCode) {
            case "stair_climbing" -> "爬楼梯";
            case "walking" -> "走路";
            default -> productCode;
        };
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
