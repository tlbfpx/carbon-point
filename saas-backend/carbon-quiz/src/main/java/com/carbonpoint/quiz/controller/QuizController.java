package com.carbonpoint.quiz.controller;

import com.carbonpoint.common.result.Result;
import com.carbonpoint.common.security.JwtUserPrincipal;
import com.carbonpoint.quiz.service.QuizService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * H5 quiz endpoints for end users.
 */
@RestController
@RequestMapping("/api/h5/quiz")
@RequiredArgsConstructor
public class QuizController {

    private final QuizService quizService;

    /**
     * Get today's quiz questions for the current user.
     * Returns questions without answer field.
     */
    @GetMapping("/daily")
    public Result<List<Map<String, Object>>> getDailyQuiz(
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        List<Map<String, Object>> questions = quizService.getDailyQuiz(
                principal.getUserId(), principal.getTenantId());
        return Result.success(questions);
    }

    /**
     * Submit an answer for a quiz question.
     */
    @PostMapping("/submit")
    public Result<Map<String, Object>> submitAnswer(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @RequestBody Map<String, Object> body) {
        Long questionId = Long.valueOf(body.get("questionId").toString());
        @SuppressWarnings("unchecked")
        List<String> answer = (List<String>) body.get("answer");

        Map<String, Object> result = quizService.submitAnswer(
                principal.getUserId(), principal.getTenantId(), questionId, answer);
        return Result.success(result);
    }
}
