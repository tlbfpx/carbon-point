package com.carbonpoint.honor.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * 用户徽章 DTO。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserBadgeDTO {

    private Long id;

    private Long userId;

    private String badgeId;

    private String badgeName;

    private String description;

    private String icon;

    private String rarity;

    private String earnedAt;
}
