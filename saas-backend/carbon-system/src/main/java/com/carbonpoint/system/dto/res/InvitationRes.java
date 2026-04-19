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
public class InvitationRes {
    private String inviteCode;
    private String inviteLink;
    private Integer maxUses;
    private Integer usedCount;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
}
