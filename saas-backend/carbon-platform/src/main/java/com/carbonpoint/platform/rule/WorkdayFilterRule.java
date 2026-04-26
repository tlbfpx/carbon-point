package com.carbonpoint.platform.rule;

import com.carbonpoint.platform.RuleNode;
import com.carbonpoint.platform.model.RuleContext;
import com.carbonpoint.platform.model.RuleResult;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Rule node that filters check-ins based on valid date range configuration.
 * <p>
 * Reads config from tenantConfig.workdayConfig with three modes:
 * <ul>
 *   <li>all_days — passthrough, no filtering</li>
 *   <li>workday_only — rejects weekends and configured holidays</li>
 *   <li>custom — only allows dates listed in the validDates set</li>
 * </ul>
 * Short-circuits the chain (returns points=0 with metadata shortCircuit=true)
 * if the check-in date is invalid.
 */
@Component
public class WorkdayFilterRule implements RuleNode {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @Override
    public RuleResult apply(RuleContext context) {
        Map<String, Object> config = context.getTenantConfig();
        Object workdayConfigObj = config.get("workdayConfig");

        if (workdayConfigObj == null) {
            return RuleResult.passthrough(context.getCurrentPoints());
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> workdayConfig = (Map<String, Object>) workdayConfigObj;
        String mode = String.valueOf(workdayConfig.getOrDefault("mode", "all_days"));

        LocalDate checkInDate = extractCheckInDate(context);
        if (checkInDate == null) {
            // No date provided — passthrough
            return RuleResult.passthrough(context.getCurrentPoints());
        }

        return switch (mode) {
            case "all_days" -> RuleResult.passthrough(context.getCurrentPoints());
            case "workday_only" -> applyWorkdayOnly(context, checkInDate, config);
            case "custom" -> applyCustom(context, checkInDate, workdayConfig);
            default -> RuleResult.passthrough(context.getCurrentPoints());
        };
    }

    @Override
    public String getName() {
        return "workdayFilter";
    }

    /**
     * Workday-only mode: reject weekends and holidays.
     */
    private RuleResult applyWorkdayOnly(RuleContext context, LocalDate date, Map<String, Object> config) {
        DayOfWeek dow = date.getDayOfWeek();
        if (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) {
            return reject(date, "weekend");
        }

        Set<String> holidays = extractHolidays(config);
        if (holidays.contains(date.format(DATE_FMT))) {
            return reject(date, "holiday");
        }

        return RuleResult.passthrough(context.getCurrentPoints());
    }

    /**
     * Custom mode: only dates in the validDates list are allowed.
     */
    private RuleResult applyCustom(RuleContext context, LocalDate date, Map<String, Object> workdayConfig) {
        Object validDatesObj = workdayConfig.get("validDates");
        if (validDatesObj instanceof List<?> list) {
            String dateStr = date.format(DATE_FMT);
            for (Object item : list) {
                if (dateStr.equals(String.valueOf(item))) {
                    return RuleResult.passthrough(context.getCurrentPoints());
                }
            }
        }
        return reject(date, "not_in_valid_dates");
    }

    /**
     * Build a short-circuit rejection result (points=0).
     */
    private RuleResult reject(LocalDate date, String reason) {
        Map<String, Object> meta = new HashMap<>();
        meta.put("shortCircuit", true);
        meta.put("rejectedDate", date.format(DATE_FMT));
        meta.put("rejectionReason", reason);
        return RuleResult.of(0, meta);
    }

    /**
     * Extract check-in date from triggerData.
     */
    private LocalDate extractCheckInDate(RuleContext context) {
        Object dateObj = context.getTriggerData().get("checkInDate");
        if (dateObj == null) {
            return null;
        }
        if (dateObj instanceof LocalDate ld) {
            return ld;
        }
        try {
            return LocalDate.parse(String.valueOf(dateObj), DATE_FMT);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Extract holiday list from tenantConfig.holidays.
     */
    @SuppressWarnings("unchecked")
    private Set<String> extractHolidays(Map<String, Object> config) {
        Object holidaysObj = config.get("holidays");
        if (holidaysObj instanceof List<?> list) {
            Set<String> holidays = new HashSet<>();
            for (Object item : list) {
                holidays.add(String.valueOf(item));
            }
            return holidays;
        }
        return Collections.emptySet();
    }
}
