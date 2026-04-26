package com.carbonpoint.quiz.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("quiz_configs")
public class QuizConfig {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long tenantId;

    /** Daily limit on how many questions a user can answer */
    private Integer dailyLimit;

    /** Points awarded for each correct answer */
    private Integer pointsPerCorrect;

    /** Whether to show analysis after answering */
    private Boolean showAnalysis;

    private Boolean enabled;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
