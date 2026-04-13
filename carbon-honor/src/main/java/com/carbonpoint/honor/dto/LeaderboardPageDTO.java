package com.carbonpoint.honor.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

/**
 * 排行榜分页响应 DTO。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LeaderboardPageDTO {

    private List<LeaderboardEntryDTO> list;

    /** 当前用户排名（不在 Top N 时也返回） */
    private Integer currentUserRank;

    private Long total;

    private Integer page;

    private Integer pageSize;

    private Boolean hasMore;
}
