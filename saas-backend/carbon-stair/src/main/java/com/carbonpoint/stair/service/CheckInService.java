package com.carbonpoint.stair.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.stair.dto.CheckInRecordDTO;
import com.carbonpoint.stair.dto.CheckInRequestDTO;
import com.carbonpoint.stair.dto.CheckInResponseDTO;
import com.carbonpoint.stair.dto.TimeSlotDTO;
import com.carbonpoint.stair.entity.CheckInRecordEntity;
import com.carbonpoint.stair.util.DistributedLock;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.stair.mapper.CheckInRecordMapper;
import com.carbonpoint.stair.mapper.CheckinUserMapper;
import org.springframework.dao.DuplicateKeyException;
import com.carbonpoint.points.dto.PointCalcResult;
import com.carbonpoint.points.entity.PointRule;
import com.carbonpoint.points.mapper.PointRuleMapper;
import com.carbonpoint.points.service.PointAccountService;
import com.carbonpoint.points.service.PointEngineService;
import com.carbonpoint.points.service.PointRuleService;
import com.carbonpoint.points.service.PointsEventBus;
import com.carbonpoint.points.dto.PointsEvent;
import com.carbonpoint.system.entity.User;
import com.fasterxml.jackson.databind.JsonNode;
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
import java.util.Set;
import java.util.stream.Collectors;

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
    private final PointsEventBus pointsEventBus;
    private final ObjectMapper objectMapper;

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
        LocalDateTime now = LocalDateTime.now();
        LocalDate effectiveDate = getEffectiveCheckinDate(now);
        String todayStr = effectiveDate.format(DATE_FMT);
        Long ruleId = request.getRuleId();

        // 1. Try Redis distributed lock first (with graceful fallback to DB path)
        String lockKey = DistributedLock.checkInLockKey(userId, todayStr, ruleId);
        CheckInResponseDTO result = distributedLock.tryExecuteWithLock(lockKey,
                () -> doCheckIn(userId, ruleId, tenantId, effectiveDate, now));
        if (result != null) {
            return result;
        }
        // Path 2: Redis unavailable — fall back to DB-only path (DB unique index guards against duplicates)
        return doCheckIn(userId, ruleId, tenantId, effectiveDate, now);
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

         // Insert the check-in record
          try {
              checkInRecordMapper.insert(record);
          } catch (DuplicateKeyException e) {
              throw new BusinessException(ErrorCode.CHECKIN_ALREADY_DONE);
          }

          // Points awarding via async event bus
          int totalAward = calcResult.getTotalPoints();
          if (totalAward > 0) {
              pointsEventBus.publish(new PointsEvent(
                      tenantId,
                      userId,
                      "stair_climbing",
                      "check_in",
                      totalAward,
                      String.valueOf(record.getId()),
                      String.format("打卡获得 %d 积分", totalAward)
              ));
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
        LambdaQueryWrapper<CheckInRecordEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(CheckInRecordEntity::getUserId, user.getId())
               .select(CheckInRecordEntity::getCheckinDate)
               .ge(CheckInRecordEntity::getCheckinDate, today.minusDays(60))
               .orderByDesc(CheckInRecordEntity::getCheckinDate)
               .groupBy(CheckInRecordEntity::getCheckinDate);

        List<CheckInRecordEntity> records = checkInRecordMapper.selectList(wrapper);
        if (records == null || records.isEmpty()) {
            return 1;
        }

        Set<LocalDate> checkinDates = records.stream()
                .map(CheckInRecordEntity::getCheckinDate)
                .collect(Collectors.toSet());

        int consecutiveDays = 0;
        LocalDate checkDate = today;
        while (checkinDates.contains(checkDate)) {
            consecutiveDays++;
            checkDate = checkDate.minusDays(1);
        }

        return consecutiveDays > 0 ? consecutiveDays : 1;
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
      * Calculate the effective check-in date based on the cross-day timezone rule.
      * 22:00-23:59 → attributed to NEXT day
      * 00:00-21:59 → attributed to CURRENT day
      * Spec: openspec/changes/carbon-point-platform/specs/point-engine/spec.md "连续打卡天数时区边界规则"
      */
     private LocalDate getEffectiveCheckinDate(LocalDateTime checkinTime) {
         LocalTime time = checkinTime.toLocalTime();
         if (!time.isBefore(LocalTime.of(22, 0))) {
             return checkinTime.toLocalDate().plusDays(1);
         }
         return checkinTime.toLocalDate();
      }
}
