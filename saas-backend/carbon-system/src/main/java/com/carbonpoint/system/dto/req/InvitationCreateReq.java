package com.carbonpoint.system.dto.req;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class InvitationCreateReq {
    private Integer maxUses;
    private LocalDateTime expiresAt;
}
