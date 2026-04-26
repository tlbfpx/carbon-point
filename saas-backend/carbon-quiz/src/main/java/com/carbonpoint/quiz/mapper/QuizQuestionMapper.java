package com.carbonpoint.quiz.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.quiz.entity.QuizQuestion;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface QuizQuestionMapper extends BaseMapper<QuizQuestion> {
}
