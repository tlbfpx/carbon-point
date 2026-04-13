package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("batch_imports")
public class BatchImport {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long tenantId;

    private Long operatorId;

    private Integer totalCount;

    private Integer successCount;

    private Integer failCount;

    private String failDetail;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
