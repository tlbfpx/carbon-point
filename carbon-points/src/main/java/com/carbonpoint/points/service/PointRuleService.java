package com.carbonpoint.points.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.points.dto.*;
import com.carbonpoint.points.entity.PointRule;
import com.carbonpoint.points.mapper.PointRuleMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PointRuleService {

    private final PointRuleMapper pointRuleMapper;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public static final String TYPE_TIME_SLOT = "time_slot";
    public static final String TYPE_STREAK = "streak";
    public static final String TYPE_SPECIAL_DATE = "special_date";
    public static final String TYPE_LEVEL_COEFFICIENT = "level_coefficient";
    public static final String TYPE_DAILY_CAP = "daily_cap";

    /** Get a point rule by ID without tenant check (use when ID is already validated). */
    public PointRule getById(Long id) {
        return pointRuleMapper.selectById(id);
    }

    // --- CRUD ---

    @Transactional
    public PointRuleDTO createRule(PointRuleCreateDTO dto) {
        Long tenantId = TenantContext.getTenantId();
        dto.setConfig(validateAndNormalizeConfig(dto.getType(), dto.getConfig()));

        PointRule entity = new PointRule();
        entity.setTenantId(tenantId);
        entity.setType(dto.getType());
        entity.setName(dto.getName());
        entity.setConfig(dto.getConfig());
        entity.setEnabled(dto.getEnabled());
        entity.setSortOrder(dto.getSortOrder());
        pointRuleMapper.insert(entity);

        return toDTO(entity);
    }

    @Transactional
    public PointRuleDTO updateRule(PointRuleUpdateDTO dto) {
        Long tenantId = TenantContext.getTenantId();
        PointRule entity = pointRuleMapper.selectById(dto.getId());
        if (entity == null || !entity.getTenantId().equals(tenantId)) {
            throw new BusinessException(ErrorCode.POINT_RULE_NOT_FOUND);
        }

        if (dto.getName() != null) entity.setName(dto.getName());
        if (dto.getConfig() != null) {
            entity.setConfig(validateAndNormalizeConfig(entity.getType(), dto.getConfig()));
        }
        if (dto.getEnabled() != null) entity.setEnabled(dto.getEnabled());
        if (dto.getSortOrder() != null) entity.setSortOrder(dto.getSortOrder());
        pointRuleMapper.updateById(entity);
        return toDTO(entity);
    }

    @Transactional
    public void deleteRule(Long id) {
        Long tenantId = TenantContext.getTenantId();
        PointRule entity = pointRuleMapper.selectById(id);
        if (entity == null || !entity.getTenantId().equals(tenantId)) {
            throw new BusinessException(ErrorCode.POINT_RULE_NOT_FOUND);
        }
        pointRuleMapper.deleteById(id);
    }

    public PointRuleDTO getRule(Long id) {
        Long tenantId = TenantContext.getTenantId();
        PointRule entity = pointRuleMapper.selectById(id);
        if (entity == null || !entity.getTenantId().equals(tenantId)) {
            throw new BusinessException(ErrorCode.POINT_RULE_NOT_FOUND);
        }
        return toDTO(entity);
    }

    public Page<PointRuleDTO> listRules(String type, int page, int size) {
        Long tenantId = TenantContext.getTenantId();
        LambdaQueryWrapper<PointRule> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PointRule::getTenantId, tenantId);
        if (type != null && !type.isBlank()) {
            wrapper.eq(PointRule::getType, type);
        }
        wrapper.orderByAsc(PointRule::getSortOrder);
        Page<PointRule> result = pointRuleMapper.selectPage(new Page<>(page, size), wrapper);
        Page<PointRuleDTO> dtoPage = new Page<>(result.getCurrent(), result.getSize(), result.getTotal());
        dtoPage.setRecords(result.getRecords().stream().map(this::toDTO).collect(Collectors.toList()));
        return dtoPage;
    }

    public List<PointRule> getEnabledRules(Long tenantId) {
        LambdaQueryWrapper<PointRule> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PointRule::getTenantId, tenantId)
                .eq(PointRule::getEnabled, true)
                .orderByAsc(PointRule::getSortOrder);
        return pointRuleMapper.selectList(wrapper);
    }

    public List<PointRule> getRulesByType(Long tenantId, String type) {
        LambdaQueryWrapper<PointRule> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PointRule::getTenantId, tenantId)
                .eq(PointRule::getType, type)
                .eq(PointRule::getEnabled, true);
        return pointRuleMapper.selectList(wrapper);
    }

    // --- Time Slot Overlap Validation ---

    @Transactional(readOnly = true)
    public void validateNoOverlap(Long tenantId, String startTime, String endTime, Long excludeRuleId) {
        List<PointRule> timeSlotRules = getRulesByType(tenantId, TYPE_TIME_SLOT);
        LocalTime newStart = LocalTime.parse(startTime);
        LocalTime newEnd = LocalTime.parse(endTime);

        for (PointRule rule : timeSlotRules) {
            if (excludeRuleId != null && rule.getId().equals(excludeRuleId)) continue;
            try {
                JsonNode node = objectMapper.readTree(rule.getConfig());
                LocalTime existingStart = LocalTime.parse(node.get("startTime").asText());
                LocalTime existingEnd = LocalTime.parse(node.get("endTime").asText());
                // Check overlap: newStart < existingEnd AND newEnd > existingStart
                if (newStart.isBefore(existingEnd) && newEnd.isAfter(existingStart)) {
                    throw new BusinessException(ErrorCode.POINT_RULE_TIME_CONFLICT,
                            String.format("与规则「%s」(%s-%s) 时间重叠", rule.getName(), existingStart, existingEnd));
                }
            } catch (JsonProcessingException e) {
                log.warn("Failed to parse config for rule {}", rule.getId(), e);
            }
        }
    }

    // --- Config Validation ---

    private String validateAndNormalizeConfig(String type, String config) {
        try {
            JsonNode node = objectMapper.readTree(config);
            switch (type) {
                case TYPE_TIME_SLOT -> {
                    validateField(node, "startTime", true);
                    validateField(node, "endTime", true);
                    LocalTime.parse(node.get("startTime").asText());
                    LocalTime.parse(node.get("endTime").asText());
                    // Validate order
                    LocalTime start = LocalTime.parse(node.get("startTime").asText());
                    LocalTime end = LocalTime.parse(node.get("endTime").asText());
                    if (!start.isBefore(end)) {
                        throw new BusinessException(ErrorCode.PARAM_INVALID, "开始时间必须早于结束时间");
                    }
                    validateField(node, "minPoints", true);
                    validateField(node, "maxPoints", true);
                    int min = node.get("minPoints").asInt();
                    int max = node.get("maxPoints").asInt();
                    if (min < 0 || max < min) {
                        throw new BusinessException(ErrorCode.PARAM_INVALID, "积分范围不合法");
                    }
                }
                case TYPE_STREAK -> {
                    validateField(node, "days", true);
                    validateField(node, "bonusPoints", true);
                    if (node.get("days").asInt() <= 0 || node.get("bonusPoints").asInt() < 0) {
                        throw new BusinessException(ErrorCode.PARAM_INVALID, "连续天数和奖励积分必须为正数");
                    }
                }
                case TYPE_SPECIAL_DATE -> {
                    // Either "dates" array or "recurring" + "dayOfMonth"
                    if (node.has("dates")) {
                        // OK
                    } else if (node.has("recurring")) {
                        validateField(node, "recurring", true);
                        validateField(node, "dayOfMonth", true);
                    } else {
                        throw new BusinessException(ErrorCode.PARAM_INVALID,
                                "特殊日期规则必须包含 dates 数组或 recurring + dayOfMonth");
                    }
                    validateField(node, "multiplier", true);
                    if (node.get("multiplier").asDouble() <= 0) {
                        throw new BusinessException(ErrorCode.PARAM_INVALID, "倍率必须大于0");
                    }
                }
                case TYPE_LEVEL_COEFFICIENT -> {
                    validateField(node, "levels", true);
                    JsonNode levels = node.get("levels");
                    if (!levels.isObject()) {
                        throw new BusinessException(ErrorCode.PARAM_INVALID, "等级系数必须是对象");
                    }
                }
                case TYPE_DAILY_CAP -> {
                    validateField(node, "dailyLimit", true);
                    if (node.get("dailyLimit").asInt() <= 0) {
                        throw new BusinessException(ErrorCode.PARAM_INVALID, "每日上限必须为正数");
                    }
                }
                default -> throw new BusinessException(ErrorCode.PARAM_INVALID, "未知规则类型: " + type);
            }
        } catch (JsonProcessingException e) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "规则配置JSON格式错误: " + e.getMessage());
        }
        return config;
    }

    private void validateField(JsonNode node, String field, boolean requireNonNull) {
        if (requireNonNull && !node.has(field)) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "缺少必填字段: " + field);
        }
    }

    // --- DTO Mapping ---

    private PointRuleDTO toDTO(PointRule entity) {
        PointRuleDTO dto = new PointRuleDTO();
        dto.setId(entity.getId());
        dto.setTenantId(entity.getTenantId());
        dto.setType(entity.getType());
        dto.setName(entity.getName());
        dto.setConfig(entity.getConfig());
        dto.setEnabled(entity.getEnabled());
        dto.setSortOrder(entity.getSortOrder());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }
}
