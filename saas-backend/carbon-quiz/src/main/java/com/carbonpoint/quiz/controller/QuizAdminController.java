package com.carbonpoint.quiz.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.common.result.Result;
import com.carbonpoint.common.security.JwtUserPrincipal;
import com.carbonpoint.quiz.entity.QuizConfig;
import com.carbonpoint.quiz.entity.QuizQuestion;
import com.carbonpoint.quiz.service.QuizService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Enterprise admin endpoints for quiz management.
 */
@RestController
@RequestMapping("/api/enterprise/quiz")
@RequiredArgsConstructor
public class QuizAdminController {

    private final QuizService quizService;

    // ── Question CRUD ────────────────────────────────────────────────────────

    /**
     * List all questions for the current tenant (paginated).
     */
    @GetMapping("/questions")
    public Result<Page<QuizQuestion>> listQuestions(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return Result.success(quizService.listQuestions(principal.getTenantId(), page, size));
    }

    /**
     * Create a new question.
     */
    @PostMapping("/questions")
    public Result<QuizQuestion> createQuestion(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @RequestBody QuizQuestion question) {
        return Result.success(quizService.createQuestion(principal.getTenantId(), question));
    }

    /**
     * Update an existing question.
     */
    @PutMapping("/questions/{id}")
    public Result<QuizQuestion> updateQuestion(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @PathVariable Long id,
            @RequestBody QuizQuestion question) {
        return Result.success(quizService.updateQuestion(principal.getTenantId(), id, question));
    }

    /**
     * Delete a question.
     */
    @DeleteMapping("/questions/{id}")
    public Result<Void> deleteQuestion(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @PathVariable Long id) {
        quizService.deleteQuestion(principal.getTenantId(), id);
        return Result.success();
    }

    // ── Config ───────────────────────────────────────────────────────────────

    /**
     * Get quiz config for the current tenant.
     */
    @GetMapping("/config")
    public Result<QuizConfig> getConfig(
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return Result.success(quizService.getOrCreateConfig(principal.getTenantId()));
    }

    /**
     * Update quiz config for the current tenant.
     */
    @PutMapping("/config")
    public Result<QuizConfig> updateConfig(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @RequestBody QuizConfig config) {
        return Result.success(quizService.updateConfig(principal.getTenantId(), config));
    }
}
