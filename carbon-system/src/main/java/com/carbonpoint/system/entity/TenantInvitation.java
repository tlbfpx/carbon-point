package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("tenant_invitations")
public class TenantInvitation {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long tenantId;

    private String inviteCode;

    private Integer maxUses;

    private Integer usedCount;

    private LocalDateTime expiresAt;

    private Long createdBy;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableLogic
    private Integer deleted;
}
