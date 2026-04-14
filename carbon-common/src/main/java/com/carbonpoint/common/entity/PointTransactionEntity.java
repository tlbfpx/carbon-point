package com.carbonpoint.common.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * Point transaction entity (common across modules).
 */
@Data
@TableName("point_transactions")
public class PointTransactionEntity {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    private Long tenantId;

    /** Positive = earned, Negative = spent */
    private Integer amount;

    /** Type: check_in / streak_bonus / exchange / manual_add / manual_deduct / expire / frozen / unfrozen */
    private String type;

    /** Business reference: check-in record id, order id, etc. */
    private String referenceId;

    /** Available balance after this transaction */
    private Integer balanceAfter;

    /** Frozen balance after this transaction */
    private Integer frozenAfter;

    private String remark;

    private LocalDateTime expireTime;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @Version
    private Long version;

    @TableLogic
    private Integer deleted;
}
