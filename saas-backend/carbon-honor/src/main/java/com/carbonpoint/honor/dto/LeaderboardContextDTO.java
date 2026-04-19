package com.carbonpoint.honor.dto;

import lombok.Data;

/**
 * 排行榜上下文 DTO（GET /api/v1/leaderboard/context）。
 */
@Data
public class LeaderboardContextDTO {

    /** 当前用户在今日榜中的排名，未上榜则为 null */
    private Integer currentRank;

    /** 相比上周排名的变化，正数为上升，null 为上周未上榜 */
    private Integer changeFromLastWeek;

    /** 超越的用户百分比，如 85.5 表示超越了 85.5% 的用户 */
    private Double percentile;
}
