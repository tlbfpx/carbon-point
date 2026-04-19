package com.carbonpoint.platform.trigger;

import com.carbonpoint.platform.Trigger;
import com.carbonpoint.platform.model.TriggerContext;
import com.carbonpoint.platform.model.TriggerResult;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Trigger for check-in products.
 * Validates the user's check-in time against configured time slots
 * and produces base points range info for the rule chain.
 */
public class CheckInTrigger implements Trigger {

    private static final String PRODUCT_CODE = "checkin";
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter TIME_FMT_WITH_SECONDS = DateTimeFormatter.ofPattern("HH:mm:ss");

    @Override
    public TriggerResult execute(TriggerContext context) {
        Map<String, Object> params = context.getParams();
        if (params == null || !params.containsKey("checkInTime")) {
            return TriggerResult.fail("Missing checkInTime parameter");
        }

        String timeStr = String.valueOf(params.get("checkInTime"));
        LocalTime checkInTime = parseTime(timeStr);
        if (checkInTime == null) {
            return TriggerResult.fail("Invalid checkInTime format: " + timeStr);
        }

        Map<String, Object> data = new HashMap<>();
        data.put("checkInTime", checkInTime.toString());

        // Pass min/max points range if provided
        if (params.containsKey("minPoints")) {
            data.put("minPoints", params.get("minPoints"));
        }
        if (params.containsKey("maxPoints")) {
            data.put("maxPoints", params.get("maxPoints"));
        }

        // Pass time slots info if provided
        if (params.containsKey("timeSlots")) {
            data.put("timeSlots", params.get("timeSlots"));
        }

        data.put("source", "manual");
        data.put("triggeredAt", timeStr);

        return TriggerResult.success(data);
    }

    @Override
    public String getProductCode() {
        return PRODUCT_CODE;
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
}
