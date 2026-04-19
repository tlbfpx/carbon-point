package com.carbonpoint.system.dto.res;

import lombok.Data;

@Data
public class UserNotificationPreferenceRes {
    private Long id;
    private Long userId;
    private String type;
    private Boolean enabled;
    /** 必要通知不可关闭 */
    private Boolean required;
}
