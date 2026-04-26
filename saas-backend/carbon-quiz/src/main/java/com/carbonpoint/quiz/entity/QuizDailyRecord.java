package com.carbonpoint.quiz.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("quiz_daily_records")
public class QuizDailyRecord {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long tenantId;

    private Long userId;

    private Long questionId;

    private Boolean isCorrect;

    /** User's submitted answer as JSON */
    private String userAnswer;

    private Integer pointsEarned;

    /** The date the question was answered */
    private LocalDate answerDate;

    private LocalDateTime answeredAt;
}
