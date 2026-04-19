package com.carbonpoint.system.dto.res;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class NotificationTemplateRes {
    private Long id;
    private String type;
    private String channel;
    private String titleTemplate;
    private String contentTemplate;
    private Boolean isPreset;
    private LocalDateTime createdAt;
}
