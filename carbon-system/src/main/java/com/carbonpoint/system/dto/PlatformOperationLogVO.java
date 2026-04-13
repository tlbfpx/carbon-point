package com.carbonpoint.system.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Platform operation log view object.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlatformOperationLogVO {
    private Long id;
    private Long adminId;
    private String adminName;
    private String adminRole;
    private String operationType;
    private String operationObject;
    private String ipAddress;
    private LocalDateTime createdAt;
}
