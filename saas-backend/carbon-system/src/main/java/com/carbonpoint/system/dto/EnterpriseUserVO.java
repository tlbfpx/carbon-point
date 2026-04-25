package com.carbonpoint.system.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class EnterpriseUserVO {
    private Long userId;
    private String username;
    private String phone;
    private List<String> roles;
    private List<String> roleNames;
    private String status;
    private boolean isSuperAdmin;
    private LocalDateTime createTime;
}
