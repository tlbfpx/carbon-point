package com.carbonpoint.system.dto.req;

import lombok.Data;
import java.util.Map;

@Data
public class NotificationPreferenceReq {
    private String type;
    private Boolean enabled;
}
