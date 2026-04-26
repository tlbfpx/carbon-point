package com.carbonpoint.honor.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 排行榜快照实体（leaderboard_snapshots 表）。
 */
@Data
@TableName("leaderboard_snapshots")
public class LeaderboardSnapshot {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long tenantId;

    /** today / week / history / department */
    private String snapshotType;

    /** 排行维度: daily / weekly / monthly / quarterly / yearly */
    private String dimension = "daily";

    private LocalDate snapshotDate;

    /** JSON 数组 [{rank, userId, nickname, points}] */
    private String rankData;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
