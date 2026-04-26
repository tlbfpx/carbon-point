package com.carbonpoint.quiz.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("quiz_questions")
public class QuizQuestion {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long tenantId;

    /** Question type: true_false, single_choice, multi_choice */
    private String type;

    /** Question content */
    private String content;

    /** Options as JSON: [{"label":"A","text":"..."},...] */
    private String options;

    /** Correct answer as JSON: ["A"] or ["A","C"] */
    private String answer;

    /** Explanation/analysis of the correct answer */
    private String analysis;

    /** Category tag */
    private String category;

    /** Difficulty level 1-3 */
    private Integer difficulty;

    private Boolean enabled;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
