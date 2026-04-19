package com.carbonpoint.system.dto.res;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDetailRes {
    private Long id;
    private Long tenantId;
    private String phone;
    private String nickname;
    private String avatar;
    private String status;
    private Integer level;
    private Integer totalPoints;
    private Integer availablePoints;
    private Integer consecutiveDays;
    private Long departmentId;
    private LocalDateTime createdAt;
}
