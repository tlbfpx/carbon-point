package com.carbonpoint.honor.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * 部门 DTO。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentDTO {

    private Long id;

    private Long tenantId;

    private String name;

    /** 部门负责人用户ID */
    private Long leaderId;

    /** 部门负责人姓名（冗余） */
    private String leaderName;

    /** 部门成员数量 */
    private Integer memberCount;

    private String createdAt;

    private String updatedAt;
}
