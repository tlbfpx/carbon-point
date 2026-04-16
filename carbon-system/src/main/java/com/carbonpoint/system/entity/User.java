package com.carbonpoint.system.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("users")
public class User {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long tenantId;

    private String phone;

    private String email;

    private String passwordHash;

    private String nickname;

    private String avatar;

    private String status;

    private Integer level;

    private Integer totalPoints;

    private Integer availablePoints;

    private Integer frozenPoints;

    private Integer consecutiveDays;

    private LocalDate lastCheckinDate;

    private Long departmentId;

    @Version
    private Long version;

    @TableLogic
    private Integer deleted;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
