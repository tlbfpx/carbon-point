package com.carbonpoint.quiz.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.points.service.PointAccountService;
import com.carbonpoint.quiz.entity.QuizConfig;
import com.carbonpoint.quiz.entity.QuizDailyRecord;
import com.carbonpoint.quiz.entity.QuizQuestion;
import com.carbonpoint.quiz.mapper.QuizConfigMapper;
import com.carbonpoint.quiz.mapper.QuizDailyRecordMapper;
import com.carbonpoint.quiz.mapper.QuizQuestionMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class QuizService {

    private final QuizQuestionMapper questionMapper;
    private final QuizDailyRecordMapper dailyRecordMapper;
    private final QuizConfigMapper configMapper;
    private final PointAccountService pointAccountService;
    private final ObjectMapper objectMapper;

    // ── H5 User APIs ─────────────────────────────────────────────────────────

    /**
     * Get daily quiz questions for the user.
     * Randomly selects up to dailyLimit unanswered questions.
     * NEVER returns the answer field.
     */
    public List<Map<String, Object>> getDailyQuiz(Long userId, Long tenantId) {
        QuizConfig config = getOrCreateConfig(tenantId);
        if (!Boolean.TRUE.equals(config.getEnabled())) {
            throw new BusinessException("QUIZ001", "答题功能未启用");
        }

        LocalDate today = LocalDate.now();
        int todayAnswered = dailyRecordMapper.countTodayAnswered(tenantId, userId, today);
        int remaining = config.getDailyLimit() - todayAnswered;

        if (remaining <= 0) {
            return List.of();
        }

        // Get question IDs already answered today
        LambdaQueryWrapper<QuizDailyRecord> recordWrapper = new LambdaQueryWrapper<>();
        recordWrapper.eq(QuizDailyRecord::getTenantId, tenantId)
                .eq(QuizDailyRecord::getUserId, userId)
                .eq(QuizDailyRecord::getAnswerDate, today)
                .select(QuizDailyRecord::getQuestionId);
        List<Long> answeredIds = dailyRecordMapper.selectList(recordWrapper)
                .stream()
                .map(QuizDailyRecord::getQuestionId)
                .collect(Collectors.toList());

        // Query enabled questions, excluding already answered ones
        LambdaQueryWrapper<QuizQuestion> questionWrapper = new LambdaQueryWrapper<>();
        questionWrapper.eq(QuizQuestion::getTenantId, tenantId)
                .eq(QuizQuestion::getEnabled, true);
        if (!answeredIds.isEmpty()) {
            questionWrapper.notIn(QuizQuestion::getId, answeredIds);
        }

        List<QuizQuestion> allAvailable = questionMapper.selectList(questionWrapper);

        // Randomly select up to `remaining` questions
        Collections.shuffle(allAvailable);
        List<QuizQuestion> selected = allAvailable.subList(0, Math.min(remaining, allAvailable.size()));

        // Build response WITHOUT the answer field
        List<Map<String, Object>> result = new ArrayList<>();
        for (QuizQuestion q : selected) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", q.getId());
            item.put("type", q.getType());
            item.put("content", q.getContent());
            item.put("options", parseJson(q.getOptions()));
            item.put("category", q.getCategory());
            item.put("difficulty", q.getDifficulty());
            result.add(item);
        }

        return result;
    }

    /**
     * Submit an answer for a quiz question.
     * Validates the answer, records the result, and awards points if correct.
     */
    @Transactional
    public Map<String, Object> submitAnswer(Long userId, Long tenantId, Long questionId, List<String> userAnswer) {
        QuizConfig config = getOrCreateConfig(tenantId);
        if (!Boolean.TRUE.equals(config.getEnabled())) {
            throw new BusinessException("QUIZ001", "答题功能未启用");
        }

        LocalDate today = LocalDate.now();

        // Check daily limit
        int todayAnswered = dailyRecordMapper.countTodayAnswered(tenantId, userId, today);
        if (todayAnswered >= config.getDailyLimit()) {
            throw new BusinessException("QUIZ002", "今日答题数量已达上限");
        }

        // Find the question
        QuizQuestion question = questionMapper.selectById(questionId);
        if (question == null || !question.getTenantId().equals(tenantId)) {
            throw new BusinessException(ErrorCode.NOT_FOUND);
        }
        if (!Boolean.TRUE.equals(question.getEnabled())) {
            throw new BusinessException("QUIZ003", "该题目已禁用");
        }

        // Check if already answered this question today
        LambdaQueryWrapper<QuizDailyRecord> dupWrapper = new LambdaQueryWrapper<>();
        dupWrapper.eq(QuizDailyRecord::getTenantId, tenantId)
                .eq(QuizDailyRecord::getUserId, userId)
                .eq(QuizDailyRecord::getQuestionId, questionId)
                .eq(QuizDailyRecord::getAnswerDate, today);
        if (dailyRecordMapper.selectCount(dupWrapper) > 0) {
            throw new BusinessException("QUIZ004", "今日已回答过该题");
        }

        // Compare answers
        List<String> correctAnswer = parseJson(question.getAnswer());
        boolean isCorrect = userAnswer != null
                && new HashSet<>(userAnswer).equals(new HashSet<>(correctAnswer));

        int pointsEarned = 0;
        if (isCorrect) {
            pointsEarned = config.getPointsPerCorrect();
        }

        // Insert daily record
        QuizDailyRecord record = new QuizDailyRecord();
        record.setTenantId(tenantId);
        record.setUserId(userId);
        record.setQuestionId(questionId);
        record.setIsCorrect(isCorrect);
        record.setUserAnswer(toJson(userAnswer));
        record.setPointsEarned(pointsEarned);
        record.setAnswerDate(today);
        record.setAnsweredAt(LocalDateTime.now());

        try {
            dailyRecordMapper.insert(record);
        } catch (DuplicateKeyException e) {
            throw new BusinessException("QUIZ004", "今日已回答过该题");
        }

        // Award points if correct
        if (pointsEarned > 0) {
            pointAccountService.awardPoints(userId, pointsEarned, "quiz",
                    String.valueOf(record.getId()),
                    String.format("答题正确获得 %d 积分", pointsEarned));
        }

        // Build response
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("isCorrect", isCorrect);
        result.put("pointsEarned", pointsEarned);

        // Show analysis only if configured
        if (Boolean.TRUE.equals(config.getShowAnalysis())) {
            result.put("analysis", question.getAnalysis());
            result.put("correctAnswer", correctAnswer);
        }

        log.info("User {} answered question {}: correct={}, points={}", userId, questionId, isCorrect, pointsEarned);

        return result;
    }

    // ── Enterprise Admin APIs ────────────────────────────────────────────────

    /**
     * List questions for the current tenant (paginated).
     */
    public Page<QuizQuestion> listQuestions(Long tenantId, int page, int size) {
        LambdaQueryWrapper<QuizQuestion> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(QuizQuestion::getTenantId, tenantId)
                .orderByDesc(QuizQuestion::getCreatedAt);
        return questionMapper.selectPage(new Page<>(page, size), wrapper);
    }

    /**
     * Create a new question.
     */
    public QuizQuestion createQuestion(Long tenantId, QuizQuestion question) {
        question.setTenantId(tenantId);
        question.setId(null);
        question.setCreatedAt(LocalDateTime.now());
        question.setUpdatedAt(LocalDateTime.now());
        if (question.getEnabled() == null) {
            question.setEnabled(true);
        }
        if (question.getDifficulty() == null) {
            question.setDifficulty(1);
        }
        questionMapper.insert(question);
        return question;
    }

    /**
     * Update an existing question.
     */
    public QuizQuestion updateQuestion(Long tenantId, Long questionId, QuizQuestion update) {
        QuizQuestion existing = questionMapper.selectById(questionId);
        if (existing == null || !existing.getTenantId().equals(tenantId)) {
            throw new BusinessException(ErrorCode.NOT_FOUND);
        }

        if (update.getType() != null) existing.setType(update.getType());
        if (update.getContent() != null) existing.setContent(update.getContent());
        if (update.getOptions() != null) existing.setOptions(update.getOptions());
        if (update.getAnswer() != null) existing.setAnswer(update.getAnswer());
        if (update.getAnalysis() != null) existing.setAnalysis(update.getAnalysis());
        if (update.getCategory() != null) existing.setCategory(update.getCategory());
        if (update.getDifficulty() != null) existing.setDifficulty(update.getDifficulty());
        if (update.getEnabled() != null) existing.setEnabled(update.getEnabled());
        existing.setUpdatedAt(LocalDateTime.now());

        questionMapper.updateById(existing);
        return existing;
    }

    /**
     * Delete a question.
     */
    public void deleteQuestion(Long tenantId, Long questionId) {
        QuizQuestion existing = questionMapper.selectById(questionId);
        if (existing == null || !existing.getTenantId().equals(tenantId)) {
            throw new BusinessException(ErrorCode.NOT_FOUND);
        }
        questionMapper.deleteById(questionId);
    }

    /**
     * Get quiz config for a tenant, creating defaults if not found.
     */
    public QuizConfig getOrCreateConfig(Long tenantId) {
        LambdaQueryWrapper<QuizConfig> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(QuizConfig::getTenantId, tenantId);
        QuizConfig config = configMapper.selectOne(wrapper);

        if (config == null) {
            config = new QuizConfig();
            config.setTenantId(tenantId);
            config.setDailyLimit(3);
            config.setPointsPerCorrect(10);
            config.setShowAnalysis(true);
            config.setEnabled(true);
            config.setCreatedAt(LocalDateTime.now());
            config.setUpdatedAt(LocalDateTime.now());
            configMapper.insert(config);
        }

        return config;
    }

    /**
     * Update quiz config for a tenant.
     */
    public QuizConfig updateConfig(Long tenantId, QuizConfig update) {
        QuizConfig config = getOrCreateConfig(tenantId);

        if (update.getDailyLimit() != null) config.setDailyLimit(update.getDailyLimit());
        if (update.getPointsPerCorrect() != null) config.setPointsPerCorrect(update.getPointsPerCorrect());
        if (update.getShowAnalysis() != null) config.setShowAnalysis(update.getShowAnalysis());
        if (update.getEnabled() != null) config.setEnabled(update.getEnabled());
        config.setUpdatedAt(LocalDateTime.now());

        configMapper.updateById(config);
        return config;
    }

    // ── Internal helpers ─────────────────────────────────────────────────────

    private List<String> parseJson(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse JSON: {}", json, e);
            return List.of();
        }
    }

    private String toJson(List<String> list) {
        if (list == null || list.isEmpty()) {
            return "[]";
        }
        try {
            return objectMapper.writeValueAsString(list);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize list to JSON", e);
            return "[]";
        }
    }
}
