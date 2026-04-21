package com.carbonpoint.platform.rule;

import com.carbonpoint.platform.RuleNode;
import com.carbonpoint.platform.model.RuleContext;
import com.carbonpoint.platform.model.RuleResult;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Component;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Rule node that matches the current time against configured time slots.
 * If the check-in time is not within any slot, sets points to 0.
 */
@Component
public class TimeSlotMatchRule implements RuleNode {

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter TIME_FMT_WITH_SECONDS = DateTimeFormatter.ofPattern("HH:mm:ss");

    @Override
    public RuleResult apply(RuleContext context) {
        LocalTime checkInTime = extractCheckInTime(context);
        List<Map<String, Object>> timeSlots = extractTimeSlots(context);

        if (checkInTime == null || timeSlots == null || timeSlots.isEmpty()) {
            return RuleResult.of(0, metadata("none", false));
        }

        for (Map<String, Object> slot : timeSlots) {
            String slotRange = String.valueOf(slot.get("startTime")) + "-" + String.valueOf(slot.get("endTime"));
            LocalTime start = parseTime(String.valueOf(slot.get("startTime")));
            LocalTime end = parseTime(String.valueOf(slot.get("endTime")));

            if (start != null && end != null && isTimeInSlot(checkInTime, start, end)) {
                return RuleResult.of(context.getCurrentPoints(), metadata(slotRange, true));
            }
        }

        return RuleResult.of(0, metadata("none", false));
    }

    @Override
    public String getName() {
        return "timeSlotMatch";
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> extractTimeSlots(RuleContext context) {
        Object slots = context.getTenantConfig().get("timeSlots");
        if (slots instanceof List) {
            return (List<Map<String, Object>>) slots;
        }
        return null;
    }

    private LocalTime extractCheckInTime(RuleContext context) {
        Object timeObj = context.getTriggerData().get("checkInTime");
        if (timeObj == null) return null;
        return parseTime(String.valueOf(timeObj));
    }

    private boolean isTimeInSlot(LocalTime time, LocalTime start, LocalTime end) {
        return !time.isBefore(start) && time.isBefore(end);
    }

    private LocalTime parseTime(String timeStr) {
        try {
            if (timeStr.length() == 8) {
                return LocalTime.parse(timeStr, TIME_FMT_WITH_SECONDS);
            }
            return LocalTime.parse(timeStr, TIME_FMT);
        } catch (Exception e) {
            return null;
        }
    }

    private Map<String, Object> metadata(String matchedSlot, boolean matched) {
        Map<String, Object> meta = new HashMap<>();
        meta.put("matchedSlot", matchedSlot);
        meta.put("timeSlotMatched", matched);
        return meta;
    }
}
