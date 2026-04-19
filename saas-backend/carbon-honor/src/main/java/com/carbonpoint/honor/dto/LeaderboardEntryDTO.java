package com.carbonpoint.honor.dto;

import lombok.Data;

/**
 * 排行榜条目 DTO。
 */
@Data
public class LeaderboardEntryDTO {

    /** 当前排名 */
    private Integer rank;

    private Long userId;

    /** 昵称（4-10名显示缩写） */
    private String nickname;

    /** 头像URL */
    private String avatar;

    /** 积分 */
    private Integer points;

    /** 是否为当前登录用户 */
    private Boolean isCurrentUser;
}
