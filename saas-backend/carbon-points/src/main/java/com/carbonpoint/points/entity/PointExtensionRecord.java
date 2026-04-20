package com.carbonpoint.points.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("point_extension_records")
public class PointExtensionRecord {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    private Long tenantId;

    private LocalDateTime extendedAt;

    private Integer monthsExtended;
}
