package com.carbonpoint.stair.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.stair.dto.CheckInRecordDTO;
import com.carbonpoint.stair.dto.CheckInRequestDTO;
import com.carbonpoint.stair.dto.CheckInResponseDTO;
import com.carbonpoint.stair.dto.TimeSlotDTO;
import com.carbonpoint.stair.entity.CheckInRecordEntity;
import com.carbonpoint.stair.entity.OutboxEvent;
import com.carbonpoint.stair.mapper.CheckInRecordMapper;
import com.carbonpoint.stair.mapper.CheckinUserMapper;
import com.carbonpoint.stair.mapper.OutboxEventMapper;
import com.carbonpoint.stair.util.DistributedLock;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.tenant.TenantContext;
import org.springframework.dao.DuplicateKeyException;
import com.carbonpoint.points.dto.PointCalcResult;
import com.carbonpoint.points.entity.PointRule;
import com.carbonpoint.points.mapper.PointRuleMapper;
import com.carbonpoint.points.service.PointAccountService;
import com.carbonpoint.points.service.PointEngineService;
import com.carbonpoint.points.service.PointRuleService;
import com.carbonpoint.system.entity.User;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class CheckInService {

    private final CheckInRecordMapper checkInRecordMapper;
    private final CheckinUserMapper checkinUserMapper;
    private final PointRuleMapper pointRuleMapper;
    private final PointEngineService pointEngine;
    private final PointAccountService pointAccountService;
    private final PointRuleService pointRuleService;
    private final DistributedLock distributedLock;
    private final OutboxEventMapper outboxEventMapper;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    /**
     * Core check-in flow:
     * 1. Acquire Redis distributed lock (with graceful fallback to DB-only path)
     * 2. Validate time slot is active
     * 3. Check DB unique index (no duplicate)
     * 4. Calculate points via PointEngine
     * 5. Save CheckInRecord
     * 6. Award points via PointAccount
     * 7. Update consecutive check-in days
     * 8. Check and award streak rewards
     */
    @Transactional
    public CheckInResponseDTO checkIn(Long userId, CheckInRequestDTO request) {
        Long tenantId = TenantContext.getTenantId();
        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();
        String todayStr = today.format(DATE_FMT);
        Long ruleId = request.getRuleId();

        // 1. Try Redis distributed lock first (with graceful fallback to DB path)
        String lockKey = DistributedLock.checkInLockKey(userId, todayStr, ruleId);
        CheckInResponseDTO result = distributedLock.tryExecuteWithLock(lockKey,
                () -> doCheckIn(userId, ruleId, tenantId, today, now));
        if (result != null) {
            return result;
        }
        // Path 2: Redis unavailable — fall back to DB-only path (DB unique index guards against duplicates)
        return doCheckIn(userId, ruleId, tenantId, today, now);
    }

    private CheckInResponseDTO doCheckIn(Long userId, Long ruleId, Long tenantId,
                                          LocalDate today, LocalDateTime now) {
        // 2. Validate user exists
        User user = checkinUserMapper.selectById(userId);
        if (user == null) throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        if (!user.getTenantId().equals(tenantId)) {
            throw new BusinessException(ErrorCode.USER_NOT_IN_TENANT);
        }

        // 3. Validate time slot rule
        PointRule rule = pointRuleMapper.selectById(ruleId);
        log.info("doCheckIn: looking for PointRule id={}, tenantId={}, found={}, config={}",
                ruleId, tenantId, rule != null ? rule.getId() : "null", rule != null ? rule.getConfig() : "n/a");
        if (rule == null || !rule.getTenantId().equals(tenantId)) {
            throw new BusinessException(ErrorCode.POINT_RULE_NOT_FOUND);
        }
        if (!PointRuleService.TYPE_TIME_SLOT.equals(rule.getType())) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "规则ID不是时段规则");
        }
        if (!rule.getEnabled()) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "该打卡时段已禁用");
        }

        // Validate current time is within the slot
        if (!pointEngine.isTimeInSlot(LocalTime.now(), rule.getConfig())) {
            throw new BusinessException(ErrorCode.CHECKIN_NOT_IN_TIME_SLOT);
        }

        // 4. Check duplicate via DB unique index
        LambdaQueryWrapper<CheckInRecordEntity> dupWrapper = new LambdaQueryWrapper<>();
        dupWrapper.eq(CheckInRecordEntity::getUserId, userId)
                .eq(CheckInRecordEntity::getCheckinDate, today)
                .eq(CheckInRecordEntity::getTimeSlotRuleId, ruleId);
        long count = checkInRecordMapper.selectCount(dupWrapper);
        if (count > 0) {
            throw new BusinessException(ErrorCode.CHECKIN_ALREADY_DONE);
        }

        // 5. Calculate points
        PointCalcResult calcResult = pointEngine.calculate(userId, rule, user.getLevel());

        // 6. Save check-in record
        CheckInRecordEntity record = new CheckInRecordEntity();
        record.setUserId(userId);
        record.setTenantId(tenantId);
        record.setTimeSlotRuleId(ruleId);
        record.setCheckinDate(today);
        record.setCheckinTime(now);
        record.setBasePoints(calcResult.getBasePoints());
        record.setFinalPoints(calcResult.getFinalPoints());
        record.setMultiplier(BigDecimal.valueOf(calcResult.getMultiplierRate()));
        record.setLevelCoefficient(BigDecimal.valueOf(calcResult.getLevelMultiplier()));
        record.setStreakBonus(calcResult.getExtraPoints());

        // Calculate consecutive days
        int consecutiveDays = calculateConsecutiveDays(user, today);
        record.setConsecutiveDays(consecutiveDays);

         // Insert the check-in record AND save an outbox event within the same transaction
         // This guarantees atomicity: either both succeed or both fail
         try {
             checkInRecordMapper.insert(record);

             // Create outbox event for points awarding
             if (calcResult.getTotalPoints() > 0) {
                 OutboxEvent outbox = new OutboxEvent();
                 outbox.setAggregateType("check_in");
                 outbox.setAggregateId(record.getId());
                 outbox.setEventType("points_awarded");

                  // Create payload JSON
                  try {
                      PointsAwardedPayload payload = new PointsAwardedPayload(
                              userId, calcResult.getTotalPoints(), record.getId());
                      String payloadJson = objectMapper.writeValueAsString(payload);
                      outbox.setPayload(payloadJson);
                  } catch (JsonProcessingException e) {
                     log.error("Failed to serialize outbox payload", e);
                     throw new BusinessException(ErrorCode.SYSTEM_ERROR, "系统内部错误");
                 }

                 outbox.setProcessed(0);
                 outboxEventMapper.insert(outbox);
             }
         } catch (DuplicateKeyException e) {
             // Unique index conflict — concurrent duplicate attempt (idempotent, return "already checked in")
             throw new BusinessException(ErrorCode.CHECKIN_ALREADY_DONE);
         }

         // Points awarding will be processed after commit by the outbox processor
         // For now, we process it immediately after commit to keep things simple
         // (Outbox guarantees atomicity, immediate processing keeps latency low)
         int totalAward = calcResult.getTotalPoints();
         if (totalAward > 0) {
             pointAccountService.awardPoints(userId, totalAward, "check_in",
                     String.valueOf(record.getId()),
                     String.format("打卡获得 %d 积分", totalAward));
         }

         // 8. Update consecutive check-in info
         checkinUserMapper.updateConsecutiveInfo(userId, consecutiveDays, today);

        // 9. Check and award streak rewards
        if (consecutiveDays > 0) {
            pointEngine.checkAndAwardStreakReward(userId, consecutiveDays);
        }

        // Reload user for updated stats
        User updatedUser = checkinUserMapper.selectById(userId);

        log.info("User {} checked in at {}: base={}, final={}, streak={}",
                userId, now, calcResult.getBasePoints(), totalAward, consecutiveDays);

        // Build response
        CheckInResponseDTO response = new CheckInResponseDTO();
        response.setRecordId(record.getId());
        response.setSuccess(true);
        response.setMessage("打卡成功");
        response.setBasePoints(calcResult.getBasePoints());
        response.setMultiplier(BigDecimal.valueOf(calcResult.getMultiplierRate()));
        response.setLevelCoefficient(BigDecimal.valueOf(calcResult.getLevelMultiplier()));
        response.setStreakBonus(calcResult.getExtraPoints());
        response.setTotalPoints(totalAward);
        response.setConsecutiveDays(consecutiveDays);
        response.setAvailablePoints(updatedUser.getAvailablePoints());
        response.setTotalPoints_(updatedUser.getTotalPoints());
        response.setLevel(updatedUser.getLevel());
        response.setCheckinTime(now);
        return response;
    }

    private int calculateConsecutiveDays(User user, LocalDate today) {
        LocalDate lastCheckin = user.getLastCheckinDate();
        int currentStreak = user.getConsecutiveDays();

        if (lastCheckin == null) {
            return 1;
        }
        if (lastCheckin.equals(today)) {
            // Already checked in today - this shouldn't happen due to the DB check
            return currentStreak;
        }
        if (lastCheckin.equals(today.minusDays(1))) {
            // Consecutive day
            return currentStreak + 1;
        }
        // Streak broken, reset
        return 1;
    }

    /**
     * Get today's check-in status for a user.
     */
    public CheckInResponseDTO getTodayStatus(Long userId) {
        Long tenantId = TenantContext.getTenantId();
        User user = checkinUserMapper.selectById(userId);
        if (user == null) throw new BusinessException(ErrorCode.USER_NOT_FOUND);

        LocalDate today = LocalDate.now();
        LambdaQueryWrapper<CheckInRecordEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(CheckInRecordEntity::getUserId, userId)
                .eq(CheckInRecordEntity::getCheckinDate, today);
        CheckInRecordEntity record = checkInRecordMapper.selectOne(wrapper);

        CheckInResponseDTO response = new CheckInResponseDTO();
        if (record != null) {
            response.setSuccess(true);
            response.setMessage("今日已打卡");
            response.setRecordId(record.getId());
            response.setBasePoints(record.getBasePoints());
            response.setFinalPoints(record.getFinalPoints());
            response.setMultiplier(record.getMultiplier());
            response.setLevelCoefficient(record.getLevelCoefficient());
            response.setStreakBonus(record.getStreakBonus());
            response.setTotalPoints(record.getFinalPoints() + record.getStreakBonus());
            response.setConsecutiveDays(record.getConsecutiveDays());
            response.setAvailablePoints(user.getAvailablePoints());
            response.setTotalPoints_(user.getTotalPoints());
            response.setLevel(user.getLevel());
            response.setCheckinTime(record.getCheckinTime());
        } else {
            // Not checked in today - check if any slot is active
            PointRule activeSlot = pointEngine.getActiveTimeSlot(tenantId);
            response.setSuccess(false);
            if (activeSlot != null) {
                response.setMessage("今日尚未打卡，当前时段可打卡");
            } else {
                response.setMessage("今日尚未打卡，当前不在打卡时段内");
            }
            response.setConsecutiveDays(user.getConsecutiveDays());
            response.setAvailablePoints(user.getAvailablePoints());
            response.setTotalPoints_(user.getTotalPoints());
            response.setLevel(user.getLevel());
        }
        return response;
    }

    /**
     * Get check-in records for a user.
     */
    public Page<CheckInRecordDTO> getRecords(Long userId, int page, int size) {
        Long tenantId = TenantContext.getTenantId();
        LambdaQueryWrapper<CheckInRecordEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(CheckInRecordEntity::getUserId, userId)
                .eq(CheckInRecordEntity::getTenantId, tenantId)
                .orderByDesc(CheckInRecordEntity::getCheckinDate);

        Page<CheckInRecordEntity> result = checkInRecordMapper.selectPage(new Page<>(page, size), wrapper);
        Page<CheckInRecordDTO> dtoPage = new Page<>(result.getCurrent(), result.getSize(), result.getTotal());
        dtoPage.setRecords(result.getRecords().stream().map(r -> {
            CheckInRecordDTO d = new CheckInRecordDTO();
            d.setId(r.getId());
            d.setUserId(r.getUserId());
            d.setCheckinDate(r.getCheckinDate());
            d.setCheckinTime(r.getCheckinTime());
            d.setBasePoints(r.getBasePoints());
            d.setFinalPoints(r.getFinalPoints());
            d.setMultiplier(r.getMultiplier());
            d.setLevelCoefficient(r.getLevelCoefficient());
            d.setConsecutiveDays(r.getConsecutiveDays());
            d.setStreakBonus(r.getStreakBonus());
            d.setRuleId(r.getTimeSlotRuleId());
            return d;
        }).toList());
        return dtoPage;
    }

    /**
     * 获取当前租户下所有时段规则的打卡状态。
     */
    public List<TimeSlotDTO> getTimeSlots(Long userId) {
        Long tenantId = TenantContext.getTenantId();
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();

        // Load today's check-in records for this user
        LambdaQueryWrapper<CheckInRecordEntity> recordWrapper = new LambdaQueryWrapper<>();
        recordWrapper.eq(CheckInRecordEntity::getUserId, userId)
                .eq(CheckInRecordEntity::getCheckinDate, today);
        List<CheckInRecordEntity> todayRecords = checkInRecordMapper.selectList(recordWrapper);

        // Build a map from ruleId -> record for quick lookup
        Map<Long, CheckInRecordEntity> recordMap = todayRecords.stream()
                .collect(java.util.stream.Collectors.toMap(
                        CheckInRecordEntity::getTimeSlotRuleId,
                        r -> r,
                        (a, b) -> a));

        // Load all enabled time slot rules for this tenant
        List<PointRule> timeSlotRules = pointRuleService.getRulesByType(tenantId, PointRuleService.TYPE_TIME_SLOT);

        return timeSlotRules.stream().map(rule -> {
            TimeSlotDTO dto = new TimeSlotDTO();
            dto.setRuleId(rule.getId());
            dto.setName(rule.getName());

            // Parse start/end time from config JSON
            LocalTime slotStart = null;
            LocalTime slotEnd = null;
            try {
                JsonNode config = objectMapper.readTree(rule.getConfig());
                String startStr = config.get("startTime").asText();
                String endStr = config.get("endTime").asText();
                slotStart = startStr.length() == 8
                        ? LocalTime.parse(startStr, DateTimeFormatter.ofPattern("HH:mm:ss"))
                        : LocalTime.parse(startStr, DateTimeFormatter.ofPattern("HH:mm"));
                slotEnd = endStr.length() == 8
                        ? LocalTime.parse(endStr, DateTimeFormatter.ofPattern("HH:mm:ss"))
                        : LocalTime.parse(endStr, DateTimeFormatter.ofPattern("HH:mm"));
            } catch (Exception e) {
                log.warn("Failed to parse time slot config for rule {}, config: {}", rule.getId(), rule.getConfig(), e);
                dto.setStatus("config_error");
            }
            dto.setStartTime(slotStart);
            dto.setEndTime(slotEnd);

            // Determine status
            CheckInRecordEntity record = recordMap.get(rule.getId());
            if (record != null) {
                dto.setStatus("checked_in");
                dto.setRecordId(record.getId());
            } else if (slotStart != null && slotEnd != null) {
                if (now.isBefore(slotStart)) {
                    dto.setStatus("not_started");
                } else if (now.isAfter(slotEnd) || now.equals(slotEnd)) {
                    dto.setStatus("ended");
                } else {
                    dto.setStatus("available");
                }
            } else {
                dto.setStatus("not_started");
            }

            return dto;
             }).toList();
     }

     /**
      * Payload for the outbox event when points are awarded after check-in.
      */
     private record PointsAwardedPayload(
             Long userId,
             int points,
             Long checkInRecordId
     ) {}
}
