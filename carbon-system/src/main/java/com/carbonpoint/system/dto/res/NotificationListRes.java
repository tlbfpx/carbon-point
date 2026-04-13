package com.carbonpoint.system.dto.res;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class NotificationListRes {
    private Long id;
    private String type;
    private String title;
    private String content;
    private String referenceType;
    private String referenceId;
    private Boolean isRead;
    private LocalDateTime createdAt;
}
