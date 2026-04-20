package com.carbonpoint.points.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("point_expiration_configs")
public class PointExpirationConfig {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long tenantId;

    private Boolean enabled;

    /** Expiration period in months: 6, 12, or 24 */
    private Integer expirationMonths;

    /** Days before expiration to send pre-notice */
    private Integer preNoticeDays;

    /** Whether users can manually extend once */
    private Boolean manualExtensionEnabled;

    /** Duration of manual extension in months */
    private Integer extensionMonths;

    /** How to handle expired points: forfeit or donate */
    private String handling;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
