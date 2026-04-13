package com.carbonpoint.points.dto;

import lombok.Data;

/**
 * 用户等级详细信息 DTO。
 */
@Data
public class UserLevelInfoDTO {
    private Long userId;
    /** 当前等级 (1-5) */
    private Integer level;
    /** 当前等级名称 */
    private String levelName;
    /** 当前等级积分系数 */
    private Double coefficient;
    /** 累计积分 */
    private Integer totalPoints;

    /** 下一等级 (1-5)，Lv.5 时等于 level */
    private Integer nextLevel;
    /** 下一等级名称 */
    private String nextLevelName;
    /** 下一等级门槛积分 */
    private Integer nextThreshold;
    /** 当前积分在当前等级区间内的进度（距当前等级门槛的增量） */
    private Integer progress;
    /** 当前等级区间跨度 */
    private Integer range;
}
